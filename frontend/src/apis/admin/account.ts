// @ts-ignore
/* eslint-disable */
import request from "@/core/request";
import { ADMIN_BASE_PATH } from "@/apis/config";

/** 登录 POST /auth/login */
export async function loginAccount(
  body: ADMIN.LoginRequest,
  options?: { [key: string]: any }
) {
  return request<ADMIN.RLoginResponse>(`${ADMIN_BASE_PATH}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    data: body,
    ...(options || {}),
  });
}

/** 退出 POST /auth/logout */
export async function logoutAccount(options?: { [key: string]: any }) {
  return request<ADMIN.RString>(`${ADMIN_BASE_PATH}/auth/logout`, {
    method: "POST",
    ...(options || {}),
  });
}

/** 当前用户 GET /auth/me */
export async function getAccountInfo(options?: { [key: string]: any }) {
  return request<ADMIN.RSimpleResponseAccountInfo>(
    `${ADMIN_BASE_PATH}/auth/me`,
    {
      method: "GET",
      ...(options || {}),
    }
  );
}

/** 当前菜单 GET /auth/menus */
export async function listAccountMenus(options?: { [key: string]: any }) {
  return request<ADMIN.RListResponseUserMenu>(`${ADMIN_BASE_PATH}/auth/menus`, {
    method: "GET",
    ...(options || {}),
  });
}

/** 修改密码 POST /auth/password */
export async function modifyAccountPwd(
  body: ADMIN.ModifyPwdRequest,
  options?: { [key: string]: any }
) {
  return request<ADMIN.RString>(`${ADMIN_BASE_PATH}/auth/password`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    data: body,
    ...(options || {}),
  });
}
