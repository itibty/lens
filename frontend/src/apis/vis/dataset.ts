// @ts-ignore
/* eslint-disable */
import request from "@/core/request";
import { VIS_BASE_PATH } from "@/apis/config";

/** 数据集字段 GET /datasets/${param0}/fields */
export async function listDatasetFieldsById(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: VIS.listDatasetFieldsByIdParams,
  options?: { [key: string]: any }
) {
  const { datasetId: param0, ...queryParams } = params;
  return request<VIS.RListConfSqlFieldInfo>(
    `${VIS_BASE_PATH}/datasets/${param0}/fields`,
    {
      method: "GET",
      params: { ...queryParams },
      ...(options || {}),
    }
  );
}

/** 查询引用数据集的卡片 GET /datasets/cards */
export async function listDatasetCards(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: VIS.listDatasetCardsParams,
  options?: { [key: string]: any }
) {
  return request<VIS.RListResponseVisCardRefInfo>(
    `${VIS_BASE_PATH}/datasets/cards`,
    {
      method: "GET",
      params: {
        ...params,
      },
      ...(options || {}),
    }
  );
}

/** 调试数据集脚本 POST /datasets/debug */
export async function debugDataset(
  body: VIS.DebugSqlRequest,
  options?: { [key: string]: any }
) {
  return request<VIS.RDebugSqlResponse>(`${VIS_BASE_PATH}/datasets/debug`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    data: body,
    ...(options || {}),
  });
}

/** 删除数据集 POST /datasets/del */
export async function delDataset(
  body: VIS.IdsRequest,
  options?: { [key: string]: any }
) {
  return request<VIS.RVoid>(`${VIS_BASE_PATH}/datasets/del`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    data: body,
    ...(options || {}),
  });
}

/** 数据集详情 GET /datasets/detail */
export async function getDatasetDetail(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: VIS.getDatasetDetailParams,
  options?: { [key: string]: any }
) {
  return request<VIS.RConfSqlInfo>(`${VIS_BASE_PATH}/datasets/detail`, {
    method: "GET",
    params: {
      ...params,
    },
    ...(options || {}),
  });
}

/** 编辑数据集脚本 POST /datasets/edit-content */
export async function editDatasetContent(
  body: VIS.ConfSqlContentRequest,
  options?: { [key: string]: any }
) {
  return request<VIS.RVoid>(`${VIS_BASE_PATH}/datasets/edit-content`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    data: body,
    ...(options || {}),
  });
}

/** 覆盖保存数据集字段 POST /datasets/edit-fields */
export async function editDatasetFields(
  body: VIS.ConfSqlFieldSaveRequest,
  options?: { [key: string]: any }
) {
  return request<VIS.RVoid>(`${VIS_BASE_PATH}/datasets/edit-fields`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    data: body,
    ...(options || {}),
  });
}

/** 新建或编辑数据集信息 POST /datasets/edit-info */
export async function editDatasetInfo(
  body: VIS.ConfSqlInfoRequest,
  options?: { [key: string]: any }
) {
  return request<VIS.RVoid>(`${VIS_BASE_PATH}/datasets/edit-info`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    data: body,
    ...(options || {}),
  });
}

/** 查询数据集字段 GET /datasets/fields */
export async function listDatasetFields(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: VIS.listDatasetFieldsParams,
  options?: { [key: string]: any }
) {
  return request<VIS.RListConfSqlFieldInfo>(
    `${VIS_BASE_PATH}/datasets/fields`,
    {
      method: "GET",
      params: {
        ...params,
      },
      ...(options || {}),
    }
  );
}

/** 数据集选项 GET /datasets/options */
export async function listDatasetOptions(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: VIS.listDatasetOptionsParams,
  options?: { [key: string]: any }
) {
  return request<VIS.RListResponseVisDatasetInfo>(
    `${VIS_BASE_PATH}/datasets/options`,
    {
      method: "GET",
      params: {
        ...params,
      },
      ...(options || {}),
    }
  );
}

/** 分页查询数据集 POST /datasets/query */
export async function queryDatasets(
  body: VIS.QueryConfSqlRequest,
  options?: { [key: string]: any }
) {
  return request<VIS.RPageResponseConfSqlInfo>(
    `${VIS_BASE_PATH}/datasets/query`,
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
