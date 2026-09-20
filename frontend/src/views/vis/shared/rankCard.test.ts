import type { VisVisualConfig } from './types'
import { describe, expect, it } from 'vitest'
import { fromVisCardInfo, toVisCardSaveRequest } from '../cards/cardApi'
import { resolveRankOptions } from './rankCard'

describe('saving existing rank cards', () => {
  it.each([true, false])('removes legacy display options (showBar=%s) while preserving other settings', (showBar) => {
    const rank = { showValue: false, showPercent: true, size: 'lg' }
    const legacy = { showRank: false, showBar, color: '#123456' }
    const card = fromVisCardInfo({
      id: '1',
      cardName: '排行榜',
      status: 'EBL',
      chartType: 'RANK',
      visualJson: JSON.stringify({ chartType: 'rank', rank: { ...rank, ...legacy } }),
    })
    const saved: VisVisualConfig = JSON.parse(toVisCardSaveRequest(card, card.query).visualJson!)
    expect(saved.rank).toEqual(rank)
    expect(card.visual.rank).toMatchObject(legacy)
  })

  it('omits the rank branch when only obsolete display settings remain', () => {
    const card = fromVisCardInfo({
      id: '1',
      cardName: '排行榜',
      status: 'EBL',
      chartType: 'RANK',
      visualJson: JSON.stringify({ chartType: 'rank', rank: { showRank: false, showBar: false, color: '#123456' } }),
    })
    const saved: VisVisualConfig = JSON.parse(toVisCardSaveRequest(card, card.query).visualJson!)
    expect(saved.rank).toBeUndefined()
  })

  it.each([
    ['sm', 'sm'],
    ['lg', 'lg'],
    ['xs', undefined],
    ['xl', undefined],
    ['md', undefined],
    ['unknown', undefined],
  ])('uses the same size when previewing and saving %s', (size, savedSize) => {
    const card = fromVisCardInfo({
      id: '1',
      cardName: '排行榜',
      status: 'EBL',
      chartType: 'RANK',
      visualJson: JSON.stringify({ chartType: 'rank', rank: { size } }),
    })
    const saved: VisVisualConfig = JSON.parse(toVisCardSaveRequest(card, card.query).visualJson!)
    expect(resolveRankOptions(card.visual).size).toBe(savedSize ?? 'md')
    expect(saved.rank?.size).toBe(savedSize)
    expect(card.visual.rank?.size).toBe(size)
  })
})
