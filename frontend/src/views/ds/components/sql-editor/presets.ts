/*
 * 业务侧可复用的 Enjoy 词表预设（编辑器 props 不内置默认值，由调用方传入）
 */
import type { EnjoyConstantItem, EnjoyMethodItem } from './enjoyVocab'

export const ENJOY_CONSTANTS_PRESET: EnjoyConstantItem[] = [
  { label: 'NOW_TS', detail: '13位时间戳', boost: 10 },
  { label: 'NOW_DT', detail: 'yyyy-MM-dd HH:mm:ss', boost: 9 },
  { label: 'USER_ID', detail: '当前用户ID', boost: 9 },
]

export const ENJOY_METHODS_PRESET: EnjoyMethodItem[] = [
  { label: 'kit.isBlank', detail: '是否为空', apply: 'kit.isBlank()', boost: 8 },
  { label: 'kit.notBlank', detail: '是否不为空', apply: 'kit.notBlank()', boost: 8 },
]
