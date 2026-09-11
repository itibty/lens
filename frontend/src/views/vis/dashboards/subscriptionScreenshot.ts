/** 自动分发要求所有卡片可用，避免把错误页或加载中的卡片作为成功报表发送。 */
export function assertSubscriptionScreenshotReady(root: HTMLElement) {
  const states = Array.from(root.querySelectorAll<HTMLElement>('[data-dashboard-card-state]'))
    .map(el => el.dataset.dashboardCardState)
  if (states.some(state => state === 'error' || state === 'unavailable'))
    throw new Error('看板存在查询失败或不可用的卡片，本次订阅未发送')
  if (states.some(state => state !== 'ready'))
    throw new Error('看板数据尚未加载完成，本次订阅未发送')
}
