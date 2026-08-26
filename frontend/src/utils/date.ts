/*
 * @Author: Chuang
 * @Date: 2024-01-10 14:13:32
 * @LastEditTime: 2025-07-29 18:01:39
 * @LastEditors: Chuang
 * @Description: 日期时间计算、配置
 */
import dayjs from 'dayjs'
import weekday from 'dayjs/plugin/weekday'
import { showNotify } from '@/utils'
import 'dayjs/locale/zh-cn'

// 每周第一天设置 为周一
dayjs.extend(weekday)
dayjs.locale('zh-cn')

/**
 * 时间戳格式化
 * @param timeMs 13位时间戳字符串
 * @param format
 * @returns
 */
export function formatTimeMs(timeMs: string | number, format = 'YYYY-MM-DD HH:mm:ss'): string {
  return dayjs(timeMs).format(format)
}

/**
 * 时间戳相对时间格式化
 * @param timeMs 13位时间戳字符串
 * @returns
 */
export function formatTimeMsDiff(timeMs: string | number): string {
  const d = new Date(+timeMs)
  const now = Date.now()
  const diff = (now - d.getTime()) / 1000
  if (diff < 30)
    return '刚刚'
  else if (diff < 3600)
    return `${Math.floor(diff / 60)}分钟前`
  else if (diff < 3600 * 24)
    return `${Math.floor(diff / 3600)}小时前`
  else if (diff < 3600 * 24 * 31)
    return `${Math.floor(diff / 86400)}天前`
  else
    return formatTimeMs(timeMs, 'YYYY-MM-DD')
}

/**
 * elementPlus dateRange 常用快捷项
 * @returns
 */
export const epDateRangeShortcuts = [
  {
    text: '今天',
    value: () => {
      const date = dayjs()
      const start = date.startOf('date').toDate()
      return [start, date.toDate()]
    },
  },
  {
    text: '昨天',
    value: () => {
      const date = dayjs().subtract(1, 'day')
      const end = date.endOf('date').toDate()
      const start = date.startOf('date').toDate()
      return [start, end]
    },
  },
  {
    text: '前天',
    value: () => {
      const date = dayjs().subtract(2, 'day')
      const end = date.endOf('date').toDate()
      const start = date.startOf('date').toDate()
      return [start, end]
    },
  },
  {
    text: '近7天',
    value: () => {
      const end = new Date()
      const start = dayjs().subtract(6, 'day').startOf('date').toDate()
      return [start, end]
    },
  },
  {
    text: '近30天',
    value: () => {
      const end = new Date()
      const start = dayjs().subtract(29, 'day').startOf('date').toDate()
      return [start, end]
    },
  },
  {
    text: '本周',
    value: () => {
      const end = dayjs()
      const start = end.startOf('week')
      return [start.toDate(), end.toDate()]
    },
  },
  {
    text: '上周',
    value: () => {
      const date = dayjs().subtract(1, 'week')
      const start = date.startOf('week')
      const end = date.endOf('week')
      return [start.toDate(), end.toDate()]
    },
  },
  {
    text: '本月',
    value: () => {
      const end = dayjs()
      const start = end.startOf('month')
      return [start.toDate(), end.toDate()]
    },
  },
  {
    text: '上月',
    value: () => {
      const date = dayjs().subtract(1, 'month')
      const start = date.startOf('month')
      const end = date.endOf('month')
      return [start.toDate(), end.toDate()]
    },
  },
  {
    text: '今年',
    value: () => {
      const end = dayjs()
      const start = end.startOf('year')
      return [start.toDate(), end.toDate()]
    },
  },
]

export function loginNotify() {
  const hour = new Date().getHours()
  const thisTime
    = hour < 8
      ? '早上好'
      : hour <= 11
        ? '上午好'
        : hour <= 13
          ? '中午好'
          : hour < 18
            ? '下午好'
            : '晚上好'
  showNotify(`${thisTime}！`, `欢迎登录${import.meta.env.VITE_APP_TITLE}`)
}
