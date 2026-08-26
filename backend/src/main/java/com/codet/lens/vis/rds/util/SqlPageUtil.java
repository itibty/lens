package com.codet.lens.vis.rds.util;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

import java.util.Collections;
import java.util.List;

public final class SqlPageUtil {

    private SqlPageUtil() {
    }

    @Getter
    @RequiredArgsConstructor
    public static class PageSql {
        private final String sql;
        private final List<Object> page;
    }

    public static PageSql getPageSql(String dbType, String sql, long offset, long limit) {
        String wrapped = "select * from (" + sql + ") __page limit " + Math.max(limit, 0) + " offset " + Math.max(offset, 0);
        return new PageSql(wrapped, Collections.emptyList());
    }
}
