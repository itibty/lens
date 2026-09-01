package com.codet.lens.vis.core.query;

public class QueryContextHolder {

    private static final ThreadLocal<QueryContext> HOLDER = new ThreadLocal<>();

    public static void set(QueryContext ctx) {
        HOLDER.set(ctx);
    }

    public static QueryContext get() {
        return HOLDER.get();
    }

    public static QueryContext getOrDefault() {
        QueryContext ctx = HOLDER.get();
        return ctx != null ? ctx : QueryContext.defaults();
    }

    public static void remove() {
        HOLDER.remove();
    }
}
