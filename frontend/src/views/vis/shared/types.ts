import type { ChartType } from '@/views/vis/charts/catalog'
import { isPivotChart, resolveChartTypeCode } from '@/views/vis/charts/catalog'

export type { ChartType, VisStageMode } from '@/views/vis/charts/catalog'
export {
  allowsFullscreen,
  API_CHART_TYPES,
  hidesQueryDimensions,
  isHeatmapChart,
  isKpiChart,
  isNumberChart,
  isNumberStyleChart,
  isPivotChart,
  isProgressChart,
  isRankChart,
  isStaticChart,
  isTrendChart,
  isVChartType,
  needsDataset,
  NO_FULLSCREEN_CHART_TYPES,
  resolveChartTypeCode,
  resolveVisStage,
  STATIC_CHART_TYPES,
  usesChartTheme,
} from '@/views/vis/charts/catalog'

/** 几何图系列色 / 热力连续色带 / 表格配色；不写 = 官方默认 */
export type VisChartThemeId
  = | 'DEFAULT'
    | 'CONTRAST'
    | 'COLORBLIND'
    | 'GRADIENT'
    | 'WARM_GRADIENT'

export type VisChartLegendPosition = 'top' | 'bottom' | 'left' | 'right'
export type VisChartOrientation = 'vertical' | 'horizontal'

/**
 * 几何图展示设置（挂在 visual.chart；产品语义，渲染侧译成 VChart）。
 * 字段均可缺省，未写 = 当前类型默认。
 */
export interface VisChartOptions {
  /** 图例；饼 / 热力默认开，漏斗 / 词云 / 矩形树图默认关，其余有系列才开 */
  legend?: boolean
  /** 图例位置；默认 bottom */
  legendPosition?: VisChartLegendPosition
  /** 悬停提示；默认开 */
  tooltip?: boolean
  /** 数据标签；饼 / 漏斗默认开，其余默认关 */
  dataLabel?: boolean
  /** 柱 / 折线：堆叠；默认关，无系列时不生效 */
  stacked?: boolean
  /** 柱：百分比堆叠；仅堆叠时生效，默认关 */
  percent?: boolean
  /** 柱：方向；默认 vertical */
  orientation?: VisChartOrientation
  /** 折线 / 雷达：面积填充；雷达默认开，折线默认关 */
  area?: boolean
  /** 折线：平滑；默认关 */
  smooth?: boolean
  /** 饼：圆环；默认关 */
  donut?: boolean
  /** 饼：圆环中心指标卡；仅圆环时生效，默认开 */
  centerText?: boolean
  /** 词云：随机角度；默认关，开则 0° / 90° 随机 */
  randomRotate?: boolean
  /** 词云：文字轮廓；不写则铺满 */
  shapeText?: string
  /** 漏斗：相邻阶段转化；默认关 */
  showRate?: boolean
  /** 柱 / 折线：类目轴滚动条；默认关，类目过密才出现 */
  scrollbar?: boolean
  /** 柱 / 线 / 组合 / 散点：十字辅助线；默认关 */
  crosshair?: boolean
  /** 柱 / 线 / 组合：副数值轴；组合默认开，其余默认关；至少 2 个指标才生效 */
  dualAxis?: boolean
  /** 上副轴的指标别名；不写 = 最后一个指标；组合不写 = 折线指标 */
  secondaryFields?: string[]
  /** 组合图：画折线的指标别名；不写 = 最后一个指标 */
  lineFields?: string[]
  /** 标记线；空则不画；最多 3 条 */
  markLines?: VisMarkLine[]
  /** 瀑布图：末项追加合计；默认开，关着才落库 */
  waterfallTotal?: boolean
}

export type VisMarkLineKind = 'fixed' | 'avg' | 'min' | 'max'

/** 数值轴参照线（目标 / 警戒 / 统计）；不写 field = 主轴第一个指标 */
export interface VisMarkLine {
  kind: VisMarkLineKind
  /** 仅 fixed */
  value?: number
  /** 指标别名；不写 = 柱/折/组合第一个，散点纵轴 */
  field?: string
  /** 不写：固定值用数字，统计用「平均 / 最大 / 最小」 */
  label?: string
}

