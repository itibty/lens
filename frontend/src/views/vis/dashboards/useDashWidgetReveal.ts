import { nextTick, onScopeDispose } from 'vue'

const nextFrame = () => new Promise<void>(resolve => requestAnimationFrame(() => resolve()))

/** 新增节点完成栅格过渡后，只在画布内定位一次。 */
export function useDashWidgetReveal(getContainer: () => HTMLElement | undefined) {
  let requestId = 0

  function cancel() {
    requestId++
  }

  async function reveal(key: string) {
    const current = ++requestId
    await nextTick()
    await nextFrame()
    await nextFrame()
    if (current !== requestId)
      return
    const container = getContainer()
    const target = Array.from(container?.querySelectorAll<HTMLElement>('[data-dash-widget-key]') ?? [])
      .find(element => element.dataset.dashWidgetKey === key)
    if (!container || !target)
      return

    // 卡片位置与画布高度都有过渡，不能按动画中间的位置启动滚动。
    const animations = [...target.getAnimations(), ...(target.parentElement?.getAnimations() ?? [])]
    await Promise.allSettled(animations.map(animation => animation.finished))
    if (current !== requestId || !target.isConnected || getContainer() !== container)
      return

    const viewportTop = container.getBoundingClientRect().top + container.clientTop
    const rect = target.getBoundingClientRect()
    const top = rect.top - viewportTop
    const bottom = rect.bottom - viewportTop - container.clientHeight
    // 完全可见或已覆盖可视区时不动；否则选择距离最近的边缘。
    const delta = top < 0 && bottom < 0 ? Math.max(top, bottom) : top > 0 && bottom > 0 ? Math.min(top, bottom) : 0
    if (Math.abs(delta) < 1)
      return
    container.scrollTo({
      top: Math.max(0, Math.min(container.scrollTop + delta, container.scrollHeight - container.clientHeight)),
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
    })
  }

  onScopeDispose(cancel)
  return { reveal, cancel }
}
