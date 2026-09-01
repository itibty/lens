package com.codet.lens.vis.service;

import com.codet.lens.common.base.ResultException;
import com.codet.lens.common.base.Status;
import com.codet.lens.vis.core.query.DatasourceRegistry;
import com.codet.lens.vis.core.query.SqlDialect;
import com.codet.lens.vis.entity.VisDatasource;
import com.codet.lens.vis.mapper.VisDatasourceMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class DatasourceAdminService {

    private final VisDatasourceMapper datasourceMapper;
    private final DatasourceRegistry datasourceRegistry;

    @Transactional(rollbackFor = Exception.class)
    public Long save(VisDatasource request) {
        String oldSourceName = null;
        if (request.getId() == null) {
            request.setDbType(SqlDialect.of(request.getDbType()).getTypeCode());
            request.setStatus(Status.EBL);
            request.createCallback();
            int inserted = datasourceMapper.insert(request);
            if (inserted != 1)
                throw ResultException.fail("新增数据源失败");
        } else {
            VisDatasource old = require(request.getId());
            oldSourceName = old.getSourceName();
            String dbType = request.getDbType() == null ? old.getDbType() : request.getDbType();
            request.setDbType(SqlDialect.of(dbType).getTypeCode());
            request.modifyCallback();
            int updated = datasourceMapper.updateById(request);
            if (updated != 1)
                throw ResultException.fail("数据源不存在");
        }
        VisDatasource saved = datasourceMapper.selectById(request.getId());
        if (saved == null || Status.DEL.equals(saved.getStatus()))
            throw ResultException.fail("数据源不存在");
        datasourceRegistry.refresh(oldSourceName, saved);
        return saved.getId();
    }

    private VisDatasource require(Long id) {
        VisDatasource row = datasourceMapper.selectById(id);
        if (row == null || Status.DEL.equals(row.getStatus()))
            throw ResultException.fail("数据源不存在");
        return row;
    }
}