/** 数据标注样式（未填的项保持主题） */
export interface VisTableMarkStyle {
  color?: string
  bgColor?: string
  bold?: boolean
  italic?: boolean
}

/** 标注条件：整行取值；日期快捷用 valueExp，字面量用 op */
export interface VisTableMarkFilter {
  field: string
  op?: VIS.FilterItem['op']
  value?: unknown[]
  valueExp?: VIS.FilterItem['valueExp']
}

/** 一条标注：标记字段 + 条件组 + 样式 */
export interface VisTableMarkRule {
  fields: string[]
  combineOp?: 'and' | 'or'
  filters?: VisTableMarkFilter[]
  style?: VisTableMarkStyle
}

/** 透视合计位置：开头（上 / 左）或末尾（下 / 右）；默认 end */
export type VisPivotPlace = 'start' | 'end'

/** 表格 / 透视展示设置（挂在 visual.table；字段均可缺省，渲染侧填默认） */
export interface VisTableStyle {
  /** 列头排序；默认 true，仅普通表格读取 */
  sortable?: boolean
  /** 列头过滤；默认 false，仅普通表格读取 */
  showFilter?: boolean
  /** 斑马纹；默认 false */
  striped?: boolean
  /** 行序号；默认 false，仅普通表格读取 */
  showRowNumber?: boolean
  /** 相邻相同值合并；默认 false，仅普通表格读取 */
  mergeCell?: boolean
  /** 行维树形；默认 false，仅透视读取 */
  treeDisplay?: boolean
  /** 指标列排序；默认 false，仅透视读取 */
  sortColumn?: boolean
  /** 行总计：顶部 / 底部；默认 end */
  rowTotalPlace?: VisPivotPlace
  /** 列总计：左侧 / 右侧；默认 end */
  columnTotalPlace?: VisPivotPlace
  /** 行小计：组前 / 组后；默认 end；树形时小计在父行，此项无效 */
  rowSubtotalPlace?: VisPivotPlace
  /** 列小计：组左 / 组右；默认 end */
  columnSubtotalPlace?: VisPivotPlace
  /** 数据标注；空则不涂色 */
  marks?: VisTableMarkRule[]
}

/** 文本卡模块：富文本 / 数字 / 数字组 / 进度条 / 提示条 */
export type VisStaticModuleType = 'richtext' | 'stat' | 'stats' | 'progress' | 'callout'

export type VisCalloutTone = 'info' | 'warning' | 'success'

export interface VisRichtextModule {
  type: 'richtext'
  html?: string
  /** 仅编辑器内存用，不落库 */
  _uid?: string
}

export interface VisStatItem {
  value: number
  label?: string
  prefix?: string
}

export interface VisStatModule extends VisStatItem {
  type: 'stat'
  /** 仅编辑器内存用，不落库 */
  _uid?: string
}

export interface VisStatsModule {
  type: 'stats'
  items: VisStatItem[]
  /** 仅编辑器内存用，不落库 */
  _uid?: string
}

export interface VisProgressModule {
  type: 'progress'
  current: number
  target: number
  label?: string
  /** 仅编辑器内存用，不落库 */
  _uid?: string
}

export interface VisCalloutModule {
  type: 'callout'
  tone?: VisCalloutTone
  title?: string
  text?: string
  /** 仅编辑器内存用，不落库 */
  _uid?: string
}

export type VisStaticModule
  = | VisRichtextModule
    | VisStatModule
    | VisStatsModule
    | VisProgressModule
    | VisCalloutModule

/** 富文本（挂在 visual.richtext；无需数据集） */
export interface VisRichtextConfig {
  /** 旧正文；读入时迁到 modules */
  html?: string
  modules?: VisStaticModule[]
}

/** 套用网页（挂在 visual.web；无需数据集） */
export interface VisWebConfig {
  url?: string
}

export type VisProgressShape = 'bar' | 'ring' | 'gauge'

