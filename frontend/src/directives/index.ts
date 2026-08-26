/*
 * @Author: Chuang
 * @Date: 2025-02-23 10:54:35
 * @LastEditTime: 2025-08-05 19:13:45
 * @LastEditors: Chuang
 * @Description: 注册自定义指令
 */
import type { App } from 'vue'

const directives = import.meta.glob('./modules/*.ts', { eager: true })

export function setupDirectives(app: App<Element>) {
  Object.values(directives).forEach((module: any) => {
    const directive = module.default
    if (directive?.install) {
      app.use(directive)
    }
  })
}
