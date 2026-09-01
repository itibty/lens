declare namespace ADMIN {
  type AccountInfo = {
    /** 用户 id */
    id: string;
    /** 用户名 */
    username: string;
    /** 姓名 */
    realName: string;
    /** 手机 */
    phone: string;
    /** 邮箱 */
    email: string;
    /** 状态 */
    status: "EBL" | "DBL";
    /** 角色编码 */
    roleCodes: string[];
    /** 功能权限码 */
    functionCodes: string[];
  };

  type delMenuParams = {
    menuId: string;
  };

  type getRoleDetailParams = {
    roleId: string;
  };

  type ListResponseMenuTree = {
    /** 列表 */
    list: MenuTree[];
  };

  type ListResponseUserMenu = {
    /** 列表 */
    list: UserMenu[];
  };

  type LoginRequest = {
    /** 用户名 */
    username: string;
    /** 密码 */
    password: string;
  };

  type LoginResponse = {
    /** 令牌，Bearer 前缀 */
    token: string;
    /** 令牌过期时间，毫秒时间戳 */
    tokenExpireAt: string;
    /** 当前用户 */
    userInfo: AccountInfo;
  };

  type MenuTree = {
    /** id */
    id: string;
    /** parent id */
    pid: string;
    /** 子节点 */
    children: MenuTree[];
    /** 菜单名 */
    menuName: string;
    /** 类型 */
    menuType: "MENU" | "FUNC";
    /** 路由 */
    routePath?: string;
    /** 图标 */
    icon?: string;
    /** 排序 */
    sortNum?: number;
    /** 权限码 */
    permCode?: string;
    /** 状态 */
    status: "EBL" | "DBL";
  };

  type ModifyPwdRequest = {
    /** 原密码 */
    oldPassword: string;
    /** 新密码 */
    newPassword: string;
  };

  type PageCondition = {
    /** 当前页 */
    pageNumber: number;
    /** 每页大小 */
    pageSize: number;
  };

  type PageResponseRoleInfo = {
    /** 当前页 */
    pageNumber: number;
    /** 每页大小 */
    pageSize: number;
    /** 总条数 */
    total: number;
    /** 总页数 */
    pages: number;
    /** 记录 */
    records: RoleInfo[];
  };

  type PageResponseUserInfo = {
    /** 当前页 */
    pageNumber: number;
    /** 每页大小 */
    pageSize: number;
    /** 总条数 */
    total: number;
    /** 总页数 */
    pages: number;
    /** 记录 */
    records: UserInfo[];
  };

  type QueryRoleRequest = {
    /** 分页 */
    page: PageCondition;
    /** 角色名 */
    roleName?: string;
    /** 角色编码 */
    roleCode?: string;
    /** 状态 */
    status?: "EBL" | "DBL";
  };

  type QueryUserRequest = {
    /** 分页 */
    page: PageCondition;
    /** 用户名 */
    username?: string;
    /** 姓名 */
    realName?: string;
    /** 状态 */
    status?: "EBL" | "DBL";
  };

  type ResetPwdRequest = {
    /** 用户 id */
    userId: string;
    /** 新密码 */
    password: string;
  };

  type ResetRoleDashboardsRequest = {
    /** 角色 id */
    roleId: string;
    /** 看板 id */
    dashboardIds?: string[];
  };

  type ResetRoleMenusRequest = {
    /** 角色 id */
    roleId: string;
    /** 菜单 id */
    menuIds?: string[];
  };

  type ResetRolesRequest = {
    /** 用户 id */
    userId: string;
    /** 角色及生效区间 */
    roleInfos?: UserRoleInfo[];
  };

  type RListResponseMenuTree = {
    /** 200成功 */
    code: number;
    /** 提示 */
    msg: string;
    /** 数据 */
    data?: ListResponseMenuTree;
  };

  type RListResponseUserMenu = {
    /** 200成功 */
    code: number;
    /** 提示 */
    msg: string;
    /** 数据 */
    data?: ListResponseUserMenu;
  };

  type RLoginResponse = {
    /** 200成功 */
    code: number;
    /** 提示 */
    msg: string;
    /** 数据 */
    data?: LoginResponse;
  };

  type RLong = {
    /** 200成功 */
    code: number;
    /** 提示 */
    msg: string;
    /** 数据 */
    data?: string;
  };

  type RoleInfo = {
    /** 角色 id */
    id: string;
    /** 角色名 */
    roleName: string;
    /** 角色编码 */
    roleCode: string;
    /** 备注 */
    roleNote?: string;
    /** 状态 */
    status: "EBL" | "DBL";
    /** 菜单 id */
    menuIds: string[];
    /** 看板 id */
    dashboardIds: string[];
  };

  type RPageResponseRoleInfo = {
    /** 200成功 */
    code: number;
    /** 提示 */
    msg: string;
    /** 数据 */
    data?: PageResponseRoleInfo;
  };

  type RPageResponseUserInfo = {
    /** 200成功 */
    code: number;
    /** 提示 */
    msg: string;
    /** 数据 */
    data?: PageResponseUserInfo;
  };

  type RRoleInfo = {
    /** 200成功 */
    code: number;
    /** 提示 */
    msg: string;
    /** 数据 */
    data?: RoleInfo;
  };

  type RSimpleResponseAccountInfo = {
    /** 200成功 */
    code: number;
    /** 提示 */
    msg: string;
    /** 数据 */
    data?: SimpleResponseAccountInfo;
  };

  type RString = {
    /** 200成功 */
    code: number;
    /** 提示 */
    msg: string;
    /** 数据 */
    data?: string;
  };

  type SaveMenuRequest = {
    /** 菜单 id。新增不传 */
    id?: string;
    /** 父菜单 id */
    pid?: string;
    /** 菜单名 */
    menuName: string;
    /** 类型 */
    menuType: "MENU" | "FUNC";
    /** 路由 */
    routePath?: string;
    /** 图标 */
    icon?: string;
    /** 排序 */
    sortNum?: number;
    /** 权限码。FUNC 必填 */
    permCode?: string;
    /** 状态 */
    status?: "EBL" | "DBL";
  };

  type SaveRoleRequest = {
    /** 角色 id。新增不传 */
    id?: string;
    /** 角色名 */
    roleName: string;
    /** 角色编码 */
    roleCode: string;
    /** 备注 */
    roleNote?: string;
    /** 状态 */
    status?: "EBL" | "DBL";
  };

  type SaveUserRequest = {
    /** 用户 id。新增不传 */
    id?: string;
    /** 用户名 */
    username: string;
    /** 姓名 */
    realName: string;
    /** 状态 */
    status?: "EBL" | "DBL";
    /** 密码。编辑时可空 */
    password?: string;
    /** 角色 id */
    roleIds?: string[];
  };

  type SimpleResponseAccountInfo = {
    /** 数据 */
    info: AccountInfo;
  };

  type toggleRoleStatusParams = {
    roleId: string;
  };

  type toggleUserStatusParams = {
    userId: string;
  };

  type UserInfo = {
    /** 用户 id */
    id: string;
    /** 用户名 */
    username: string;
    /** 姓名 */
    realName: string;
    /** 状态 */
    status: "EBL" | "DBL";
    /** 最近登录时间 */
    lastLoginAt?: string;
    /** 角色名，逗号拼接 */
    roleNames: string;
    /** 角色 id */
    roleIds: string[];
    /** 角色及生效区间 */
    roleInfos: UserRoleInfo[];
  };

  type UserMenu = {
    /** id */
    id: string;
    /** parent id */
    pid: string;
    /** 子节点 */
    children: UserMenu[];
    /** 菜单名 */
    name: string;
    /** 路由 */
    url?: string;
    /** 图标 */
    icon?: string;
  };

  type UserRoleInfo = {
    /** 角色 id */
    roleId: string;
    /** 角色名 */
    roleName?: string;
    /** 生效开始时间，毫秒时间戳 */
    startAt?: string;
    /** 生效结束时间，毫秒时间戳 */
    endAt?: string;
  };
}
