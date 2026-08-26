package com.codet.lens.common;

/** 系统菜单 query+write；可视化菜单一个 conf。 */
public final class PermCodes {
    public static final String SYS_USER_QUERY = "sys:user:query";
    public static final String SYS_USER_WRITE = "sys:user:write";
    public static final String SYS_ROLE_QUERY = "sys:role:query";
    public static final String SYS_ROLE_WRITE = "sys:role:write";
    public static final String SYS_MENU_QUERY = "sys:menu:query";
    public static final String SYS_MENU_WRITE = "sys:menu:write";
    public static final String VIS_DATASET_CONF = "vis:dataset:conf";
    public static final String VIS_CARD_CONF = "vis:card:conf";
    public static final String VIS_DASHBOARD_CONF = "vis:dashboard:conf";

    private PermCodes() {
    }
}
