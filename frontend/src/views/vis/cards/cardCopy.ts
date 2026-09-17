import type { VisCard } from '../shared/types'
import { cloneDeep } from 'lodash-es'
import { copyName } from '../shared/copyName'

export function createCardCopy(source: VisCard): VisCard {
  return { ...cloneDeep(source), id: '', updatedAt: '', name: copyName(source.name) }
}
