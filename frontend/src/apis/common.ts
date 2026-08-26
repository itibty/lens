/*
 * @Author: Chuang
 * @Date: 2023-03-31 13:16:36
 * @LastEditTime: 2024-04-10 15:48:15
 * @LastEditors: Chuang
 * @Description:
 */
import request from '@/core/request'

export interface Ret<T> {
  /** 响应码，200成功，其它编码都是失败 */
  code: number
  data?: T
  msg: string
}

export async function httpUpload<T>(url: string, file: File, body: object = {}, fileField: string = 'file', options: { [key: string]: any } = {}) {
  const formData = new FormData()
  formData.append(fileField, file)
  Object.keys(body).forEach((ele) => {
    const item = (body as any)[ele]
    if (item !== undefined && item !== null) {
      formData.append(
        ele,
        typeof item === 'object' && !(item instanceof File)
          ? JSON.stringify(item)
          : item,
      )
    }
  })
  return request<T>(url, {
    method: 'POST',
    data: formData,
    ...(options || {}),
  })
}

export async function httpPost<T>(url: string, body: object = {}, options: { [key: string]: any } = {}) {
  return request<T>(url, {
    method: 'POST',
    data: body,
    ...(options || {}),
  })
}

export async function httpGet<T>(url: string, params: object = {}, options: { [key: string]: any } = {}) {
  return request<T>(url, {
    method: 'GET',
    params,
    ...(options || {}),
  })
}
