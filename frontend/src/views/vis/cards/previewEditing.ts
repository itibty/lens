import type { InjectionKey } from 'vue'
import { computed, inject, onScopeDispose, provide, reactive } from 'vue'

type SetEditing = (scope: symbol, editing: boolean) => void
const previewEditingKey: InjectionKey<SetEditing> = Symbol('card-preview-editing')
const continuousInputTypes = new Set(['text', 'number', 'search', 'email', 'url', 'tel', 'password'])

/** 只记录交互是否结束；配置始终只有设计器中的一份。 */
export function providePreviewEditing() {
  const active = reactive(new Set<symbol>())
  const inputScope = Symbol('input')
  const setEditing: SetEditing = (scope, editing) => {
    if (editing)
      active.add(scope)
    else
      active.delete(scope)
  }
  provide(previewEditingKey, setEditing)
  function onInput(event: Event) {
    const target = event.target
    if (!(target instanceof Element))
      return
    // 下拉搜索和日期选择由各自控件提交，不属于连续文本输入。
    if (target.closest('.el-select, .el-date-editor'))
      return
    const input = target.closest('input, textarea, [contenteditable="true"]')
    // 单选、多选、滑块也会触发 input，选择完成后无需等待失焦。
    if (input instanceof HTMLInputElement && !continuousInputTypes.has(input.type))
      return
    if (input)
      setEditing(inputScope, true)
  }
  return {
    deferUpdates: computed(() => active.size > 0),
    onInput,
    setInputEditing: (editing: boolean) => setEditing(inputScope, editing),
  }
}

/** 用于直接绑定配置的弹层；已有关闭提交草稿的字段弹层无需接入。 */
export function usePopoverPreviewEditing() {
  const setEditing = inject(previewEditingKey, () => {})
  const scope = Symbol('popover')
  const open = new Set<string>()
  function setOpen(key: string, visible: boolean) {
    if (visible)
      open.add(key)
    else
      open.delete(key)
    setEditing(scope, open.size > 0)
  }
  function reset() {
    open.clear()
    setEditing(scope, false)
  }
  onScopeDispose(reset)
  return { setOpen, reset }
}
