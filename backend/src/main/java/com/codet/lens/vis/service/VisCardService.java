package com.codet.lens.vis.service;

import cn.hutool.core.bean.BeanUtil;
import cn.hutool.core.collection.CollUtil;
import cn.hutool.core.util.StrUtil;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.codet.lens.common.ListResponse;
import com.codet.lens.common.PageResponse;
import com.codet.lens.common.FieldConst;
import com.codet.lens.common.ResultEnum;
import com.codet.lens.common.ResultException;
import com.codet.lens.common.ConvertUtil;
import com.codet.lens.vis.core.card.RichTextSanitizer;
import com.codet.lens.vis.dto.card.QueryVisCardRequest;
import com.codet.lens.vis.dto.card.VisCardInfo;
import com.codet.lens.vis.dto.card.VisCardSaveRequest;
import com.codet.lens.vis.dto.dash.VisDashboardRefInfo;
import com.codet.lens.vis.entity.VisCard;
import com.codet.lens.vis.entity.VisDashboard;
import com.codet.lens.vis.entity.VisDashboardCard;
import com.codet.lens.vis.entity.VisDataset;
import com.codet.lens.vis.enums.ChartTypeEnum;
import com.codet.lens.vis.mapper.VisCardMapper;
import com.codet.lens.vis.mapper.VisDashboardCardMapper;
import com.codet.lens.vis.mapper.VisDashboardMapper;
import com.codet.lens.vis.mapper.VisDatasetMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

/** 卡片配置。删卡片会硬删各看板占位。 */
@Service
@RequiredArgsConstructor
public class VisCardService {

    private final VisCardMapper visCardMapper;
    private final VisDashboardCardMapper visDashboardCardMapper;
    private final VisDashboardMapper visDashboardMapper;
    private final VisDashboardAccess dashboardAccess;
    private final VisDatasetMapper visDatasetMapper;

    public PageResponse<VisCardInfo> query(QueryVisCardRequest request) {
        IPage<VisCardInfo> page = visCardMapper.selectPage(request.getPage().toIPage(), Wrappers.<VisCard>lambdaQuery()
                        .ne(VisCard::getStatus, FieldConst.DEL)
                        .eq(request.getId() != null, VisCard::getId, request.getId())
                        .eq(request.getDatasetId() != null, VisCard::getDatasetId, request.getDatasetId())
                        .eq(StrUtil.isNotBlank(request.getStatus()), VisCard::getStatus, request.getStatus())
                        .eq(StrUtil.isNotBlank(request.getChartType()), VisCard::getChartType, request.getChartType())
                        .like(StrUtil.isNotBlank(request.getCardName()), VisCard::getCardName, request.getCardName())
                        .orderByDesc(VisCard::getId))
                .convert(row -> BeanUtil.copyProperties(row, VisCardInfo.class));
        return ConvertUtil.toPageResponse(page);
    }

    /** 配置只读。不拦 vis:card:conf；按看板分配（或设计权限）在 access 里判。 */
    public VisCardInfo detail(Long cardId) {
        dashboardAccess.assertCanViewCard(cardId);
        return BeanUtil.copyProperties(requireCard(cardId), VisCardInfo.class);
    }

    public ListResponse<VisDashboardRefInfo> listRefDashboards(Long cardId) {
        requireCard(cardId);
        List<Long> dashboardIds = visDashboardCardMapper.selectList(Wrappers.<VisDashboardCard>lambdaQuery()
                        .eq(VisDashboardCard::getCardId, cardId)
                        .select(VisDashboardCard::getDashboardId))
                .stream()
                .map(VisDashboardCard::getDashboardId)
                .collect(Collectors.toList());
        if (CollUtil.isEmpty(dashboardIds)) {
            return new ListResponse<>(Collections.emptyList());
        }
        List<VisDashboardRefInfo> list = visDashboardMapper.selectList(Wrappers.<VisDashboard>lambdaQuery()
                        .in(VisDashboard::getId, dashboardIds)
                        .ne(VisDashboard::getStatus, FieldConst.DEL)
                        .select(VisDashboard::getId, VisDashboard::getDashName,
                                VisDashboard::getStatus, VisDashboard::getModifyAt)
                        .orderByDesc(VisDashboard::getModifyAt)
                        .orderByDesc(VisDashboard::getId))
                .stream()
                .map(row -> BeanUtil.copyProperties(row, VisDashboardRefInfo.class))
                .collect(Collectors.toList());
        return new ListResponse<>(list);
    }

