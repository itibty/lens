// @ts-ignore
/* eslint-disable */
import request from "@/core/request";
import { VIS_BASE_PATH } from "@/apis/config";

/** 当前用户的看板订阅 GET /dashboards/${param0}/subscriptions */
export async function listDashboardSubscriptions(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: VIS.listDashboardSubscriptionsParams,
  options?: { [key: string]: any }
) {
  const { dashboardId: param0, ...queryParams } = params;
  return request<VIS.RListResponseDashboardSubscriptionInfo>(
    `${VIS_BASE_PATH}/dashboards/${param0}/subscriptions`,
    {
      method: "GET",
      params: { ...queryParams },
      ...(options || {}),
    }
  );
}

/** 删除看板订阅 POST /dashboards/subscriptions/${param0}/delete */
export async function deleteDashboardSubscription(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: VIS.deleteDashboardSubscriptionParams,
  options?: { [key: string]: any }
) {
  const { subscriptionId: param0, ...queryParams } = params;
  return request<VIS.RVoid>(
    `${VIS_BASE_PATH}/dashboards/subscriptions/${param0}/delete`,
    {
      method: "POST",
      params: { ...queryParams },
      ...(options || {}),
    }
  );
}

/** 看板订阅执行记录 GET /dashboards/subscriptions/${param0}/runs */
export async function listDashboardSubscriptionRuns(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: VIS.listDashboardSubscriptionRunsParams,
  options?: { [key: string]: any }
) {
  const { subscriptionId: param0, ...queryParams } = params;
  return request<VIS.RListResponseDashboardSubscriptionRunInfo>(
    `${VIS_BASE_PATH}/dashboards/subscriptions/${param0}/runs`,
    {
      method: "GET",
      params: { ...queryParams },
      ...(options || {}),
    }
  );
}

/** 立即测试看板订阅 POST /dashboards/subscriptions/${param0}/test */
export async function testDashboardSubscription(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: VIS.testDashboardSubscriptionParams,
  options?: { [key: string]: any }
) {
  const { subscriptionId: param0, ...queryParams } = params;
  return request<VIS.RLong>(
    `${VIS_BASE_PATH}/dashboards/subscriptions/${param0}/test`,
    {
      method: "POST",
      params: { ...queryParams },
      ...(options || {}),
    }
  );
}

/** 启用或停用看板订阅 POST /dashboards/subscriptions/${param0}/toggle */
export async function toggleDashboardSubscription(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: VIS.toggleDashboardSubscriptionParams,
  options?: { [key: string]: any }
) {
  const { subscriptionId: param0, ...queryParams } = params;
  return request<VIS.RVoid>(
    `${VIS_BASE_PATH}/dashboards/subscriptions/${param0}/toggle`,
    {
      method: "POST",
      params: { ...queryParams },
      ...(options || {}),
    }
  );
}

/** 新建或编辑看板订阅 POST /dashboards/subscriptions/edit */
export async function editDashboardSubscription(
  body: VIS.SaveDashboardSubscriptionRequest,
  options?: { [key: string]: any }
) {
  return request<VIS.RLong>(`${VIS_BASE_PATH}/dashboards/subscriptions/edit`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    data: body,
    ...(options || {}),
  });
}
