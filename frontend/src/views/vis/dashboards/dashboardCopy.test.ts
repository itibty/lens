import { beforeEach, describe, expect, it, vi } from 'vitest'
import vis from '@/apis/vis/index'
import { copyDashboard } from './dashboardRepository'
import { parseDashConfig } from './dashConfigCodec'

vi.mock('@/apis/vis/index', () => ({ default: {
  query: { getDashboardDetail: vi.fn(), getCardDetail: vi.fn() },
  dashboard: { editDashboard: vi.fn() },
} }))

const source: VIS.VisDashboardInfo = {
  id: '100',
  dashName: '原看板',
  groupId: '20',
  status: 'EBL',
  cards: [{ cardId: '101', status: 'DBL' }, { cardId: '102', status: 'EBL' }],
  configJson: JSON.stringify({
    theme: 't2',
    autoRefreshSec: 60,
    filters: [{ uid: 'region', datasetId: '9101', field: 'region', label: '区域', applyAs: 'filter', formType: 'input', op: 'eq', defaultValue: { value: ['华东'] } }],
    widgets: [
      { kind: 'card', cardId: '101', x: 0, y: 0, w: 12, h: 8 },
      { kind: 'group', id: 'tabs', title: '趋势', mode: 'tabs', x: 0, y: 8, w: 24, h: 8, pages: [{ id: 'p1', title: '营收', items: [{ cardId: '102', x: 0, y: 0, w: 12, h: 8 }] }] },
      { kind: 'card', cardId: 'deleted', x: 0, y: 16, w: 12, h: 8 },
    ],
    cardDisplayOverrides: { 101: { title: '局部标题', description: null }, deleted: { title: '已删除' } },
  }),
}
const metadata = { name: '新看板', groupId: '30', status: 'DBL' as const, desc: '新描述', icon: 'example' }

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(vis.query.getDashboardDetail).mockResolvedValue({ code: 200, msg: '成功', data: structuredClone(source) })
  vi.mocked(vis.dashboard.editDashboard).mockResolvedValue({ code: 200, msg: '成功', data: '200' })
})

describe('dashboard copies', () => {
  it('creates a new dashboard with shared card IDs, independent layout and no user relationships', async () => {
    expect(await copyDashboard('100', metadata)).toBe('200')
    const request = vi.mocked(vis.dashboard.editDashboard).mock.calls[0]![0]
    expect(request).toMatchObject({ dashName: '新看板', groupId: '30', status: 'DBL', dashDesc: '新描述' })
    expect(Object.keys(request).sort()).toEqual(['cards', 'configJson', 'dashDesc', 'dashName', 'groupId', 'icon', 'status'].sort())
    expect(request.cards?.map(card => card.cardId)).toEqual(['101', '102'])
    const config = parseDashConfig(request.configJson)
    expect(config.cardDisplayOverrides).toEqual({ 101: { title: '局部标题', description: null } })
    expect(config.filters[0]?.defaultValue?.value).toEqual(['华东'])
    expect(config.theme).toBe('t2')
    expect(config.autoRefreshSec).toBe(60)
    expect(config.widgets[1]).toMatchObject({ id: 'tabs', mode: 'tabs', pages: [{ id: 'p1', title: '营收', items: [{ cardId: '102' }] }] })
    expect(vis.query.getCardDetail).not.toHaveBeenCalled()
    expect(JSON.parse(source.configJson!).widgets).toHaveLength(3)
  })

  it.each([undefined, '{broken', 'null', '{}'])('does not create an empty copy from invalid config %s', async (configJson) => {
    vi.mocked(vis.query.getDashboardDetail).mockResolvedValue({ code: 200, msg: '成功', data: { ...source, configJson } })
    await expect(copyDashboard('100', metadata)).rejects.toThrow('源看板配置无效')
    expect(vis.dashboard.editDashboard).not.toHaveBeenCalled()
  })

  it('does not submit after the source becomes unavailable', async () => {
    vi.mocked(vis.query.getDashboardDetail).mockRejectedValue(new Error('源看板不存在'))
    await expect(copyDashboard('100', metadata)).rejects.toThrow('源看板不存在')
    expect(vis.dashboard.editDashboard).not.toHaveBeenCalled()
  })

  it('keeps save failures visible to the caller', async () => {
    vi.mocked(vis.dashboard.editDashboard).mockRejectedValue(new Error('分组不存在'))
    await expect(copyDashboard('100', metadata)).rejects.toThrow('分组不存在')
    expect(vis.dashboard.editDashboard).toHaveBeenCalledTimes(1)
  })
})
