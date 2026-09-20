export const CARD_TIME_COPY = {
  label: '数据时间',
  dataUpdated: '数据更新',
  dataThrough: '数据截至',
  resultUpdated: '结果更新',
  unavailable: '暂无信息',
  failed: '获取失败',
  refreshing: '更新中…',
  refreshFailed: '更新失败，显示上次结果',
} as const

export function formatQueryTime(value?: string) {
  if (!value)
    return '尚未成功刷新'
  if (/^\d{4}-\d{2}-\d{2}$/.test(value))
    return value
  const date = new Date(value)
  if (Number.isNaN(date.getTime()))
    return '时间未知'
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(date)
}

export function dataTimeText(meta?: VIS.QueryMeta) {
  const time = meta?.dataTime
  if (!time || time.status === 'disabled')
    return ''
  const label = time.kind === 'coverageEnd' ? '数据截至' : '数据更新于'
  if (time.status === 'error')
    return '数据更新时间获取失败'
  if (time.status !== 'ok')
    return '数据更新时间未知'
  return `${label} ${formatQueryTime(time.value)}`
}

export function cardTimeRows(meta?: VIS.QueryMeta) {
  if (!meta)
    return []
  const rows: Array<{ label: string, value: string }> = []
  const time = meta.dataTime
  if (time && time.status !== 'disabled') {
    rows.push({
      label: time.kind === 'coverageEnd' ? CARD_TIME_COPY.dataThrough : CARD_TIME_COPY.dataUpdated,
      value: time.status === 'error'
        ? CARD_TIME_COPY.failed
        : time.status === 'ok' && time.value ? formatQueryTime(time.value) : CARD_TIME_COPY.unavailable,
    })
  }
  rows.push({
    label: CARD_TIME_COPY.resultUpdated,
    value: meta.resultGeneratedAt ? formatQueryTime(meta.resultGeneratedAt) : CARD_TIME_COPY.unavailable,
  })
  return rows
}
