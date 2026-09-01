// @ts-ignore
/* eslint-disable */
import request from "@/core/request";
import { ADMIN_BASE_PATH } from "@/apis/config";

/** 新增角色 POST /sys/roles/add */
export async function addRole(
  body: ADMIN.SaveRoleRequest,
  options?: { [key: string]: any }
) {
  return request<ADMIN.RLong>(`${ADMIN_BASE_PATH}/sys/roles/add`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    data: body,
    ...(options || {}),
  });
}

/** 角色详情 GET /sys/roles/detail */
export async function getRoleDetail(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: ADMIN.getRoleDetailParams,
  options?: { [key: string]: any }
) {
  return request<ADMIN.RRoleInfo>(`${ADMIN_BASE_PATH}/sys/roles/detail`, {
    method: "GET",
    params: {
      ...params,
    },
    ...(options || {}),
  });
}

/** 新建或编辑角色 POST /sys/roles/edit */
export async function editRole(
  body: ADMIN.SaveRoleRequest,
  options?: { [key: string]: any }
) {
  return request<ADMIN.RLong>(`${ADMIN_BASE_PATH}/sys/roles/edit`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    data: body,
    ...(options || {}),
  });
}

/** 分页查询角色 POST /sys/roles/query */
export async function queryRoles(
  body: ADMIN.QueryRoleRequest,
  options?: { [key: string]: any }
) {
  return request<ADMIN.RPageResponseRoleInfo>(
    `${ADMIN_BASE_PATH}/sys/roles/query`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      data: body,
      ...(options || {}),
    }
  );
}

/** 配置看板 POST /sys/roles/reset-dashboards */
export async function resetRoleDashboards(
  body: ADMIN.ResetRoleDashboardsRequest,
  options?: { [key: string]: any }
) {
  return request<ADMIN.RString>(
    `${ADMIN_BASE_PATH}/sys/roles/reset-dashboards`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      data: body,
      ...(options || {}),
    }
  );
}

/** 配置功能 POST /sys/roles/reset-functions */
export async function resetRoleFunctions(
  body: ADMIN.ResetRoleMenusRequest,
  options?: { [key: string]: any }
) {
  return request<ADMIN.RString>(
    `${ADMIN_BASE_PATH}/sys/roles/reset-functions`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      data: body,
      ...(options || {}),
    }
  );
}

/** 配置菜单 POST /sys/roles/reset-menus */
export async function resetRoleMenus(
  body: ADMIN.ResetRoleMenusRequest,
  options?: { [key: string]: any }
) {
  return request<ADMIN.RString>(`${ADMIN_BASE_PATH}/sys/roles/reset-menus`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    data: body,
    ...(options || {}),
  });
}

/** 启用或禁用角色 POST /sys/roles/toggle-status */
export async function toggleRoleStatus(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: ADMIN.toggleRoleStatusParams,
  options?: { [key: string]: any }
) {
  return request<ADMIN.RString>(`${ADMIN_BASE_PATH}/sys/roles/toggle-status`, {
    method: "POST",
    params: {
      ...params,
    },
    ...(options || {}),
  });
}
