/**
 * 排序 / 结果过滤随投放区收敛。
 *
 * 排序：候选 = 当前货架上的维度 + 指标（透视=行维+列维）；
 *       请求 field 必须是 SELECT 别名（有 label 用 label，否则 field）；
 *       按来源 _uid 跟随改名，对不上或重复别名则丢，方向保留。
 * HAVING：候选 = 已投放且非公式的指标；按 field+agg 对；
 *         改字段 / 汇总 / 改成公式则丢，只改显示名留下。
 * 切图表走 resetQueryShelves，不走这里。
 */
import type { DimensionPill, HavingPill, MetricPill, OrderPill } from '@/views/vis/shared/dnd'
import type { VisQueryConfig } from '@/views/vis/shared/types'
import { createDragUid } from '@/views/vis/shared/dnd'
import { aggLabel, DEFAULT_METRIC_AGG, hidesQueryDimensions, isPivotChart } from '@/views/vis/shared/types'

export interface OrderCandidate {
  sourceUid: string
  alias: string
  kind: 'dimension' | 'metric'
  display: string
}

export interface HavingCandidate {
  field: string
  agg: NonNullable<VIS.MetricItem['agg']>
  display: string
}

/** 与后端 resolveDimAlias / resolveMetricAlias 一致：label 非空白才用 label */
export function querySelectAlias(item: { field: string, label?: string }) {
  return item.label?.trim() ? item.label : item.field
}

export function orderSourceDimensions(query: VisQueryConfig, chartType?: string): DimensionPill[] {
  if (hidesQueryDimensions(chartType))
    return []
  if (isPivotChart(chartType)) {
    return [
      ...((query.rowDimensions ?? []) as DimensionPill[]),
      ...((query.colDimensions ?? []) as DimensionPill[]),
    ]
  }
  return (query.dimensions ?? []) as DimensionPill[]
}

export function buildOrderCandidates(
  dimensions: Array<VIS.DimensionItem & { _uid?: string }>,
  metrics: Array<VIS.MetricItem & { _uid?: string }>,
): OrderCandidate[] {
  const list: OrderCandidate[] = [
    ...dimensions.filter(d => d.field).map(d => ({
      sourceUid: d._uid || d.field,
      alias: querySelectAlias(d),
      kind: 'dimension' as const,
      display: '',
    })),
    ...metrics.filter(m => m.field).map(m => ({
      sourceUid: m._uid || m.field,
      alias: querySelectAlias(m),
      kind: 'metric' as const,
      display: '',
    })),
  ]
  for (const item of list) {
    const clash = list.some(other => other !== item && other.alias === item.alias)
    item.display = clash
      ? `${item.alias}（${item.kind === 'dimension' ? '维度' : '指标'}）`
      : item.alias
  }
  return list
}

export function unusedOrderCandidates(candidates: OrderCandidate[], orders: OrderPill[]) {
  const usedUid = new Set(orders.map(o => o.sourceUid).filter((uid): uid is string => !!uid))
  const usedAlias = new Set(orders.map(o => o.field))
  return candidates.filter(c => !usedUid.has(c.sourceUid) && !usedAlias.has(c.alias))
}

export function createOrderPill(cand: OrderCandidate, dir: OrderPill['dir'] = 'asc'): OrderPill {
  return {
    _uid: createDragUid(),
    field: cand.alias,
    dir,
    sourceUid: cand.sourceUid,
  }
}

function sameOrderList(a: OrderPill[], b: OrderPill[]) {
  return a.length === b.length && a.every((item, i) => {
    const other = b[i]
    return item._uid === other._uid
      && item.field === other.field
      && item.dir === other.dir
      && item.sourceUid === other.sourceUid
  })
}

function syncOrderList(orders: OrderPill[], candidates: OrderCandidate[]): OrderPill[] {
  const byUid = new Map(candidates.map(c => [c.sourceUid, c]))
  const byAlias = new Map<string, OrderCandidate>()
  for (const c of candidates) {
    if (!byAlias.has(c.alias))
      byAlias.set(c.alias, c)
  }
  const seen = new Set<string>()
  const next: OrderPill[] = []
  for (const order of orders) {
    const cand = (order.sourceUid ? byUid.get(order.sourceUid) : undefined) ?? byAlias.get(order.field)
    if (!cand || seen.has(cand.alias))
      continue
    seen.add(cand.alias)
    next.push({
      _uid: order._uid,
      field: cand.alias,
      dir: order.dir === 'desc' ? 'desc' : 'asc',
      sourceUid: cand.sourceUid,
    })
  }
  return sameOrderList(orders, next) ? orders : next
}

export function buildHavingCandidates(metrics: VIS.MetricItem[]): HavingCandidate[] {
  return metrics
    .filter(m => !m.formula?.trim())
    .map((m) => {
      const agg = m.agg || DEFAULT_METRIC_AGG
      return {
        field: m.field,
        agg,
        display: `${aggLabel(agg)}(${m.field})`,
      }
    })
}

export function havingCandidateKey(field: string, agg: string) {
  return `${field}::${agg}`
}

function syncHavingFilters(having: HavingPill[], metrics: VIS.MetricItem[]): HavingPill[] {
  const keys = new Set(
    buildHavingCandidates(metrics).map(c => havingCandidateKey(c.field, c.agg)),
  )
  const next = having.filter(item => item.field && item.agg && keys.has(havingCandidateKey(item.field, item.agg)))
  return next.length === having.length ? having : next
}

export function deriveDependentShelves(query: VisQueryConfig, chartType?: string) {
  const metrics = (query.metrics ?? []) as MetricPill[]
  return {
    orderList: syncOrderList(
      (query.orderList ?? []) as OrderPill[],
      buildOrderCandidates(orderSourceDimensions(query, chartType), metrics),
    ),
    havingFilters: syncHavingFilters((query.havingFilters ?? []) as HavingPill[], metrics),
  }
}

/** 设计器里投放变化时写回 query；无变化保持原引用 */
export function reconcileQueryDependents(query: VisQueryConfig, chartType?: string) {
  const next = deriveDependentShelves(query, chartType)
  if (query.orderList !== next.orderList)
    query.orderList = next.orderList
  if (query.havingFilters !== next.havingFilters)
    query.havingFilters = next.havingFilters
}
