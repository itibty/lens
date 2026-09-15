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
