package com.codet.lens.vis.rds.core;

import cn.hutool.core.collection.CollUtil;
import com.codet.lens.vis.rds.dto.conf.ConfSqlFieldInfo;
import com.codet.lens.vis.rds.dto.conf.DebugSqlColumn;
import lombok.AccessLevel;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * 本次结果列覆盖已保存配置：有配置用人标的，没有用 JDBC 预填。
 */
@NoArgsConstructor(access = AccessLevel.PRIVATE)
public final class SqlFieldCatalog {

    public static List<DebugSqlColumn> applySaved(List<ConfSqlFieldInfo> saved, List<DebugSqlColumn> discovered) {
        Map<String, ConfSqlFieldInfo> bySaved = new LinkedHashMap<>();
        for (ConfSqlFieldInfo item : CollUtil.emptyIfNull(saved)) {
            if (item != null && item.getField() != null) {
                bySaved.put(item.getField(), item);
            }
        }
        List<DebugSqlColumn> result = new ArrayList<>();
        for (DebugSqlColumn column : CollUtil.emptyIfNull(discovered)) {
            if (column == null || column.getField() == null) {
                continue;
            }
            ConfSqlFieldInfo exist = bySaved.get(column.getField());
            if (exist != null) {
                result.add(new DebugSqlColumn()
                        .setField(column.getField())
                        .setJdbcType(column.getJdbcType())
                        .setDataType(exist.getDataType())
                        .setSuggestRole(exist.getSuggestRole()));
            } else {
                result.add(column);
            }
        }
        return result;
    }
}
