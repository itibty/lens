// @ts-ignore
/* eslint-disable */
import request from "@/core/request";
import { VIS_BASE_PATH } from "@/apis/config";

/** 元数据树 GET /datasources/${param0}/meta-tree */
export async function getDatasourceMetaTree(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: VIS.getDatasourceMetaTreeParams,
  options?: { [key: string]: any }
) {
  const { sourceName: param0, ...queryParams } = params;
  return request<VIS.RListResponseSchemaInfo>(
    `${VIS_BASE_PATH}/datasources/${param0}/meta-tree`,
    {
      method: "GET",
      params: {
        ...queryParams,
      },
      ...(options || {}),
    }
  );
}

/** 数据源选项 POST /datasources/${param0}/options */
export async function listDatasourceOptions(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: VIS.listDatasourceOptionsParams,
  options?: { [key: string]: any }
) {
  const { dsType: param0, ...queryParams } = params;
  return request<VIS.RListResponseDsOption>(
    `${VIS_BASE_PATH}/datasources/${param0}/options`,
    {
      method: "POST",
      params: { ...queryParams },
      ...(options || {}),
    }
  );
}

/** 数据表选项 GET /datasources/${param0}/tables */
export async function listDatasourceTables(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: VIS.listDatasourceTablesParams,
  options?: { [key: string]: any }
) {
  const { sourceName: param0, ...queryParams } = params;
  return request<VIS.RListResponseNameValue>(
    `${VIS_BASE_PATH}/datasources/${param0}/tables`,
    {
      method: "GET",
      params: { ...queryParams },
      ...(options || {}),
    }
  );
}

/** 引用数据集 GET /datasources/datasets */
export async function listDatasourceDatasets(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: VIS.listDatasourceDatasetsParams,
  options?: { [key: string]: any }
) {
  return request<VIS.RListResponseDatasourceDatasetInfo>(
    `${VIS_BASE_PATH}/datasources/datasets`,
    {
      method: "GET",
      params: {
        ...params,
      },
      ...(options || {}),
    }
  );
}

/** 删除数据源 POST /datasources/del */
export async function delDatasource(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: VIS.delDatasourceParams,
  options?: { [key: string]: any }
) {
  return request<VIS.RVoid>(`${VIS_BASE_PATH}/datasources/del`, {
    method: "POST",
    params: {
      ...params,
    },
    ...(options || {}),
  });
}

/** 数据源详情 GET /datasources/detail */
export async function getDatasourceDetail(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: VIS.getDatasourceDetailParams,
  options?: { [key: string]: any }
) {
  return request<VIS.RDatasourceInfo>(`${VIS_BASE_PATH}/datasources/detail`, {
    method: "GET",
    params: {
      ...params,
    },
    ...(options || {}),
  });
}

/** 保存数据源 POST /datasources/edit */
export async function editDatasource(
  body: VIS.SaveDatasourceRequest,
  options?: { [key: string]: any }
) {
  return request<VIS.RLong>(`${VIS_BASE_PATH}/datasources/edit`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    data: body,
    ...(options || {}),
  });
}

/** 数据源列表 POST /datasources/query */
export async function queryDatasources(
  body: VIS.QueryDatasourceRequest,
  options?: { [key: string]: any }
) {
  return request<VIS.RPageResponseDatasourceInfo>(
    `${VIS_BASE_PATH}/datasources/query`,
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

/** 启停数据源 POST /datasources/status */
export async function setDatasourceStatus(
  body: VIS.DatasourceStatusRequest,
  options?: { [key: string]: any }
) {
  return request<VIS.RVoid>(`${VIS_BASE_PATH}/datasources/status`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    data: body,
    ...(options || {}),
  });
}

/** 测试连接 POST /datasources/test */
export async function testDatasource(
  body: VIS.DatasourceConnectionRequest,
  options?: { [key: string]: any }
) {
  return request<VIS.RDatasourceTestResult>(
    `${VIS_BASE_PATH}/datasources/test`,
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
