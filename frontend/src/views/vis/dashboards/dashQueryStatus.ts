import type { InjectionKey, Ref } from 'vue'

export interface CardQueryStatus {
  cardId: string
  name: string
  loading: boolean
  error: string
  meta?: VIS.QueryMeta
}

export interface DashQueryStatus {
  cards: Ref<Record<string, CardQueryStatus>>
  update: (status: CardQueryStatus) => void
  remove: (cardId: string) => void
}

export const DASH_QUERY_STATUS_KEY: InjectionKey<DashQueryStatus> = Symbol('dash-query-status')

export function createDashQueryStatus(): DashQueryStatus {
  const cards = ref<Record<string, CardQueryStatus>>({})
  return {
    cards,
    update: status => cards.value[status.cardId] = status,
    remove: cardId => delete cards.value[cardId],
  }
}
