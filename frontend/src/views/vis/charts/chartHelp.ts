import type { ChartType } from './catalog'

/** 卡片设计器文案：常驻约束、模块 hover 提示，以及相关功能设置提示。 */
export interface ChartShelfTips {
  dimensions: string
  metrics: string
  rowDimensions: string
  colDimensions: string
}

interface ChartHelp {
  constraints: readonly string[]
  /** 只填写有专属含义的模块；其余使用通用提示。 */
  shelfTips?: Partial<ChartShelfTips>
}

export const DEFAULT_SHELF_TIPS: ChartShelfTips = {
  dimensions: '按维度分组展示数据',
  metrics: '用于数据汇总与计算',
  rowDimensions: '按行分组展示数据',
  colDimensions: '按列分组展示数据',
}

export const CHART_HELP_QUERY_TIPS = {
  filters: '各条件组需同时满足。\n组内可切换“且 / 或”：且为全部满足，或为任一满足。',
  having: '按条件筛选汇总结果',
  pivotHaving: '只过滤最细交叉格；小计、总计仍按筛选后的全部数据汇总',
  pivotOrder: '按排序结果排列行和列，未设置时按维度值升序排列',
  params: '设置数据集查询参数',
} as const

export const QUERY_SETTINGS_COPY = {
  asOfDate: {
    label: '日期基准',
    tip: '用于计算相对日期和同比 / 环比期间，留空使用今天',
    placeholder: '选择日期',
  },
  limit: {
    label: '最多行数',
    tip: '限制返回的结果行数，留空使用系统默认上限',
    clear: '清空最多行数',
  },
} as const

export const FEATURE_FORM_COPY = {
  addMetric: '添加指标',
  tooltip: '悬浮提示',
  maxRows: '最多行数',
  percentDecimals: '完成率小数位',
  values: '数值',
} as const

/** 输入框只提示输入内容；仅为不易理解的配置保留 info 说明。 */
export const CARD_INPUT_PLACEHOLDERS = {
  title: '输入标题',
  description: '输入描述',
  note: '输入备注',
  displayName: '输入显示名',
  formula: '输入计算公式',
  dateField: '选择日期字段',
  timeGrain: '选择时间粒度',
  paramName: '选择或输入参数名',
  paramValue: '输入参数值',
  prefix: '输入前缀',
  suffix: '输入后缀',
  target: '输入目标值',
  number: '输入数值',
  label: '输入标签',
  shapeText: '输入轮廓文字',
  series: '选择系列',
  noSeries: '暂无可选系列',
  color: '十六进制色值',
  url: '输入网址',
  text: '输入说明',
  richtext: '输入正文，/ 插入内容',
  multipleValues: '输入后回车',
  multipleNumbers: '输入数值后回车',
} as const

export const CARD_INPUT_TIPS = {
  timeGrain: '留空保留原始日期',
  shapeText: '词云按文字轮廓排列，留空铺满绘图区',
} as const

export const FILTER_GROUP_COPY = {
  combine: {
    and: '且',
    or: '或',
  },
  toggle: '点击切换且/或',
  between: '且',
  remove: '删除条件组',
  add: '添加条件组',
  empty: '从左侧拖入字段',
} as const

export const CHART_HELP_EMPTY_HINTS = {
  order: '选择已配置的维度或指标',
  orderPrerequisite: '请先配置维度或指标',
  having: '选择已配置的指标',
  havingPrerequisite: '请先配置汇总指标',
  detailOrder: '选择已配置的明细字段',
  detailOrderPrerequisite: '请先配置明细字段',
} as const

const TARGET_METRIC_TIP = '第 1 个指标为当前值，第 2 个为目标值。\n只有 1 个指标时，需在「功能设置 → 进度」中填写固定目标。'

