import type { Component } from 'vue'
import type { ChartCaps, ChartDefaultConfig } from '@/views/vis/shared/chartOptions'
import type { ChartType, VisVisualConfig } from '@/views/vis/shared/types'

/** 选择器按用途分组 */
export type ChartPickerGroup
  = | 'metric'
    | 'compare'
    | 'trend'
    | 'compose'
    | 'relate'
    | 'table'
    | 'other'

export const CHART_PICKER_GROUPS: Array<{ id: ChartPickerGroup, label: string }> = [
  { id: 'metric', label: '指标' },
  { id: 'compare', label: '对比' },
  { id: 'trend', label: '趋势' },
  { id: 'compose', label: '构成' },
  { id: 'relate', label: '关系' },
  { id: 'table', label: '表格' },
  { id: 'other', label: '其他' },
]

/** 单种图表的注册定义（扩展时加一条即可） */
export interface ChartDefinition {
  type: ChartType
  label: string
  /** 选择器分组；组内再按 order */
  group: ChartPickerGroup
  /** 选择器旁的用途说明，一两句说清何时用 */
  summary: string
  /** 组内排序，越小越靠前 */
  order: number
  /** 相对公共能力的覆盖（未写的项用 COMMON_CHART_CAPS） */
  caps?: Partial<ChartCaps>
  /** 相对公共默认的覆盖（未写的项用 COMMON_CHART_DEFAULTS） */
  defaults?: Partial<ChartDefaultConfig>
  /**
   * 功能配置表单（通用、格式、交互等）。
   * 约定 props：`visual`（v-model:visual → VisVisualConfig）
   */
  FeatureForm?: Component
  /**
   * 样式配置表单（卡片、配色、尺寸等）。
   * 约定 props：`visual`（v-model:visual → VisVisualConfig）
   */
  StyleForm?: Component
}

export type { VisVisualConfig }

export type { ChartType }
