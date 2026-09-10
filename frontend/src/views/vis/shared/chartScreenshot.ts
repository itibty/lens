export const PREPARE_CHART_SCREENSHOT_EVENT = 'lens-prepare-chart-screenshot'

function nextPaint() {
  return new Promise<void>(resolve => requestAnimationFrame(() => resolve()))
}

/** 让所有 VChart 结束动画并绘制最终帧，避免截图截到半根柱、半个饼等中间状态。 */
export async function prepareChartsForScreenshot(root: HTMLElement) {
  root.querySelectorAll<HTMLElement>('[data-vis-chart]').forEach((el) => {
    el.dispatchEvent(new CustomEvent(PREPARE_CHART_SCREENSHOT_EVENT))
  })
  // VChart 的强制 render 和 canvas 像素提交都可能跨一帧；两帧后再开始复制 DOM。
  await nextPaint()
  await nextPaint()
}
