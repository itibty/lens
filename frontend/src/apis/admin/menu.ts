// @ts-ignore
/* eslint-disable */
import request from "@/core/request";
import { ADMIN_BASE_PATH } from "@/apis/config";

/** 删除菜单 POST /sys/menus/del */
export async function delMenu(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: ADMIN.delMenuParams,
  options?: { [key: string]: any }
) {
  return request<ADMIN.RString>(`${ADMIN_BASE_PATH}/sys/menus/del`, {
    method: "POST",
    params: {
      ...params,
    },
    ...(options || {}),
  });
}

/** 新建或编辑菜单 POST /sys/menus/edit */
export async function editMenu(
  body: ADMIN.SaveMenuRequest,
  options?: { [key: string]: any }
) {
  return request<ADMIN.RLong>(`${ADMIN_BASE_PATH}/sys/menus/edit`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    data: body,
    ...(options || {}),
  });
}

/** 菜单树 GET /sys/menus/tree */
export async function listMenuTree(options?: { [key: string]: any }) {
  return request<ADMIN.RListResponseMenuTree>(
    `${ADMIN_BASE_PATH}/sys/menus/tree`,
    {
      method: "GET",
      ...(options || {}),
    }
  );
}