export const CHART_HELP: Record<ChartType, ChartHelp> = {
  bar: {
    constraints: ['1～2 个维度，至少 1 个指标', '2 个维度时，只能添加 1 个指标'],
  },
  line: {
    constraints: ['1～2 个维度，至少 1 个指标', '2 个维度时，只能添加 1 个指标'],
  },
  combo: {
    constraints: ['1 个维度，至少 2 个指标'],
  },
  pie: {
    constraints: ['1 个维度，1 个指标'],
  },
  scatter: {
    constraints: ['0～1 个维度，2 个指标'],
    shelfTips: {
      metrics: '第 1 个指标对应横轴，第 2 个对应纵轴，可拖动调整顺序。',
    },
  },
  table: {
    constraints: ['至少添加 1 个维度或指标', '有日期维度时，不支持同比 / 环比'],
  },
  number: {
    constraints: ['0 个维度，至少 1 个指标'],
    shelfTips: {
      dimensions: '指标卡不支持维度',
      metrics: '第 1 个指标作为主指标，其余作为辅指标',
    },
  },
  progress: {
    constraints: ['0 个维度，1～2 个指标', '需配置目标值'],
    shelfTips: {
      dimensions: '进度条不支持维度',
      metrics: TARGET_METRIC_TIP,
    },
  },
  kpi: {
    constraints: ['1 个维度，1～2 个指标', '需配置目标值'],
    shelfTips: { metrics: TARGET_METRIC_TIP },
  },
  radar: {
    constraints: ['1 个维度，至少 1 个指标'],
  },
  funnel: {
    constraints: ['1 个维度，1 个指标'],
  },
  wordcloud: {
    constraints: ['1 个维度，1 个指标'],
  },
  heatmap: {
    constraints: ['2 个维度，1 个指标'],
    shelfTips: {
      dimensions: '第 1 个维度对应横轴，第 2 个对应纵轴，可拖动调整顺序。',
    },
  },
  treemap: {
    constraints: ['1～3 个维度，1 个指标'],
    shelfTips: {
      dimensions: '维度按顺序表示从外到内的层级，可拖动调整顺序。',
      metrics: '指标值决定矩形面积，数值越大，面积越大。',
    },
  },
  waterfall: {
    constraints: ['1 个维度，1 个指标'],
    shelfTips: { metrics: '正值表示增加，负值表示减少。' },
  },
  trend: {
    constraints: ['1 个维度，至少 1 个指标'],
    shelfTips: {
      dimensions: '建议使用日期字段。数据按维度值升序展示。',
      metrics: '第 1 个指标作为主指标，其余作为辅指标。\n主值取最后一个有效数据点。\n“较上期”对比最后两个有效数据点，不支持配置同比 / 环比。',
    },
  },
  tornado: {
    constraints: ['1 个维度，2 个指标'],
    shelfTips: {
      metrics: '第 1 个指标显示在左侧，第 2 个显示在右侧，可拖动调整顺序。',
    },
  },
  rank: {
    constraints: ['1 个维度，1 个指标'],
    shelfTips: { metrics: '按指标值从大到小排列。' },
  },
  richtext: {
    constraints: ['至少填写正文或添加 1 个内容模块'],
  },
  url: {
    constraints: ['填写以 http:// 或 https:// 开头的有效网址'],
  },
  pivot: {
    constraints: ['至少 1 个指标', '同一字段不能同时用于行维和列维'],
  },
}

export const CHART_HELP_FALLBACK = ['请至少添加维度或指标'] as const

export const CARD_PREVIEW_COPY = {
  idle: '完善配置后显示预览',
  loading: '正在加载预览',
} as const

export const CHART_HELP_FEATURE_TIPS = {
  percentDecimals: '设置完成率的小数位数',
  lineFields: '以折线展示所选指标，默认选择最后一个指标',
  waterfallTotal: '在图表末尾显示累计总值',
  fixedTarget: '使用固定数值作为目标值，需大于 0',
  progressValues: '显示当前值与目标值',
  compactNumber: '以万、亿为单位显示较大数值',
  cellProgress: '在单元格中显示进度条，100 表示满格',
  detailFields: '展示当前筛选范围内的原始明细记录',
} as const

export function getChartShelfTips(chartType: ChartType): ChartShelfTips {
  return { ...DEFAULT_SHELF_TIPS, ...CHART_HELP[chartType].shelfTips }
}
