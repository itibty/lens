/*
 * @Author: Chuang
 * @Date: 2023-01-09 09:53:35
 * @LastEditTime: 2025-06-17 23:32:09
 * @LastEditors: Chuang
 * @Description:  v-debounce="functionName" 、 v-debounce:2000="functionName" click防抖（多次点击末次生效）
 */
import type { App } from 'vue'

interface ElType extends HTMLElement {
  __debounceCallback__: () => any
  __debounceDelay__: number
  __debounceHandleClick__: () => void
  __debounceTimer__: ReturnType<typeof setTimeout> | null
}

function updateCallback(el: ElType, value: unknown) {
  if (typeof value !== 'function')
    throw new Error('callback must be a function')

  el.__debounceCallback__ = value as () => any
}

export default {
  install(app: App) {
    app.directive('debounce', {
      mounted(el: ElType, binding) {
        updateCallback(el, binding.value)
        el.__debounceDelay__ = Number(binding.arg) || 500
        el.__debounceTimer__ = null
        el.__debounceHandleClick__ = function () {
          if (el.__debounceTimer__) {
            clearTimeout(el.__debounceTimer__)
          }

          el.__debounceTimer__ = setTimeout(() => {
            el.__debounceCallback__()
            el.__debounceTimer__ = null
          }, el.__debounceDelay__)
        }

        el.addEventListener('click', el.__debounceHandleClick__)
      },
      updated(el: ElType, binding) {
        updateCallback(el, binding.value)
        el.__debounceDelay__ = Number(binding.arg) || 500
      },
      beforeUnmount(el: ElType) {
        if (el.__debounceTimer__)
          clearTimeout(el.__debounceTimer__)
        el.removeEventListener('click', el.__debounceHandleClick__)
      },
    })
  },
}
