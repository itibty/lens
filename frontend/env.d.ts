/*
 * @Author: Chuang
 * @Date: 2022-12-12 13:26:13
 * @LastEditTime: 2026-05-20 21:47:12
 * @LastEditors: Chuang
 * @Description:
 */
/// <reference types="vite/client" />

declare const __IS_BUILD__: boolean
declare const __APP_VERSION__: {
  buildId: string
  buildTime: string
  commit: string
  mode: string
  version: string
}

// 扩展 ImportMetaEnv 接口，添加埋点环境变量声明
interface ImportMetaEnv {
  /** 埋点服务 URL */
  readonly VITE_TRACE_LOG_URL?: string
  /** 埋点服务 Token */
  readonly VITE_TRACE_LOG_TOKEN?: string
}

// declare module '*.vue' {
//   import type { DefineComponent } from 'vue'

//   const vueComponent: DefineComponent<object, object, any>
//   export default vueComponent
// }

declare module 'element-plus/dist/locale/zh-cn.mjs';
declare module 'virtual:svg-icons-register'
