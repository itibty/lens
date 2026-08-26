import type { InjectionKey, Ref } from 'vue'

/** 父页累加，格子 watch 后重新出数 */
export const DASH_REFRESH_TICK: InjectionKey<Ref<number>> = Symbol('dashRefreshTick')

export function useDashRefresh() {
  const refreshTick = ref(0)
  provide(DASH_REFRESH_TICK, refreshTick)

  function refreshCards() {
    refreshTick.value += 1
  }

  return { refreshTick, refreshCards }
}
