package com.codet.lens.vis.core.query;

import java.util.Collections;
import java.util.List;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

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
        String wrapped = "select * from (" + sql + ") __page";
        wrapped = SqlDialect.of(dbType).paginate(wrapped, offset, limit);
        return new PageSql(wrapped, Collections.emptyList());
    }
}
