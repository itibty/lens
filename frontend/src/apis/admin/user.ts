// @ts-ignore
/* eslint-disable */
import request from "@/core/request";
import { ADMIN_BASE_PATH } from "@/apis/config";

/** 新增用户 POST /sys/users/add */
export async function addUser(
  body: ADMIN.SaveUserRequest,
  options?: { [key: string]: any }
) {
  return request<ADMIN.RLong>(`${ADMIN_BASE_PATH}/sys/users/add`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    data: body,
    ...(options || {}),
  });
}

/** 新建或编辑用户 POST /sys/users/edit */
export async function editUser(
  body: ADMIN.SaveUserRequest,
  options?: { [key: string]: any }
) {
  return request<ADMIN.RLong>(`${ADMIN_BASE_PATH}/sys/users/edit`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    data: body,
    ...(options || {}),
  });
}

/** 分页查询用户 POST /sys/users/query */
export async function queryUsers(
  body: ADMIN.QueryUserRequest,
  options?: { [key: string]: any }
) {
  return request<ADMIN.RPageResponseUserInfo>(
    `${ADMIN_BASE_PATH}/sys/users/query`,
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

/** 重置密码 POST /sys/users/reset-pwd */
export async function resetUserPwd(
  body: ADMIN.ResetPwdRequest,
  options?: { [key: string]: any }
) {
  return request<ADMIN.RString>(`${ADMIN_BASE_PATH}/sys/users/reset-pwd`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    data: body,
    ...(options || {}),
  });
}

/** 配置角色 POST /sys/users/reset-roles */
export async function resetUserRoles(
  body: ADMIN.ResetRolesRequest,
  options?: { [key: string]: any }
) {
  return request<ADMIN.RString>(`${ADMIN_BASE_PATH}/sys/users/reset-roles`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    data: body,
    ...(options || {}),
  });
}

/** 启用或禁用用户 POST /sys/users/toggle-status */
export async function toggleUserStatus(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: ADMIN.toggleUserStatusParams,
  options?: { [key: string]: any }
) {
  return request<ADMIN.RString>(`${ADMIN_BASE_PATH}/sys/users/toggle-status`, {
    method: "POST",
    params: {
      ...params,
    },
    ...(options || {}),
  });
}
