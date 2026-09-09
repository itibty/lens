// @ts-ignore
/* eslint-disable */
import request from "@/core/request";
import { ADMIN_BASE_PATH } from "@/apis/config";

/** 看板授权角色 GET /sys/dashboard-relations/roles */
export async function listDashboardRoles(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: ADMIN.listDashboardRolesParams,
  options?: { [key: string]: any }
) {
  return request<ADMIN.RListResponseDashboardRoleInfo>(
    `${ADMIN_BASE_PATH}/sys/dashboard-relations/roles`,
    {
      method: "GET",
      params: {
        ...params,
      },
      ...(options || {}),
    }
  );
}

/** 解除看板角色关联 POST /sys/dashboard-relations/unlink-role */
export async function unlinkDashboardRole(
  body: ADMIN.UnlinkDashboardRoleRequest,
  options?: { [key: string]: any }
) {
  return request<ADMIN.RVoid>(
    `${ADMIN_BASE_PATH}/sys/dashboard-relations/unlink-role`,
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

/** 看板相关用户 POST /sys/dashboard-relations/users/query */
export async function queryDashboardUsers(
  body: ADMIN.QueryDashboardUsersRequest,
  options?: { [key: string]: any }
) {
  return request<ADMIN.RPageResponseDashboardUserInfo>(
    `${ADMIN_BASE_PATH}/sys/dashboard-relations/users/query`,
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
