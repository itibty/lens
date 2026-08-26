const REVEAL_TOP = 12
const MIN_DELTA = 8
const LOCK_MS = 280

/** 画布下滚收起顶栏，上滚展开；贴顶时始终展开 */
export function useDashChromeScroll() {
  const hidden = ref(false)
  const lastTop = ref(0)
  let lockUntil = 0

  function setHidden(next: boolean) {
    if (next === hidden.value)
      return
    hidden.value = next
    lockUntil = Date.now() + LOCK_MS
  }

  function onCanvasScroll(payload: { scrollTop?: number }) {
    const top = Number(payload.scrollTop) || 0
    const delta = top - lastTop.value
    lastTop.value = top
    if (Date.now() < lockUntil)
      return
    if (top <= REVEAL_TOP) {
      setHidden(false)
      return
    }
    if (Math.abs(delta) < MIN_DELTA)
      return
    setHidden(delta > 0)
  }

  function revealChrome() {
    setHidden(false)
  }

  return {
    chromeHidden: hidden,
    onCanvasScroll,
    revealChrome,
  }
}