    @Transactional(rollbackFor = Exception.class)
    public Long save(VisCardSaveRequest request) {
        if (request.getId() != null) {
            requireCard(request.getId());
        }
        ChartTypeEnum type = ChartTypeEnum.of(request.getChartType());
        if (type == null) {
            throw fail("不支持的图表类型: " + request.getChartType());
        }
        if (type.needsDataset()) {
            if (request.getDatasetId() == null) {
                throw fail("数据集不能为空");
            }
            requireDatasetEnabled(request.getDatasetId());
            if (StrUtil.isBlank(request.getQueryJson())) {
                throw fail("查询配置不能为空");
            }
        }
        VisCard entity = BeanUtil.copyProperties(request, VisCard.class);
        entity.setChartType(type.getCode());
        entity.setCardName(entity.getCardName().trim());
        if (type == ChartTypeEnum.RICH_TEXT) {
            entity.setVisualJson(RichTextSanitizer.sanitizeVisualJson(entity.getVisualJson()));
        }
        if (!type.needsDataset()) {
            if (entity.getDatasetId() == null) {
                entity.setDatasetId(0L);
            }
            if (StrUtil.isBlank(entity.getQueryJson())) {
                entity.setQueryJson("{}");
            }
        }
        if (request.getId() == null) {
            entity.createCallback();
            visCardMapper.insert(entity);
        } else {
            entity.modifyCallback();
            int updated = visCardMapper.update(entity, Wrappers.<VisCard>lambdaUpdate()
                    .eq(VisCard::getId, request.getId())
                    .ne(VisCard::getStatus, FieldConst.DEL));
            if (updated != 1) {
                throw fail("卡片不存在");
            }
        }
        return entity.getId();
    }

    @Transactional(rollbackFor = Exception.class)
    public void toggleStatus(Long cardId) {
        VisCard row = requireCard(cardId);
        VisCard patch = new VisCard();
        patch.setId(cardId);
        patch.setStatus(FieldConst.EBL.equals(row.getStatus()) ? FieldConst.DBL : FieldConst.EBL);
        patch.modifyCallback();
        visCardMapper.updateById(patch);
    }

    @Transactional(rollbackFor = Exception.class)
    public void delete(List<Long> ids) {
        VisCard entity = new VisCard();
        entity.setStatus(FieldConst.DEL);
        entity.modifyCallback();
        visCardMapper.update(entity, Wrappers.<VisCard>lambdaUpdate()
                .ne(VisCard::getStatus, FieldConst.DEL)
                .in(VisCard::getId, ids));
        visDashboardCardMapper.delete(Wrappers.<VisDashboardCard>lambdaQuery()
                .in(VisDashboardCard::getCardId, ids));
    }

    private VisCard requireCard(Long cardId) {
        VisCard row = visCardMapper.selectById(cardId);
        if (row == null || FieldConst.DEL.equals(row.getStatus())) {
            throw fail("卡片不存在");
        }
        return row;
    }

    private void requireDatasetEnabled(Long datasetId) {
        VisDataset dataset = visDatasetMapper.selectById(datasetId);
        if (dataset == null || FieldConst.DEL.equals(dataset.getStatus())) {
            throw fail("数据集不存在");
        }
        if (!FieldConst.EBL.equals(dataset.getStatus())) {
            throw fail("数据集已禁用");
        }
    }

    private static ResultException fail(String msg) {
        return new ResultException(ResultEnum.FAIL.getCode(), msg);
    }
}
