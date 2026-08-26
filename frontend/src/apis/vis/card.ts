// @ts-ignore
/* eslint-disable */
import request from "@/core/request";
import { VIS_BASE_PATH } from "@/apis/config";

/** 卡片引用的看板 GET /cards/dashboards */
export async function listCardDashboards(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: VIS.listCardDashboardsParams,
  options?: { [key: string]: any }
) {
  return request<VIS.RListResponseVisDashboardRefInfo>(
    `${VIS_BASE_PATH}/cards/dashboards`,
    {
      method: "GET",
      params: {
        ...params,
      },
      ...(options || {}),
    }
  );
}

/** 删除卡片 POST /cards/del */
export async function delCard(
  body: VIS.IdsRequest,
  options?: { [key: string]: any }
) {
  return request<VIS.RVoid>(`${VIS_BASE_PATH}/cards/del`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    data: body,
    ...(options || {}),
  });
}

/** 卡片详情 GET /cards/detail */
export async function getCardDetail(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: VIS.getCardDetailParams,
  options?: { [key: string]: any }
) {
  return request<VIS.RVisCardInfo>(`${VIS_BASE_PATH}/cards/detail`, {
    method: "GET",
    params: {
      ...params,
    },
    ...(options || {}),
  });
}

/** 新建或编辑卡片 POST /cards/edit */
export async function editCard(
  body: VIS.VisCardSaveRequest,
  options?: { [key: string]: any }
) {
  return request<VIS.RLong>(`${VIS_BASE_PATH}/cards/edit`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    data: body,
    ...(options || {}),
  });
}

/** 分页查询卡片 POST /cards/query */
export async function queryCards(
  body: VIS.QueryVisCardRequest,
  options?: { [key: string]: any }
) {
  return request<VIS.RPageResponseVisCardInfo>(`${VIS_BASE_PATH}/cards/query`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    data: body,
    ...(options || {}),
  });
}

/** 卡片启用/禁用 POST /cards/toggle-status */
export async function toggleCardStatus(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: VIS.toggleCardStatusParams,
  options?: { [key: string]: any }
) {
  return request<VIS.RString>(`${VIS_BASE_PATH}/cards/toggle-status`, {
    method: "POST",
    params: {
      ...params,
    },
    ...(options || {}),
  });
}
