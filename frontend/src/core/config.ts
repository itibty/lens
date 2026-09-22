/*
 * @Author: Chuang
 * @Date: 2022-12-29 13:42:41
 * @LastEditTime: 2025-07-28 15:13:48
 * @LastEditors: Chuang
 * @Description:
 */

export type LoadingStyle = 'brand' | 'default'

const appSlogans = [
  '让数据更清晰',
  '让洞察更直观',
  '让决策有依据',
  '看见数据价值',
] as const

// UI
export const UIConfig = {
  appTitle: import.meta.env.VITE_APP_TITLE || 'Lens',
  // 每次加载应用时选一次；登录页与顶栏共用，路由切换时保持不变。
  appSlogan: appSlogans[Math.floor(Math.random() * appSlogans.length)],
  loadingStyle: 'default' as LoadingStyle, // 通用页面与组件的 loading 样式
  dashboardLoadingStyle: 'brand' as LoadingStyle, // 仅看板展示（含独立预览）与设计画布使用；改为 default 可恢复默认
  appearanceEnabled: true, // 改为 false，隐藏外观入口并强制恢复经典导航配色
  showWatermark: true, // 是否水印
  sidebarFilter: true, // 侧栏是否支持搜索
  sidebarUniqueOpened: false, // 侧栏 uniqueOpened
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
