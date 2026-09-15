// @ts-ignore
/* eslint-disable */
import request from "@/core/request";
import { VIS_BASE_PATH } from "@/apis/config";

/** 个人报表偏好 GET /dashboards/${param0}/personal */
export async function getReportPreference(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: VIS.getReportPreferenceParams,
  options?: { [key: string]: any }
) {
  const { dashboardId: param0, ...queryParams } = params;
  return request<VIS.RPersonalReportInfo>(
    `${VIS_BASE_PATH}/dashboards/${param0}/personal`,
    {
      method: "GET",
      params: { ...queryParams },
      ...(options || {}),
    }
  );
}

/** 个人视图列表 GET /dashboards/${param0}/personal/views */
export async function listPersonalViews(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: VIS.listPersonalViewsParams,
  options?: { [key: string]: any }
) {
  const { dashboardId: param0, ...queryParams } = params;
  return request<VIS.RListResponsePersonalViewInfo>(
    `${VIS_BASE_PATH}/dashboards/${param0}/personal/views`,
    {
      method: "GET",
      params: { ...queryParams },
      ...(options || {}),
    }
  );
}

/** 记录报表访问 POST /dashboards/${param0}/personal/visit */
export async function recordReportVisit(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: VIS.recordReportVisitParams,
  options?: { [key: string]: any }
) {
  const { dashboardId: param0, ...queryParams } = params;
  return request<VIS.RVoid>(
    `${VIS_BASE_PATH}/dashboards/${param0}/personal/visit`,
    {
      method: "POST",
      params: { ...queryParams },
      ...(options || {}),
    }
  );
}

/** 收藏或取消收藏 POST /dashboards/personal/favorite */
export async function setReportFavorite(
  body: VIS.ReportPreferenceRequest,
  options?: { [key: string]: any }
) {
  return request<VIS.RVoid>(`${VIS_BASE_PATH}/dashboards/personal/favorite`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    data: body,
    ...(options || {}),
  });
}

/** 我的报表 GET /dashboards/personal/reports */
export async function listPersonalReports(options?: { [key: string]: any }) {
  return request<VIS.RListResponsePersonalReportInfo>(
    `${VIS_BASE_PATH}/dashboards/personal/reports`,
    {
      method: "GET",
      ...(options || {}),
    }
  );
}

/** 删除个人视图 POST /dashboards/personal/views/${param0}/delete */
export async function deletePersonalView(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: VIS.deletePersonalViewParams,
  options?: { [key: string]: any }
) {
  const { viewId: param0, ...queryParams } = params;
  return request<VIS.RVoid>(
    `${VIS_BASE_PATH}/dashboards/personal/views/${param0}/delete`,
    {
      method: "POST",
      params: { ...queryParams },
      ...(options || {}),
    }
  );
}

/** 设置或清除个人默认视图 POST /dashboards/personal/views/default */
export async function setDefaultPersonalView(
  body: VIS.ReportPreferenceRequest,
  options?: { [key: string]: any }
) {
  return request<VIS.RVoid>(
    `${VIS_BASE_PATH}/dashboards/personal/views/default`,
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

/** 校验并恢复个人查看状态 POST /dashboards/personal/views/resolve */
export async function resolvePersonalView(
  body: VIS.ResolveViewRequest,
  options?: { [key: string]: any }
) {
  return request<VIS.RResolvedView>(
    `${VIS_BASE_PATH}/dashboards/personal/views/resolve`,
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

/** 保存个人视图 POST /dashboards/personal/views/save */
export async function savePersonalView(
  body: VIS.SavePersonalViewRequest,
  options?: { [key: string]: any }
) {
  return request<VIS.RLong>(`${VIS_BASE_PATH}/dashboards/personal/views/save`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    data: body,
    ...(options || {}),
  });
}
