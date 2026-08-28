import { useEventListener } from '@vueuse/core'

interface ResizablePanelOptions {
  storageKey: string
  defaultWidth: number
  minWidth: number
  maxWidth: number
  minRemainingWidth: number
}

export function useResizablePanel(options: ResizablePanelOptions) {
  const containerRef = ref<HTMLElement>()
  const panelWidth = ref(options.defaultWidth)
  const resizing = ref(false)
  let removeDragListeners: (() => void) | undefined

  function clampWidth(width: number) {
    const containerWidth = containerRef.value?.clientWidth
    const availableMax = containerWidth == null
      ? options.maxWidth
      : Math.max(options.minWidth, containerWidth - options.minRemainingWidth)
    return Math.min(options.maxWidth, availableMax, Math.max(options.minWidth, width))
  }

  function readStoredWidth() {
    const stored = Number(localStorage.getItem(options.storageKey))
    panelWidth.value = Number.isFinite(stored)
      ? clampWidth(stored)
      : clampWidth(options.defaultWidth)
  }

  function persistWidth() {
    localStorage.setItem(options.storageKey, String(panelWidth.value))
  }

  function stopDragging(persist = false) {
    resizing.value = false
    removeDragListeners?.()
    removeDragListeners = undefined
    if (persist)
      persistWidth()
  }

  function onResizeStart(event: MouseEvent) {
    if (event.button !== 0)
      return
    event.preventDefault()
    stopDragging()
    resizing.value = true
    const startX = event.clientX
    const startWidth = panelWidth.value

    const onMove = (next: MouseEvent) => {
      panelWidth.value = clampWidth(startWidth + next.clientX - startX)
    }
    const onUp = () => stopDragging(true)
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    removeDragListeners = () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }

  onMounted(() => nextTick(readStoredWidth))
  onBeforeUnmount(() => stopDragging())
  useEventListener(window, 'resize', () => {
    panelWidth.value = clampWidth(panelWidth.value)
  })

  return {
    containerRef,
    panelWidth,
    resizing,
    onResizeStart,
  }
}
