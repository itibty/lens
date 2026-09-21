package com.codet.lens.vis.service;

import cn.hutool.core.util.StrUtil;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.codet.lens.common.base.PageResponse;
import com.codet.lens.common.base.ResultEnum;
import com.codet.lens.common.base.ResultException;
import com.codet.lens.common.base.Status;
import com.codet.lens.common.util.ConvertUtil;
import com.codet.lens.vis.core.query.DatasourceConnectionFactory;
import com.codet.lens.vis.core.query.DatasourceRegistry;
import com.codet.lens.vis.dto.datasource.DatasourceConnectionRequest;
import com.codet.lens.vis.dto.datasource.DatasourceDatasetInfo;
import com.codet.lens.vis.dto.datasource.DatasourceImpact;
import com.codet.lens.vis.dto.datasource.DatasourceInfo;
import com.codet.lens.vis.dto.datasource.DatasourceStatusRequest;
import com.codet.lens.vis.dto.datasource.DatasourceTestResult;
import com.codet.lens.vis.dto.datasource.QueryDatasourceRequest;
import com.codet.lens.vis.dto.datasource.SaveDatasourceRequest;
import com.codet.lens.vis.entity.VisDataset;
import com.codet.lens.vis.entity.VisDatasource;
import com.codet.lens.vis.mapper.VisDatasetMapper;
import com.codet.lens.vis.mapper.VisDatasourceMapper;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

@Service
@RequiredArgsConstructor
public class DatasourceAdminService {
    private final ResourceAuditService auditService;
    private final VisDatasourceMapper sources;
    private final VisDatasetMapper datasets;
    private final DatasourceRegistry registry;
    private final DatasourceConnectionFactory connections;

    public PageResponse<DatasourceInfo> query(QueryDatasourceRequest request) {
        var page = sources.selectPage(request.getPage().toIPage(), Wrappers.<VisDatasource>lambdaQuery()
                .ne(VisDatasource::getStatus, Status.DEL)
                .like(StrUtil.isNotBlank(request.getKeyword()), VisDatasource::getSourceName, request.getKeyword())
                .eq(request.getDbType() != null, VisDatasource::getDbType, request.getDbType())
                .eq(request.getStatus() != null, VisDatasource::getStatus, request.getStatus())
                .orderByDesc(VisDatasource::getId));
        var ids = page.getRecords().stream().map(VisDatasource::getId).toList();
        var counts = referenceCounts(ids);
        var result = page.convert(row -> info(row, counts.getOrDefault(row.getId(), 0L).intValue()));
        auditService.fillNames(result.getRecords());
        return ConvertUtil.toPageResponse(result);
    }

    public DatasourceInfo detail(Long id) {
        DatasourceInfo info = info(require(sources.selectById(id)), referenceCount(id));
        auditService.fillNames(List.of(info));
        return info;
    }

    public List<DatasourceDatasetInfo> references(Long id) {
        require(sources.selectById(id));
        return datasets.selectList(Wrappers.<VisDataset>lambdaQuery()
                .select(VisDataset::getId, VisDataset::getDatasetName, VisDataset::getStatus)
                .eq(VisDataset::getSourceId, id).ne(VisDataset::getStatus, Status.DEL)
                .orderByDesc(VisDataset::getId)).stream()
                .map(row -> new DatasourceDatasetInfo(row.getId(), row.getDatasetName(), row.getStatus())).toList();
    }

    public DatasourceTestResult test(DatasourceConnectionRequest request) {
        VisDatasource old = request.getId() == null ? null : require(sources.selectById(request.getId()));
        VisDatasource candidate = candidate(request, old);
        long started = System.nanoTime();
        try {
            connections.test(candidate);
            return new DatasourceTestResult(true, "连接成功", elapsed(started));
        } catch (ResultException e) {
            return new DatasourceTestResult(false, e.getMsg(), elapsed(started));
        }
    }

    @Transactional(rollbackFor = Exception.class)
    public Long save(SaveDatasourceRequest request) {
        VisDatasource old = request.getId() == null ? null : require(sources.selectForUpdate(request.getId()));
        VisDatasource row = candidate(request, old).setSourceName(request.getSourceName().trim())
                .setStatus(old == null ? Status.EBL : old.getStatus());
        boolean changed = old == null || connectionChanged(old, row);
        if (old != null && changed)
            confirmImpact(old.getId(), request.isConfirmImpact());
        // 在写配置前用独立连接验证；任何失败都不影响正在使用的连接池。
        if (changed)
            connections.test(row);
        try {
            if (old == null) {
                row.createCallback();
                sources.insert(row);
            } else {
                row.modifyCallback();
                if (sources.updateById(row) != 1)
                    throw ResultException.fail("数据源不存在");
            }
        } catch (DuplicateKeyException e) {
            throw ResultException.fail("数据源名称已存在");
        }
        if (old != null && (changed || !Objects.equals(old.getSourceName(), row.getSourceName())))
            evictAfterCommit(old.getSourceName(), row.getSourceName());
        return row.getId();
    }

