/*
 * @Author: shaojun
 * @Date: 2023-06-14 09:49:46
 * @LastEditTime: 2025-06-20 17:08:27
 * @LastEditors: Chuang
 * @Description:
 * v-copy="{ content: 'white', success: (msg: string)=>{} }"
 */
import type { App, DirectiveBinding } from 'vue'
import { useClipboard, useEventListener } from '@vueuse/core'
import { showToast } from '@/utils'
import { createLogger } from '@/utils/logger'

const logger = createLogger('COPY_DIRECTIVE')

export interface CopyOptions {
  content: string
  success?: (msg: string) => void
}

type CopyElement = HTMLElement & {
  targetContent?: string
  stopCopyListener?: () => void
}

export default {
  install(app: App) {
    app.directive('copy', {
      beforeMount(el: CopyElement, binding: DirectiveBinding<CopyOptions>) {
        const value: CopyOptions = binding.value
        el.targetContent = value.content
        const success = value.success
        const copyContent = ref('')
        const { copy, copied, isSupported } = useClipboard({ source: copyContent })
        /**
         *  复制方法
         */
        const copyFunc = async () => {
          if (!isSupported.value) {
            showToast('不支持复制', 'error')
            return
          }
          if (!copyContent.value)
            return

          await copy()
          if (copied.value)
            showToast('已复制!')
        }
        /**
         * 添加点击事件
         */
        el.stopCopyListener = useEventListener(
          el,
          'click',
          async (event) => {
            event.stopPropagation()
            if (!el.targetContent)
              return logger.warn('没有需要复制的目标内容')
            copyContent.value = el.targetContent
            await copyFunc()
            success && success(copyContent.value)
          },
          false,
        )
      },
      updated(el: CopyElement, binding: DirectiveBinding<CopyOptions>) {
        const value: CopyOptions = binding.value
        // 实时更新最新的目标内容
        el.targetContent = value.content
      },
      unmounted(el: CopyElement) {
        el.stopCopyListener?.()
        delete el.stopCopyListener
        delete el.targetContent
      },
    })
  },
}
