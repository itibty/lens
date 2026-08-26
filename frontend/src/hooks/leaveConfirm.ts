import type { MaybeRefOrGetter } from 'vue'
import { ElMessageBox } from 'element-plus'
import { onBeforeRouteLeave } from 'vue-router'

const DEFAULT_MESSAGE = '当前操作可能会导致未保存的内容丢失，确认继续？'

function isReloadHotkey(event: KeyboardEvent) {
  if (event.key === 'F5')
    return true
  return (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'r'
}

/** 切走 / 刷新 / 关页时按 enabled 确认；程序跳转先 skipConfirm()。 */
export function useLeaveConfirm(
  message: MaybeRefOrGetter<string> = DEFAULT_MESSAGE,
  title = '温馨提示',
  enabled: MaybeRefOrGetter<boolean> = true,
) {
  let pass = false

  function skipConfirm() {
    pass = true
  }

  function ask() {
    return ElMessageBox.confirm(toValue(message), title, {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      closeOnClickModal: false,
      type: 'warning',
    })
  }

  async function confirmLeave() {
    if (!toValue(enabled))
      return true
    try {
      await ask()
      return true
    }
    catch {
      return false
    }
  }

  onBeforeRouteLeave(async () => {
    if (pass) {
      pass = false
      return true
    }
    return confirmLeave()
  })

  function onBeforeUnload(event: BeforeUnloadEvent) {
    if (pass || !toValue(enabled))
      return
    event.preventDefault()
    event.returnValue = ''
  }

  function onKeydown(event: KeyboardEvent) {
    if (!isReloadHotkey(event) || !toValue(enabled))
      return
    event.preventDefault()
    void ask().then(() => {
      skipConfirm()
      window.location.reload()
    }).catch(() => {})
  }

  onMounted(() => {
    window.addEventListener('beforeunload', onBeforeUnload)
    window.addEventListener('keydown', onKeydown, true)
  })
  onUnmounted(() => {
    window.removeEventListener('beforeunload', onBeforeUnload)
    window.removeEventListener('keydown', onKeydown, true)
  })

  return { skipConfirm, confirmLeave }
}
