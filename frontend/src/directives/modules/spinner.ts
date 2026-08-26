/*
 * @Author: Chuang
 * @Date: 2025-07-02 20:15:16
 * @LastEditTime: 2025-07-03 10:44:38
 * @LastEditors: Chuang
 * @Description: v-spinner="true" 自定义loading指令（原loading指令样式统一修改难)
 */
// directives/loading.js
import type { App } from 'vue'
import { ElLoading } from 'element-plus'

// 参考t-design loading
const spinner = `<foreignObject x="0" y="0" width="100%" height="100%">
    <div class="t-loading__gradient-conic" />
  </foreignObject>
`
const loadingTextAttrName = 'element-loading-text'
type SpinnerElement = HTMLElement & {
  loadingInstance?: ReturnType<typeof ElLoading.service>
}

function createLoadingInstance(el: SpinnerElement) {
  el.loadingInstance?.close()
  // lock 会给 body 加 overflow:hidden，滚动条闪一下像整页刷新；局部 target 不需要锁 body
  return ElLoading.service({
    target: el,
    lock: false,
    text: el.getAttribute(loadingTextAttrName) || undefined,
    spinner,
    customClass: 'tdesign-loading',
  })
}

export default {
  install(app: App) {
    // 兼容v-loading等

    app.directive('spinner', {
      mounted(el: SpinnerElement, binding) {
        if (binding.value) {
          el.loadingInstance = createLoadingInstance(el)
        }
      },
      updated(el: SpinnerElement, binding) {
        if (binding.value !== binding.oldValue) {
          if (binding.value) {
            el.loadingInstance = createLoadingInstance(el)
          }
          else {
            el.loadingInstance?.close()
          }
        }
      },
      unmounted(el: SpinnerElement) {
        el.loadingInstance?.close()
      },
    })
  },
}