    @Transactional(rollbackFor = Exception.class)
    public void status(DatasourceStatusRequest request) {
        VisDatasource row = require(sources.selectForUpdate(request.getId()));
        if (Objects.equals(row.getStatus(), request.getStatus()))
            return;
        if (Status.DBL.equals(request.getStatus()))
            confirmImpact(row.getId(), request.isConfirmImpact());
        else
            connections.test(row);
        row.setStatus(request.getStatus());
        row.modifyCallback();
        sources.updateById(row);
        evictAfterCommit(row.getSourceName(), null);
    }

    @Transactional(rollbackFor = Exception.class)
    public void delete(Long id) {
        VisDatasource row = require(sources.selectForUpdate(id));
        int count = referenceCount(id);
        if (count > 0)
            throw ResultException.fail("仍有 " + count + " 个数据集引用，无法删除");
        row.setStatus(Status.DEL);
        row.modifyCallback();
        sources.updateById(row);
        evictAfterCommit(row.getSourceName(), null);
    }

    private void confirmImpact(Long id, boolean confirmed) {
        int count = referenceCount(id);
        if (count > 0 && !confirmed)
            throw new ResultException(ResultEnum.FAIL.getCode(), "此操作将影响 " + count + " 个数据集及关联报表",
                    new DatasourceImpact(count));
    }

    private int referenceCount(Long id) {
        return Math.toIntExact(datasets.selectCount(Wrappers.<VisDataset>lambdaQuery()
                .eq(VisDataset::getSourceId, id).ne(VisDataset::getStatus, Status.DEL)));
    }

    /** 列表批量统计，禁用但未删除的数据集也属于有效引用。 */
    private Map<Long, Long> referenceCounts(List<Long> ids) {
        if (ids.isEmpty())
            return Map.of();
        return datasets.selectList(Wrappers.<VisDataset>lambdaQuery()
                        .select(VisDataset::getSourceId)
                        .in(VisDataset::getSourceId, ids)
                        .ne(VisDataset::getStatus, Status.DEL))
                .stream().collect(Collectors.groupingBy(VisDataset::getSourceId, Collectors.counting()));
    }

    private static VisDatasource require(VisDatasource row) {
        if (row == null || Status.DEL.equals(row.getStatus()))
            throw ResultException.fail("数据源不存在");
        return row;
    }

    private static VisDatasource candidate(DatasourceConnectionRequest request, VisDatasource old) {
        DatasourceConnectionFactory.validateUrl(request.getDbType(), request.getJdbcUrl().trim());
        if (old == null && request.getPassword() == null)
            throw ResultException.fail("请填写密码，可使用空密码");
        VisDatasource row = new VisDatasource().setDbType(request.getDbType()).setJdbcUrl(request.getJdbcUrl().trim())
                .setUsername(request.getUsername().trim())
                .setPassword(request.getPassword() != null ? request.getPassword() : old.getPassword());
        row.setId(request.getId());
        return row;
    }

    private static boolean connectionChanged(VisDatasource old, VisDatasource row) {
        return !Objects.equals(old.getDbType(), row.getDbType()) || !Objects.equals(old.getJdbcUrl(), row.getJdbcUrl())
                || !Objects.equals(old.getUsername(), row.getUsername()) || !Objects.equals(old.getPassword(), row.getPassword());
    }

    private static DatasourceInfo info(VisDatasource row, int count) {
        DatasourceInfo info = new DatasourceInfo().setId(row.getId()).setSourceName(row.getSourceName()).setDbType(row.getDbType())
                .setJdbcUrl(row.getJdbcUrl()).setUsername(row.getUsername()).setStatus(row.getStatus())
                .setPasswordSet(StrUtil.isNotEmpty(row.getPassword())).setDatasetCount(count);
        info.copyAuditFrom(row);
        return info;
    }

    private void evictAfterCommit(String oldName, String newName) {
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                registry.evict(oldName);
                if (!Objects.equals(oldName, newName))
                    registry.evict(newName);
            }
        });
    }

    private static int elapsed(long start) {
        return (int) Math.min(Integer.MAX_VALUE, (System.nanoTime() - start) / 1_000_000);
    }
}
