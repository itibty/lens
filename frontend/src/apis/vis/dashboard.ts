// @ts-ignore
/* eslint-disable */
import request from "@/core/request";
import { VIS_BASE_PATH } from "@/apis/config";

/** 角色分配看板树 GET /dashboards/assign-tree */
export async function listDashboardAssignTree(options?: {
  [key: string]: any;
}) {
  return request<VIS.RListResponseAssignNode>(
    `${VIS_BASE_PATH}/dashboards/assign-tree`,
    {
      method: "GET",
      ...(options || {}),
    }
  );
}

/** 看板分组树 GET /dash-groups/tree */
export async function listDashGroupTree(options?: { [key: string]: any }) {
  return request<VIS.RListResponseDashGroupInfo>(
    `${VIS_BASE_PATH}/dash-groups/tree`,
    {
      method: "GET",
      ...(options || {}),
    }
  );
}

/** 新建或编辑看板分组 POST /dash-groups/edit */
export async function editDashGroup(
  body: VIS.SaveDashGroupRequest,
  options?: { [key: string]: any }
) {
  return request<VIS.RLong>(`${VIS_BASE_PATH}/dash-groups/edit`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    data: body,
    ...(options || {}),
  });
}

/** 删除看板分组 POST /dash-groups/del */
export async function delDashGroup(
  params: VIS.delDashGroupParams,
  options?: { [key: string]: any }
) {
  return request<VIS.RString>(`${VIS_BASE_PATH}/dash-groups/del`, {
    method: "POST",
    params: {
      ...params,
    },
    ...(options || {}),
  });
}

/** 看板分组启用/禁用 POST /dash-groups/toggle-status */
export async function toggleDashGroupStatus(
  params: VIS.toggleDashGroupStatusParams,
  options?: { [key: string]: any }
) {
  return request<VIS.RString>(`${VIS_BASE_PATH}/dash-groups/toggle-status`, {
    method: "POST",
    params: {
      ...params,
    },
    ...(options || {}),
  });
}

/** 删除看板 POST /dashboards/del */
export async function delDashboard(
  body: VIS.IdsRequest,
  options?: { [key: string]: any }
) {
  return request<VIS.RVoid>(`${VIS_BASE_PATH}/dashboards/del`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    data: body,
    ...(options || {}),
  });
}

/** 看板详情 GET /dashboards/detail */
export async function getDashboardDetail(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: VIS.getDashboardDetailParams,
  options?: { [key: string]: any }
) {
  return request<VIS.RVisDashboardInfo>(`${VIS_BASE_PATH}/dashboards/detail`, {
    method: "GET",
    params: {
      ...params,
    },
    ...(options || {}),
  });
}

/** 新建或编辑看板 POST /dashboards/edit */
export async function editDashboard(
  body: VIS.VisDashboardSaveRequest,
  options?: { [key: string]: any }
) {
  return request<VIS.RLong>(`${VIS_BASE_PATH}/dashboards/edit`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    data: body,
    ...(options || {}),
  });
}

/** 编辑看板元数据 POST /dashboards/edit-meta */
export async function editDashboardMeta(
  body: VIS.VisDashboardMetadataUpdateRequest,
  options?: { [key: string]: any }
) {
  return request<VIS.RVoid>(`${VIS_BASE_PATH}/dashboards/edit-meta`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    data: body,
    ...(options || {}),
  });
}

/** 看板管理混合树 GET /dashboards/manage-tree */
export async function listDashboardManageTree(options?: {
  [key: string]: any;
}) {
  return request<VIS.RListResponseManageNode>(
    `${VIS_BASE_PATH}/dashboards/manage-tree`,
    {
      method: "GET",
      ...(options || {}),
    }
  );
}

/** 看板移入分组 POST /dashboards/move-group */
export async function moveDashboardsGroup(
  body: VIS.MoveDashboardsGroupRequest,
  options?: { [key: string]: any }
) {
  return request<VIS.RVoid>(`${VIS_BASE_PATH}/dashboards/move-group`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    data: body,
    ...(options || {}),
  });
}

/** 分页查询看板 POST /dashboards/query */
export async function queryDashboards(
  body: VIS.QueryVisDashboardRequest,
  options?: { [key: string]: any }
) {
  return request<VIS.RPageResponseVisDashboardInfo>(
    `${VIS_BASE_PATH}/dashboards/query`,
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

/** 看板启用/禁用 POST /dashboards/toggle-status */
export async function toggleDashboardStatus(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: VIS.toggleDashboardStatusParams,
  options?: { [key: string]: any }
) {
  return request<VIS.RString>(`${VIS_BASE_PATH}/dashboards/toggle-status`, {
    method: "POST",
    params: {
      ...params,
    },
    ...(options || {}),
  });
}
