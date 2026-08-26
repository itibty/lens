/*
 * @Author: Chuang
 * @Date: 2022-12-29 13:42:41
 * @LastEditTime: 2025-07-28 15:13:48
 * @LastEditors: Chuang
 * @Description:
 */

// UI
export const UIConfig = {
  appTitle: import.meta.env.VITE_APP_TITLE || 'Lens',
  showWatermark: true, // 是否水印
  sidebarFilter: true, // 侧栏是否支持搜索
  sidebarUniqueOpened: false, // 侧栏 uniqueOpened
  publicOssHost: import.meta.env.VITE_PUBLIC_OSS_HOST || '',
  invalidImage:
    'https://cube.elemecdn.com/e/fd/0fc7d20532fdaf769a25683617711png.png',
  paddingSize: 16,
}

// 网络请求
export const RequestConfig = {
  baseURL: import.meta.env.VITE_BASE_URL, // 请求基地址
  timeout: 20000, // 请求超时时间
  tokenKey: 'Authorization', // token请求头
  successCode: [200], // 成功响应码
  messageDuration: 3000, // 请求消息弹窗持续时间
}

export const AppConfig = {
  appCode: 'base-admin', // 应用编码
  appVersion: '1.0.0', // 应用版本
  channel: 'web', // 渠道
  subChannel: 'web', // 子渠道
  env: import.meta.env.MODE,
}
