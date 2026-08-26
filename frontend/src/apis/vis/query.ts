// @ts-ignore
/* eslint-disable */
import request from "@/core/request";
import { VIS_BASE_PATH } from "@/apis/config";

/** 普通数据查询 POST /dashboards/${param0}/cards/${param1}/data */
export async function queryCardData(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: VIS.queryCardDataParams,
  body: VIS.QueryRequest,
  options?: { [key: string]: any }
) {
  const { dashboardId: param0, cardId: param1, ...queryParams } = params;
  return request<VIS.RQueryDataResponse>(
    `${VIS_BASE_PATH}/dashboards/${param0}/cards/${param1}/data`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      params: { ...queryParams },
      data: body,
      ...(options || {}),
    }
  );
}

/** 卡片明细查询 POST /dashboards/${param0}/cards/${param1}/detail */
export async function queryCardDetail(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: VIS.queryCardDetailParams,
  body: VIS.DetailQueryRequest,
  options?: { [key: string]: any }
) {
  const { dashboardId: param0, cardId: param1, ...queryParams } = params;
  return request<VIS.RQueryDataResponse>(
    `${VIS_BASE_PATH}/dashboards/${param0}/cards/${param1}/detail`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      params: { ...queryParams },
      data: body,
      ...(options || {}),
    }
  );
}

/** 卡片数据导出 Excel POST /dashboards/${param0}/cards/${param1}/export */
export async function exportCardData(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: VIS.exportCardDataParams,
  body: VIS.QueryRequest,
  options?: { [key: string]: any }
) {
  const { dashboardId: param0, cardId: param1, ...queryParams } = params;
  return request<any>(
    `${VIS_BASE_PATH}/dashboards/${param0}/cards/${param1}/export`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      params: { ...queryParams },
      data: body,
      ...(options || {}),
    }
  );
}

/** 透视表数据查询 POST /dashboards/${param0}/cards/${param1}/pivot */
export async function queryCardPivot(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: VIS.queryCardPivotParams,
  body: VIS.PivotQueryRequest,
  options?: { [key: string]: any }
) {
  const { dashboardId: param0, cardId: param1, ...queryParams } = params;
  return request<VIS.RPivotQueryResponse>(
    `${VIS_BASE_PATH}/dashboards/${param0}/cards/${param1}/pivot`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      params: { ...queryParams },
      data: body,
      ...(options || {}),
    }
  );
}

/** 卡片查询结构 GET /vis/cards/${param0} */
export async function getCardDetail(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: VIS.getCardDetailParams,
  options?: { [key: string]: any }
) {
  const { cardId: param0, ...queryParams } = params;
  return request<VIS.RVisCardInfo>(`${VIS_BASE_PATH}/vis/cards/${param0}`, {
    method: "GET",
    params: { ...queryParams },
    ...(options || {}),
  });
}

/** 看板查询结构 GET /vis/dashboards/${param0} */
export async function getDashboardDetail(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: VIS.getDashboardDetailParams,
  options?: { [key: string]: any }
) {
  const { dashboardId: param0, ...queryParams } = params;
  return request<VIS.RVisDashboardInfo>(
    `${VIS_BASE_PATH}/vis/dashboards/${param0}`,
    {
      method: "GET",
      params: { ...queryParams },
      ...(options || {}),
    }
  );
}

/** 日期快捷预览 POST /vis/date-window */
export async function previewDateWindow(
  body: VIS.DateWindowRequest,
  options?: { [key: string]: any }
) {
  return request<VIS.RDateWindowResponse>(`${VIS_BASE_PATH}/vis/date-window`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    data: body,
    ...(options || {}),
  });
}

/** 筛选枚举 POST /vis/filter-options */
export async function listFilterOptions(
  body: VIS.VisFilterOptionsRequest,
  options?: { [key: string]: any }
) {
  return request<VIS.RVisFilterOptionsResponse>(
    `${VIS_BASE_PATH}/vis/filter-options`,
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