/** 指标卡 / 进度条共用的数值格式 */
export type VisNumberDecimals = 'auto' | 0 | 1 | 2

export interface VisNumberFormat {
  /** 小数位；默认 auto */
  decimals?: VisNumberDecimals
  /** 千分位；默认 true；紧凑数量级开启时不生效 */
  separator?: boolean
  /** 前缀，如 ¥；默认空 */
  prefix?: string
  /** 后缀，如 %、元；默认空 */
  suffix?: string
  /** 紧凑万/亿；默认 false */
  compact?: boolean
}

/** 功能设置「格式」一条；只写覆盖，没写走产品默认 */
export interface VisFieldStyleRule {
  /** 投放胶囊 _uid，跟着改名 */
  sourceUid?: string
  /** 指纹 m:field:agg[:contrast] */
  key: string
  kind: 'metric'
  format?: VisNumberFormat
}

export type VisProgressSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'

export type VisKpiPeriodMode = 'month' | 'quarter' | 'year' | 'custom'

/** 目标进度（挂在 visual.kpi；按维看完成率，对照时间进度） */
export interface VisKpiOptions extends VisNumberFormat {
  /** 固定目标；有第 2 个指标时不读 */
  target?: number
  /** 百分比；默认 true */
  showPercent?: boolean
  /** 当前 / 目标数值；默认 true */
  showValue?: boolean
  /** 完成率小数位；默认 auto */
  percentDecimals?: VisNumberDecimals
  /** 进度条颜色；空 = 主题主色 */
  color?: string
  /** 轨道颜色；空 = 浅底 */
  trackColor?: string
  /** 条高与条内完成率；默认 md。行名字号不跟此项走 */
  size?: VisProgressSize
  /** 期限；不写则不画时间线 */
  periodMode?: VisKpiPeriodMode
  /** 自定义期限起（YYYY-MM-DD） */
  periodStart?: string
  /** 自定义期限止（YYYY-MM-DD） */
  periodEnd?: string
}

/** 进度条（挂在 visual.progress；当前 / 目标，字段均可缺省） */
export interface VisProgressOptions extends VisNumberFormat {
  /** 形态；默认 bar。gauge = 上大半环 */
  shape?: VisProgressShape
  /** 固定目标；有第 2 个指标时不读 */
  target?: number
  /** 百分比；默认 true */
  showPercent?: boolean
  /** 当前 / 目标数值；默认 true */
  showValue?: boolean
  /** 当前值指标名；默认 false */
  showLabel?: boolean
  /** 完成率小数位；默认 auto（最多 1 位） */
  percentDecimals?: VisNumberDecimals
  /** 进度条颜色；空 = 主题主色 */
  color?: string
  /** 轨道颜色；空 = 浅底 */
  trackColor?: string
}

/** 趋势卡（挂在 visual.trend；数字样式仍走 visual.number） */
export interface VisTrendOptions {
  /** 迷你走势；默认开 */
  showSparkline?: boolean
  /** 相对上一期；默认开 */
  showChange?: boolean
}

/** 排行榜（挂在 visual.rank） */
export interface VisRankOptions extends VisNumberFormat {
  /** 名次；默认开 */
  showRank?: boolean
  /** 数值；默认开 */
  showValue?: boolean
  /** 占总计占比；默认关 */
  showPercent?: boolean
  /** 占比条；默认开 */
  showBar?: boolean
  /** 条颜色；空 = 主题主色 */
  color?: string
  /** 行高与字号；默认 md */
  size?: VisProgressSize
}

/** 指标卡样式（挂在 visual.number；字段均可缺省，渲染侧填默认） */
export interface VisNumberStyle extends VisNumberFormat {
  /** 是否展示主指标名称；默认 false */
  showLabel?: boolean
  /** 是否展示同环比 / 辅指标名称；默认 false */
  showAuxLabel?: boolean
  /** 主值文字色；空 = 卡片内容色 / 默认 */
  color?: string
}

