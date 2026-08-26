import type { VisMarkLine, VisMarkLineKind } from './types'

export const MARK_LINE_MAX = 3

export const MARK_LINE_KINDS: Array<{ value: VisMarkLineKind, label: string }> = [
  { value: 'fixed', label: '固定值' },
  { value: 'avg', label: '平均' },
  { value: 'max', label: '最大' },
  { value: 'min', label: '最小' },
]

const KIND_SET = new Set<VisMarkLineKind>(['fixed', 'avg', 'min', 'max'])

const KIND_LABEL: Record<Exclude<VisMarkLineKind, 'fixed'>, string> = {
  avg: '平均',
  min: '最小',
  max: '最大',
}

const MARK_STROKE = '#86909c'

export function isMarkLineKind(value: unknown): value is VisMarkLineKind {
  return typeof value === 'string' && KIND_SET.has(value as VisMarkLineKind)
}

/** 清洗落库 / 渲染用的标记线；keepIncomplete 给表单草稿留空固定值 */
export function sanitizeMarkLines(
  raw: unknown,
  yFields: string[],
  options?: { keepIncomplete?: boolean },
): VisMarkLine[] {
  if (!Array.isArray(raw))
    return []
  const fields = new Set(yFields)
  const out: VisMarkLine[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object' || Array.isArray(item))
      continue
    const rec = item as Record<string, unknown>
    if (!isMarkLineKind(rec.kind))
      continue
    const line: VisMarkLine = { kind: rec.kind }
    if (typeof rec.field === 'string' && fields.has(rec.field))
      line.field = rec.field
    const label = typeof rec.label === 'string' ? rec.label.trim() : ''
    if (label)
      line.label = label
    if (rec.kind === 'fixed') {
      const value = Number(rec.value)
      if (Number.isFinite(value))
        line.value = value
      else if (!options?.keepIncomplete)
        continue
    }
    out.push(line)
    if (out.length >= MARK_LINE_MAX)
      break
  }
  return out
}

export function defaultMarkLineField(chartType: string | undefined, yFields: string[]) {
  if (String(chartType || '').toLowerCase() === 'scatter')
    return yFields[1] ?? yFields[0]
  return yFields[0]
}

export function formatMarkLineValue(value: number) {
  return new Intl.NumberFormat('zh-CN', {
    maximumFractionDigits: 4,
    minimumFractionDigits: 0,
  }).format(value)
}

export function markLineLabel(line: VisMarkLine, value: number) {
  if (line.label)
    return line.label
  if (line.kind === 'fixed')
    return formatMarkLineValue(value)
  return KIND_LABEL[line.kind]
}

export function markLineStat(values: number[], kind: Exclude<VisMarkLineKind, 'fixed'>) {
  if (!values.length)
    return undefined
  if (kind === 'min')
    return Math.min(...values)
  if (kind === 'max')
    return Math.max(...values)
  return values.reduce((sum, item) => sum + item, 0) / values.length
}

export function toMarkLineSpec(input: {
  axis: 'x' | 'y'
  value: number
  text: string
  relativeSeriesId?: string
}) {
  const spec: Record<string, unknown> = {
    [input.axis]: input.value,
    interactive: false,
    autoRange: true,
    startSymbol: { visible: false },
    endSymbol: { visible: false },
    label: {
      visible: true,
      text: input.text,
      position: 'end',
      confine: true,
      labelBackground: { visible: false },
      style: {
        fill: MARK_STROKE,
        fontSize: 11,
      },
    },
    line: {
      style: {
        stroke: MARK_STROKE,
        lineWidth: 1,
        lineDash: [4, 4],
      },
    },
  }
  if (input.relativeSeriesId)
    spec.relativeSeriesId = input.relativeSeriesId
  return spec
}
