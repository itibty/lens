import type { ListTableConstructorOptions } from '@visactor/vtable'
import type { VisVisualConfig } from './types'
import { TYPES } from '@visactor/vtable'
import { FilterPlugin } from '@visactor/vtable-plugins'
import { contrastPeriodDescription, findContrastInfo } from './contrastExp'
import { formatMetricField } from './fieldStyle'
import { metricProgressVTableConfig } from './metricCell'
import { bindMarkColumnStyle, prepareTableMarks } from './tableMark'
import { resolveTableStyle } from './tableStyle'
import { dimensionAlias, metricAlias } from './types'
import { resolveTableHeaderIconColor, resolveVTableEmptyTip, resolveVTableLayout, resolveVTableTheme } from './vtableTheme'

function contrastPeriodHeaderIcon(tip: string, visual?: VisVisualConfig, dark = false) {
  const color = resolveTableHeaderIconColor(visual, dark)
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="${color}" stroke-width="1.7"/><path d="M12 11.2V17" stroke="${color}" stroke-width="1.8" stroke-linecap="round"/><circle cx="12" cy="8.2" r="1.15" fill="${color}"/></svg>`
  return {
    type: 'svg' as const,
    svg,
    name: `vis-contrast-info-${color}`,
    width: 14,
    height: 14,
    positionType: TYPES.IconPosition.left,
    visibleTime: 'always' as const,
    marginRight: 4,
    cursor: 'help',
    tooltip: {
      title: tip,
      style: { arrowMark: true },
    },
  }
}

function listTableFields(query: VIS.QueryConfig, data: VIS.QueryDataResponse) {
  const preferred = [
    ...(query.dimensions ?? []).map(dimensionAlias),
    ...(query.metrics ?? []).map(metricAlias),
  ].filter(Boolean)

  const fromApi = data.columns?.length
    ? data.columns
    : Object.keys(data.rows?.[0] ?? {})
  if (!fromApi.length)
    return preferred

  const preferredSet = new Set(preferred)
  const apiSet = new Set(fromApi)
  return [
    ...preferred.filter(field => apiSet.has(field)),
    ...fromApi.filter(field => !preferredSet.has(field)),
  ]
}

export function listTableColumns(
  query: VIS.QueryConfig,
  data: VIS.QueryDataResponse,
  sortable: boolean,
  visual?: VisVisualConfig,
  dark = false,
): NonNullable<ListTableConstructorOptions['columns']> {
  const metricKeys = new Set((query.metrics ?? []).map(metricAlias))
  const dimensionKeys = new Set((query.dimensions ?? []).map(dimensionAlias))
  const marks = prepareTableMarks(visual, query.asOfDate)
  const mergeCell = resolveTableStyle(visual).mergeCell

  return listTableFields(query, data).map((field) => {
    const isMetric = metricKeys.has(field)
    const periodTip = contrastPeriodDescription(findContrastInfo(data, field))
    const progress = isMetric
      ? metricProgressVTableConfig(visual, query, field, dark)
      : null
    const common = {
      field,
      title: field,
      width: 'auto',
      sort: sortable,
      mergeCell,
      description: periodTip || undefined,
      headerIcon: periodTip ? contrastPeriodHeaderIcon(periodTip, visual, dark) : undefined,
      fieldFormat: isMetric
        ? (record: Record<string, unknown>) => formatMetricField(visual, query, field, record?.[field])
        : undefined,
    }
    const textAlign = isMetric ? 'right' : dimensionKeys.has(field) ? 'left' : undefined
    if (!progress) {
      return {
        ...common,
        style: bindMarkColumnStyle(marks, field, { textAlign }),
      }
    }
    return {
      ...common,
      ...progress.define,
      style: bindMarkColumnStyle(marks, field, {
        textAlign,
        ...progress.style,
      }),
    }
  })
}

export function buildListTableOption(
  query: VIS.QueryConfig,
  data: VIS.QueryDataResponse,
  visual: VisVisualConfig,
  dark = false,
): ListTableConstructorOptions | null {
  const tableStyle = resolveTableStyle(visual)
  const columns = listTableColumns(query, data, tableStyle.sortable, visual, dark)
  if (!columns.length)
    return null

  return {
    records: data.rows ?? [],
    columns,
    theme: resolveVTableTheme(visual, dark),
    emptyTip: resolveVTableEmptyTip(dark),
    ...resolveVTableLayout(!(data.rows?.length)),
    hover: { highlightMode: 'row' },
    rowSeriesNumber: tableStyle.showRowNumber
      ? { title: '序号', width: 'auto', disableColumnResize: true }
      : undefined,
    plugins: tableStyle.showFilter
      ? [new FilterPlugin({ filterModes: ['byValue', 'byCondition'] })]
      : undefined,
  }
}