/**
 * 本地视觉配置。
 * 普通查询 body.visual 只读 chartType；透视另带合计开关。完整样式写入 visualJson。
 */
export interface VisVisualConfig {
  chartType: ChartType
  /** 是否展示左上角标题；默认不展示，开了且未填则用卡片名称 */
  showTitle?: boolean
  /** 自定义标题；开标题且为空时用卡片名称 */
  title?: string
  /** 是否展示备注；默认不展示，与标题开关独立 */
  showDescription?: boolean
  /** 功能设置备注；开备注且为空时用卡片描述 */
  description?: string
  /** 允许查看构成行；默认关，关着不落库 */
  allowDetail?: boolean
  /** 允许下载数据；默认关，关着不落库 */
  allowDownload?: boolean
  /** 自动刷新间隔（秒）；不写 = 关；仅查询类卡片 */
  autoRefreshSec?: number
  /** 卡片背景；空 = 跟随默认（日后看板主题） */
  cardBg?: string
  /** 卡片内容色；空 = 跟随默认（日后看板主题） */
  cardColor?: string
  /** 几何图系列色、表格 / 透视配色；默认不写 */
  chartTheme?: VisChartThemeId
  /** 按投放指标覆盖的显示格式 */
  fieldStyles?: VisFieldStyleRule[]
  /** 指标卡专属样式 */
  number?: VisNumberStyle
  /** 趋势卡：走势 / 较上期 */
  trend?: VisTrendOptions
  /** 排行榜专属设置 */
  rank?: VisRankOptions
  /** 进度条专属设置 */
  progress?: VisProgressOptions
  /** 目标进度专属设置 */
  kpi?: VisKpiOptions
  /** 表格专属展示设置 */
  table?: VisTableStyle
  /** 几何图专属展示设置 */
  chart?: VisChartOptions
  /** 富文本正文 */
  richtext?: VisRichtextConfig
  /** 套用网页 */
  web?: VisWebConfig
  /** 透视：行小计（至少 2 个行维才生效） */
  rowSubtotal?: boolean
  /** 透视：行总计 */
  rowTotal?: boolean
  /** 透视：列小计（至少 2 个列维才生效） */
  columnSubtotal?: boolean
  /** 透视：列总计 */
  columnTotal?: boolean
}

/** 设计器查询：普通图用 dimensions，透视用 row/col */
export type VisQueryConfig = VIS.QueryConfig & {
  rowDimensions?: VIS.DimensionItem[]
  colDimensions?: VIS.DimensionItem[]
}

export function toApiChartType(chartType?: string): string {
  return resolveChartTypeCode(chartType) ?? 'table'
}

export function fromApiChartType(raw?: string): ChartType {
  return resolveChartTypeCode(raw) ?? 'table'
}

/** 设计器 visual → 查询 body.visual */
export function toApiVisual(visual: VisVisualConfig): Record<string, any> {
  const next: Record<string, any> = {
    chartType: toApiChartType(visual.chartType),
  }
  if (!isPivotChart(visual.chartType))
    return next
  if (visual.rowSubtotal)
    next.rowSubtotal = true
  if (visual.rowTotal)
    next.rowTotal = true
  if (visual.columnSubtotal)
    next.columnSubtotal = true
  if (visual.columnTotal)
    next.columnTotal = true
  return next
}

/** 可视化卡片（设计器实体） */
export interface VisCard {
  id: string
  name: string
  desc?: string
  updatedAt: string
  status?: 'EBL' | 'DBL'
  query: VisQueryConfig
  visual: VisVisualConfig
}

/** 数据集字段可选类型（与后端字段元数据对齐） */
export type DatasetFieldDataType
  = | 'string'
    | 'number'
    | 'date'
    | 'datetime'
    | 'timestamp'

export const DATA_TYPE_LABELS: Record<DatasetFieldDataType, string> = {
  string: '字符串',
  number: '数字',
  date: '日期',
  datetime: '日期时间',
  timestamp: '时间戳',
}

