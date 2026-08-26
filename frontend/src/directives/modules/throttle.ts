/*
 * @Author: Chuang
 * @Date: 2025-06-17 23:31:21
 * @LastEditTime: 2025-06-17 23:33:18
 * @LastEditors: Chuang
 * @Description:   v-throttle="functionName" 、 v-throttle:2000="functionName" click节流（多次点击首次生效）
 */
import type { App } from 'vue'

interface ElType extends HTMLElement {
  __throttleCallback__: (e: Event) => any
  __throttleDelay__: number
  __throttleHandleClick__: (e: Event) => void
}

function updateCallback(el: ElType, value: unknown) {
  if (typeof value !== 'function')
    throw new TypeError('Throttle directive requires a function')

  el.__throttleCallback__ = value as (e: Event) => any
}

export default {
  install(app: App) {
    app.directive('throttle', {
      mounted(el: ElType, binding) {
        updateCallback(el, binding.value)
        el.__throttleDelay__ = Number(binding.arg) || 500
        let lastExecTime = 0

        el.__throttleHandleClick__ = function (e: Event) {
          const currentTime = Date.now()
          if (currentTime - lastExecTime >= el.__throttleDelay__) {
            lastExecTime = currentTime
            el.__throttleCallback__(e)
          }
        }

        el.addEventListener('click', el.__throttleHandleClick__)
      },
      updated(el: ElType, binding) {
        updateCallback(el, binding.value)
        el.__throttleDelay__ = Number(binding.arg) || 500
      },
      beforeUnmount(el: ElType) {
        el.removeEventListener('click', el.__throttleHandleClick__)
      },
    })
  },
}
