/** 挡住 Mac 触控板横向滑页触发浏览器返回；内部横向滚动不拦截 */

const INNER_PAN = '.vis-vtable, .g2-chart, canvas, .cm-editor, .cm-scroller, .el-scrollbar__wrap, .el-table__body-wrapper'

function isInnerHorizontalPan(event: Event) {
  for (const node of event.composedPath()) {
    if (!(node instanceof Element))
      continue
    if (node.closest(INNER_PAN))
      return true
    if (node instanceof HTMLElement) {
      const overflowX = getComputedStyle(node).overflowX
      if ((overflowX === 'auto' || overflowX === 'scroll') && node.scrollWidth > node.clientWidth + 1)
        return true
    }
  }
  return false
}

function onSwipeBackWheel(event: WheelEvent) {
  if (event.ctrlKey || event.metaKey)
    return
  if (Math.abs(event.deltaX) <= Math.abs(event.deltaY))
    return
  if (isInnerHorizontalPan(event))
    return
  event.preventDefault()
}

function lock() {
  document.documentElement.style.overscrollBehaviorX = 'none'
  document.body.style.overscrollBehaviorX = 'none'
  window.addEventListener('wheel', onSwipeBackWheel, { passive: false, capture: true })
}

function unlock() {
  document.documentElement.style.overscrollBehaviorX = ''
  document.body.style.overscrollBehaviorX = ''
  window.removeEventListener('wheel', onSwipeBackWheel, true)
}

export function useSwipeBackGuard() {
  onMounted(lock)
  onUnmounted(unlock)
}
