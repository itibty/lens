/** 串行刷新，停止或重新打开后旧请求不能继续刷新页面或安排下一轮。 */
export function createSubscriptionPoller(refresh: (isCurrent: () => boolean) => Promise<void>, delay = 3000) {
  let generation = 0
  let timer: ReturnType<typeof setTimeout> | undefined

  function stop() {
    generation++
    clearTimeout(timer)
    timer = undefined
  }

  function start() {
    stop()
    const current = generation
    const isCurrent = () => current === generation
    async function tick() {
      try {
        await refresh(isCurrent)
      }
      finally {
        if (isCurrent())
          timer = setTimeout(() => void tick(), delay)
      }
    }
    void tick()
  }

  return { start, stop }
}
