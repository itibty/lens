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

/** 新建或编辑数据源 POST /datasources/edit */
export async function editDatasource(
  body: VIS.VisDatasource,
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