export const DATA_TYPE_OPTIONS: Array<{ label: string, value: DatasetFieldDataType }>
  = (Object.keys(DATA_TYPE_LABELS) as DatasetFieldDataType[]).map(value => ({
    value,
    label: DATA_TYPE_LABELS[value],
  }))

export const DATA_TYPE_ICONS: Record<DatasetFieldDataType, string> = {
  string: 'i-mingcute-font-size-line',
  number: 'i-mingcute-hashtag-line',
  date: 'i-mingcute-calendar-line',
  datetime: 'i-mingcute-time-line',
  timestamp: 'i-mingcute-stopwatch-line',
}

const UNKNOWN_TYPE_ICON = 'i-mingcute-question-line'

export type DatasetFieldRole = 'DIMENSION' | 'METRIC'

/** dataset ≈ sqlId：字段清单（dataType 可后续补齐） */
export interface DatasetField {
  field: string
  label?: string
  dataType?: DatasetFieldDataType
  suggestRole?: DatasetFieldRole
  remark?: string
}

export function isDateField(dataType?: DatasetFieldDataType) {
  return dataType === 'date' || dataType === 'datetime'
}

export function dataTypeLabel(dataType?: string) {
  if (!dataType)
    return '未知'
  return DATA_TYPE_LABELS[dataType as DatasetFieldDataType] || dataType
}

export function dataTypeIcon(dataType?: string) {
  if (dataType && dataType in DATA_TYPE_ICONS)
    return DATA_TYPE_ICONS[dataType as DatasetFieldDataType]
  return UNKNOWN_TYPE_ICON
}

export const AGG_OPTIONS: Array<{ label: string, value: NonNullable<VIS.MetricItem['agg']> }> = [
  { label: '求和', value: 'SUM' },
  { label: '计数', value: 'COUNT' },
  { label: '平均', value: 'AVG' },
  { label: '最小', value: 'MIN' },
  { label: '最大', value: 'MAX' },
  { label: '去重计数', value: 'COUNT_DISTINCT' },
]

/** 拖入指标区时的默认汇总 */
export const DEFAULT_METRIC_AGG: NonNullable<VIS.MetricItem['agg']> = 'SUM'

export function aggLabel(agg?: string) {
  return AGG_OPTIONS.find(item => item.value === agg)?.label || agg || ''
}

export const TIME_GRAIN_OPTIONS: Array<{ label: string, value: NonNullable<VIS.DimensionItem['timeGrain']> }> = [
  { label: '日', value: 'day' },
  { label: '周', value: 'week' },
  { label: '月', value: 'month' },
  { label: '年', value: 'year' },
]

export const CONTRAST_METHOD_OPTIONS: Array<{ label: string, value: VIS.ContrastConfig['calcMethod'] }> = [
  { label: '按日平移', value: 'shift_day' },
  { label: '按周平移', value: 'shift_week' },
  { label: '按月平移', value: 'shift_month' },
  { label: '按年平移', value: 'shift_year' },
  { label: '按当前窗长平移', value: 'shift_period' },
]

export const CONTRAST_CALC_TYPE_OPTIONS: Array<{ label: string, value: VIS.ContrastConfig['calcType'] }> = [
  { label: '差值', value: 'diff' },
  { label: '差值率', value: 'diffRate' },
]

export function createEmptyCard(): Omit<VisCard, 'id' | 'updatedAt'> {
  return {
    name: '未命名卡片',
    desc: '',
    status: 'EBL',
    query: {
      datasetId: '',
      dimensions: [],
      metrics: [],
      filters: [],
      havingFilters: [],
      orderList: [],
      params: [],
    },
    visual: {
      chartType: 'table',
      showTitle: true,
    },
  }
}

export function metricAlias(metric: VIS.MetricItem): string {
  return metric.label || metric.field
}

/** 未开同比 / 环比的指标（几何图、进度条、目标进度、形状校验共用） */
export function regularMetrics(metrics: VIS.MetricItem[] | undefined) {
  return (metrics ?? []).filter(metric => !metric.contrast)
}

export function dimensionAlias(dim: VIS.DimensionItem): string {
  return dim.label || dim.field
}
