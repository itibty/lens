import dayjs from 'dayjs'

export const subscriptionWeekdayOptions = [
  { label: '周一', value: 1 },
  { label: '周二', value: 2 },
  { label: '周三', value: 3 },
  { label: '周四', value: 4 },
  { label: '周五', value: 5 },
  { label: '周六', value: 6 },
  { label: '周日', value: 7 },
]

export function formatSubscriptionFireAt(value?: string | number | null, fallback = '待计算') {
  if (value === undefined || value === null || String(value).trim() === '')
    return fallback
  const timestamp = Number(value)
  const date = dayjs(timestamp)
  return Number.isFinite(timestamp) && date.isValid() ? date.format('YYYY-MM-DD HH:mm:ss') : fallback
}

export function subscriptionErrorMessage(error: unknown, fallback: string) {
  if (error && typeof error === 'object') {
    const { msg, message } = error as { msg?: unknown, message?: unknown }
    for (const value of [msg, message]) {
      if (typeof value === 'string' && value.trim())
        return value
    }
  }
  return fallback
}

export function isSubscriptionRunPending(status?: string) {
  return status === 'QUEUED' || status === 'RUNNING'
}

export function subscriptionRunStatusText(info?: { lastRunStatus?: string, lastErrorMessage?: string }) {
  if (info?.lastRunStatus === 'SUCCESS')
    return '上次成功'
  if (info?.lastRunStatus === 'FAILED')
    return '上次失败'
  if (info?.lastRunStatus === 'QUEUED')
    return '等待发送'
  if (info?.lastRunStatus === 'SKIPPED')
    return '已跳过'
  if (info?.lastRunStatus === 'RUNNING')
    return '发送中'
  return '尚未发送'
}

export function subscriptionScheduleLabel(row?: VIS.DashboardSubscriptionInfo) {
  const time = row?.schedule?.time || '--:--'
  if (row?.scheduleType === 'WEEKDAY')
    return `周一至周五 ${time}`
  if (row?.scheduleType === 'WEEKLY') {
    const day = subscriptionWeekdayOptions.find(item => item.value === row?.schedule?.dayOfWeek)?.label || '（未设置星期）'
    return `每${day} ${time}`
  }
  if (row?.scheduleType === 'MONTHLY')
    return `每月${row?.schedule?.dayOfMonth || 1}日 ${time}`
  return `每天 ${time}`
}

export function subscriptionTriggerLabel(triggerType?: string) {
  return triggerType === 'MANUAL' ? '测试' : triggerType === 'SCHEDULED' ? '定时' : '—'
}

export function subscriptionRunStatusTagType(runStatus?: string) {
  if (runStatus === 'SUCCESS')
    return 'success'
  if (runStatus === 'FAILED')
    return 'danger'
  if (runStatus === 'RUNNING' || runStatus === 'QUEUED')
    return 'warning'
  return 'info'
}

export function subscriptionRunStatusLabel(runStatus?: string) {
  if (runStatus === 'SUCCESS')
    return '成功'
  if (runStatus === 'FAILED')
    return '失败'
  if (runStatus === 'QUEUED')
    return '等待发送'
  if (runStatus === 'RUNNING')
    return '发送中'
  if (runStatus === 'SKIPPED')
    return '已跳过'
  return '未知'
}

/** 后端 Long 字节数序列化为字符串。 */
export function formatSubscriptionBytes(value?: string | number | null) {
  if (value === undefined || value === null || String(value).trim() === '')
    return '—'
  const bytes = Number(value)
  if (!Number.isFinite(bytes) || bytes < 0)
    return '—'
  if (bytes < 1024)
    return `${bytes} B`
  if (bytes < 1024 * 1024)
    return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}
