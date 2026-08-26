const MIN_EDITOR_HEIGHT = 62

/** 编辑器底边拖高：默认隐藏，悬停 / 拖动时显示 */
export function useEditorResize() {
  const wrapRef = ref<HTMLElement>()
  const resizing = ref(false)
  const height = ref<number>()

  function onResizeStart(e: MouseEvent) {
    const el = wrapRef.value
    if (!el)
      return

    e.preventDefault()
    resizing.value = true
    const startY = e.clientY
    const startH = el.getBoundingClientRect().height

    const onMove = (ev: MouseEvent) => {
      height.value = Math.max(MIN_EDITOR_HEIGHT, startH + ev.clientY - startY)
    }
    const onUp = () => {
      resizing.value = false
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  const wrapStyle = computed(() => {
    if (!height.value)
      return undefined
    return { height: `${height.value}px` }
  })

  return { wrapRef, resizing, wrapStyle, onResizeStart }
}
