import { describe, expect, it } from 'vitest'
import { assertSubscriptionScreenshotReady } from './subscriptionScreenshot'

function root(...states: string[]) {
  return {
    querySelectorAll: () => states.map(dashboardCardState => ({ dataset: { dashboardCardState } })),
  } as unknown as HTMLElement
}

describe('subscription screenshots', () => {
  it('allows completed charts and text-only dashboards', () => {
    expect(() => assertSubscriptionScreenshotReady(root('ready', 'ready'))).not.toThrow()
    expect(() => assertSubscriptionScreenshotReady(root())).not.toThrow()
  })

  it.each(['error', 'unavailable', 'loading'])('rejects a partial dashboard with a %s card', (state) => {
    expect(() => assertSubscriptionScreenshotReady(root('ready', state))).toThrow('本次订阅未发送')
  })
})
