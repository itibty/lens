package com.codet.lens.sys;

/**
 * 系统功能码。query / write 相互独立，列表接口要 query，写接口要 write。
 * 页面按钮只看 write；配角色下拉走 queryRoles（要 sys:role:query）。
 * 需要能改用户并配角色时，把对应 query、write 都配上，由配置保证，后端不合并。
 */
public final class SysPerms {
    public static final String SYS_USER_QUERY = "sys:user:query";
    public static final String SYS_USER_WRITE = "sys:user:write";
    public static final String SYS_ROLE_QUERY = "sys:role:query";
    public static final String SYS_ROLE_WRITE = "sys:role:write";
    public static final String SYS_MENU_QUERY = "sys:menu:query";
    public static final String SYS_MENU_WRITE = "sys:menu:write";

    private SysPerms() {
    }
}
