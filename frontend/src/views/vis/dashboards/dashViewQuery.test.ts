import { afterEach, describe, expect, it, vi } from 'vitest'
import { buildDashboardViewLink, explicitViewRequest, syncViewQuery } from './dashViewQuery'

vi.mock('@/utils', () => ({ o2s: (value: unknown) => encodeURIComponent(JSON.stringify(value)), s2o: (text: string) => JSON.parse(decodeURIComponent(text)) }))
afterEach(() => vi.unstubAllGlobals())

const state = { schemaVersion: 2, filters: {}, tabs: { g: { activeCardId: '12' } } }
const bindings = { region: { field: 'region' } }
const temporary = { selectedId: '', dirty: false, linked: true }

describe('complete view links', () => {
  it('prefers complete state over old filters and retains binding signatures', () => {
    expect(explicitViewRequest({ vs: JSON.stringify({ state, filterBindings: bindings }), f: 'broken' })).toEqual({
      stateJson: JSON.stringify(state),
      bindingsJson: JSON.stringify(bindings),
    })
    expect(explicitViewRequest({ f: '{"region":{"value":[]}}' })).toEqual({ stateJson: '{"schemaVersion":1,"filters":{"region":{"value":[]}}}' })
  })

  it('keeps explicit empty state and rejects malformed links', () => {
    expect(explicitViewRequest({ vs: '{"state":{"schemaVersion":2,"filters":{},"tabs":{}}}' })).toBeDefined()
    expect(() => explicitViewRequest({ vs: '[]' })).toThrow('链接中的视图无效')
    expect(() => explicitViewRequest({ vs: JSON.stringify({ state, filterBindings: [] }) })).toThrow('绑定无效')
  })

  it('writes tab-only views, removes old sources, and round trips through URLSearchParams', () => {
    const replaceState = vi.fn()
    vi.stubGlobal('window', { location: { href: 'http://localhost/vis/report/10?f=old&viewId=1#chart' }, history: { state: { back: '/vis/report' }, replaceState } })
    syncViewQuery(JSON.stringify(state), JSON.stringify(bindings), temporary)
    const [historyState, , path] = replaceState.mock.calls[0]!
    expect(historyState).toEqual({ back: '/vis/report' })
    const url = new URL(path, 'http://localhost')
    expect(url.hash).toBe('#chart')
    expect(url.searchParams.has('f')).toBe(false)
    expect(url.searchParams.has('viewId')).toBe(false)
    expect(explicitViewRequest({ vs: url.searchParams.get('vs')! })).toEqual({ stateJson: JSON.stringify(state), bindingsJson: JSON.stringify(bindings) })
  })

  it('keeps a saved view identity across reloads without freezing its state', () => {
    const replaceState = vi.fn()
    vi.stubGlobal('window', { location: { href: 'http://localhost/vis/report/10?vs=old&view=default' }, history: { state: {}, replaceState } })
    syncViewQuery(JSON.stringify(state), '{}', { selectedId: 'mine', dirty: false, linked: false })
    const url = new URL(replaceState.mock.calls[0]![2], 'http://localhost')
    expect(url.searchParams.get('viewId')).toBe('mine')
    expect(url.searchParams.has('vs')).toBe(false)
    expect(url.searchParams.has('view')).toBe(false)
  })

  it('keeps the saved view identity with unsaved changes, but strips it when sharing', () => {
    const replaceState = vi.fn()
    vi.stubGlobal('window', { location: { href: 'http://localhost/vis/dashboards/view?id=10&viewId=mine#chart' }, history: { state: {}, replaceState } })
    syncViewQuery(JSON.stringify(state), JSON.stringify(bindings), { selectedId: 'mine', dirty: true, linked: false })
    const url = new URL(replaceState.mock.calls[0]![2], 'http://localhost')
    expect(url.searchParams.get('viewId')).toBe('mine')
    expect(explicitViewRequest({ vs: url.searchParams.get('vs')! })?.stateJson).toBe(JSON.stringify(state))
    url.searchParams.set('subscriptionRunId', '20')
    const shared = buildDashboardViewLink(url.href, JSON.stringify(state), JSON.stringify(bindings))
    expect(shared.searchParams.has('viewId')).toBe(false)
    expect(shared.searchParams.has('subscriptionRunId')).toBe(false)
    expect(shared.searchParams.get('id')).toBe('10')
    expect(shared.hash).toBe('#chart')
    expect(shared.searchParams.get('vs')).toBe(url.searchParams.get('vs'))
  })

  it('explicitly restores dashboard defaults without a snapshot or personal-default ambiguity', () => {
    const replaceState = vi.fn()
    vi.stubGlobal('window', { location: { href: 'http://localhost/vis/report/10?vs=old&viewId=mine' }, history: { state: {}, replaceState } })
    syncViewQuery(JSON.stringify(state), '{}', { selectedId: '', dirty: false, linked: false })
    const url = new URL(replaceState.mock.calls[0]![2], 'http://localhost')
    expect([...url.searchParams]).toEqual([['view', 'default']])
  })

  it('does not rewrite subscription run links', () => {
    const replaceState = vi.fn()
    vi.stubGlobal('window', { location: { href: 'http://localhost/vis/report/10?subscriptionRunId=20' }, history: { replaceState } })
    syncViewQuery(JSON.stringify(state), '{}', temporary)
    expect(replaceState).not.toHaveBeenCalled()
  })
})
