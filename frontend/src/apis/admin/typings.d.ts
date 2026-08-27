declare namespace ADMIN {
  type AccountInfo = {
    id?: string;
    username?: string;
    realName?: string;
    phone?: string;
    email?: string;
    status?: string;
    roleCodes?: string[];
    functionCodes?: string[];
  };

  type delMenuParams = {
    menuId: string;
  };

  type getRoleDetailParams = {
    roleId: string;
  };

  type ListResponseMenuTree = {
    /** 列表 */
    list?: MenuTree[];
  };

  type ListResponseUserMenu = {
    /** 列表 */
    list?: UserMenu[];
  };

  type LoginRequest = {
    username: string;
    password: string;
  };

  type LoginResponse = {
    token?: string;
    tokenExpireAt?: string;
    userInfo?: AccountInfo;
  };

  type MenuTree = {
    /** id */
    id?: string;
    /** parent id */
    pid?: string;
    /** 子节点 */
    children?: MenuTree[];
    menuName?: string;
    /** MENU | FUNC */
    menuType?: string;
    routePath?: string;
    icon?: string;
    sortNum?: number;
    permCode?: string;
    status?: string;
  };

  type ModifyPwdRequest = {
    oldPassword: string;
    newPassword: string;
  };

  type PageCondition = {
    /** 当前页 */
    pageNumber?: number;
    /** 每页大小 */
    pageSize?: number;
  };

  type PageResponseRoleInfo = {
    /** 当前页 */
    pageNumber?: number;
    /** 每页大小 */
    pageSize?: number;
    /** 总条数 */
    total?: number;
    /** 总页数 */
    pages?: number;
    /** 记录 */
    records?: RoleInfo[];
  };

  type PageResponseUserInfo = {
    /** 当前页 */
    pageNumber?: number;
    /** 每页大小 */
    pageSize?: number;
    /** 总条数 */
    total?: number;
    /** 总页数 */
    pages?: number;
    /** 记录 */
    records?: UserInfo[];
  };

  type QueryRoleRequest = {
    /** 分页 */
    page: PageCondition;
    roleName?: string;
    roleCode?: string;
    status?: string;
  };

  type QueryUserRequest = {
    /** 分页 */
    page: PageCondition;
    username?: string;
    realName?: string;
    status?: string;
  };

  type ResetPwdRequest = {
    userId: string;
    password: string;
  };

  type ResetRoleMenusRequest = {
    roleId: string;
    menuIds?: string[];
  };

  type ResetRoleDashboardsRequest = {
    roleId: string;
    dashboardIds?: string[];
  };

  type ResetRolesRequest = {
    userId: string;
    roleInfos?: UserRoleInfo[];
  };

  type RListResponseMenuTree = {
    /** 200成功 */
    code?: number;
    msg?: string;
    data?: ListResponseMenuTree;
  };

  type RListResponseUserMenu = {
    /** 200成功 */
    code?: number;
    msg?: string;
    data?: ListResponseUserMenu;
  };

  type RLoginResponse = {
    /** 200成功 */
    code?: number;
    msg?: string;
    data?: LoginResponse;
  };

  type RLong = {
    /** 200成功 */
    code?: number;
    msg?: string;
    data?: string;
  };

  type RoleInfo = {
    id?: string;
    roleName?: string;
    roleCode?: string;
    roleNote?: string;
    status?: string;
    menuIds?: string[];
    dashboardIds?: string[];
  };

  type RPageResponseRoleInfo = {
    /** 200成功 */
    code?: number;
    msg?: string;
    data?: PageResponseRoleInfo;
  };

  type RPageResponseUserInfo = {
    /** 200成功 */
    code?: number;
    msg?: string;
    data?: PageResponseUserInfo;
  };

  type RRoleInfo = {
    /** 200成功 */
    code?: number;
    msg?: string;
    data?: RoleInfo;
  };

  type RSimpleResponseAccountInfo = {
    /** 200成功 */
    code?: number;
    msg?: string;
    data?: SimpleResponseAccountInfo;
  };

  type RString = {
    /** 200成功 */
    code?: number;
    msg?: string;
    data?: string;
  };

  type SaveMenuRequest = {
    id?: string;
    pid?: string;
    menuName: string;
    /** MENU | FUNC */
    menuType: string;
    routePath?: string;
    icon?: string;
    sortNum?: number;
    permCode?: string;
    status?: string;
  };

  type SaveRoleRequest = {
    id?: string;
    roleName: string;
    roleCode: string;
    roleNote?: string;
    status?: string;
  };

  type SaveUserRequest = {
    id?: string;
    username: string;
    realName: string;
    status?: string;
    password?: string;
    roleIds?: string[];
  };

  type SimpleResponseAccountInfo = {
    /** 数据 */
    info?: AccountInfo;
  };

  type toggleRoleStatusParams = {
    roleId: string;
  };

  type toggleUserStatusParams = {
    userId: string;
  };

  type UserInfo = {
    id?: string;
    username?: string;
    realName?: string;
    status?: string;
    lastLoginAt?: string;
    roleNames?: string;
    roleIds?: string[];
    roleInfos?: UserRoleInfo[];
  };

  type UserRoleInfo = {
    roleId?: string;
    roleName?: string;
    startAt?: string | number;
    endAt?: string | number;
  };

  type UserMenu = {
    /** id */
    id?: string;
    /** parent id */
    pid?: string;
    /** 子节点 */
    children?: UserMenu[];
    /** 菜单名 */
    name?: string;
    url?: string;
    icon?: string;
  };
}
