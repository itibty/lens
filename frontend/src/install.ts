/*
 * @Author: Chuang
 * @Date: 2023-03-30 13:54:39
 * @LastEditTime: 2026-08-25 09:42:05
 * @LastEditors: Chuang
 * @Description:
 */
import type { App, ComponentPublicInstance } from 'vue'
import { setupDirectives } from '@/directives/index'
import { setupRouteGuard } from '@/router/guard'
import { createLogger } from '@/utils/logger'
import { TraceManager } from '@/utils/trace'
import 'normalize.css/normalize.css'
import '@/assets/styles/index.scss'

import 'uno.css'
import 'virtual:svg-icons-register'

const logger = createLogger('INSTALL')

// 错误收集例子
function errorHandler(err: unknown, _instance: ComponentPublicInstance | null, info: string) {
  if ((err as any).status || (err as any).status === 0) {
    // 过滤HTTP请求错误
    return
  }
  const errorMap: any = {
    InternalError: 'js引擎内部错误',
    ReferenceError: '未找到对象',
    TypeError: '使用了错误的类型或对象',
    RangeError: '使用内置对象时，参数超范围',
    SyntaxError: '语法错误',
    EvalError: '错误的使用了Eval',
    URIError: 'URI错误',
  }
  const errorName = errorMap[(err as any).name] || '未知错误'
  logger.error(errorName, { info, error: err })
  //  throw err
}

export default {
  install(app: App) {
    // 应用内抛出的未捕获错误指定一个全局处理函数。
    app.config.errorHandler = errorHandler

    // 初始化全局指令
    setupDirectives(app)

    // 路由守卫
    setupRouteGuard()

    // 埋点工具
    TraceManager.getInstance().init({ onOff: true })
  },
}
