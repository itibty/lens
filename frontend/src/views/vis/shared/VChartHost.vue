<!--
 * @Description: vis 卡片图表挂载壳（VChart）
-->
<script setup lang="ts">
import type { ISpec } from '@visactor/vchart'
import VChart, { darkTheme } from '@visactor/vchart'
import { useResizeObserver } from '@vueuse/core'
import { FONT_SANS } from '@/core/fonts'
import { unwrapChartDatum } from '@/views/vis/shared/chartDatum'

const props = withDefaults(defineProps<{
  spec?: ISpec | null
  empty?: boolean
  emptyText?: string
  interactive?: boolean
  /** 明细菜单打开时压住提示，避免盖住菜单 */
  lockTooltip?: boolean
  /** 看板专属暗色 surface；不影响卡片设计页和全局主题 */
  dark?: boolean
}>(), {
  spec: null,
  empty: false,
  emptyText: '暂无数据',
  interactive: false,
  lockTooltip: false,
  dark: false,
})

const emit = defineEmits<{
  markClick: [payload: { datum: Record<string, unknown>, clientX: number, clientY: number }]
}>()

const containerRef = ref<HTMLDivElement>()
const chartWrapRef = ref<HTMLDivElement>()
let chart: VChart | null = null
let lastRemountKey = ''

function specType(spec: ISpec | null | undefined) {
  return spec && 'type' in spec ? String(spec.type) : ''
}

function tooltipVisible(spec: ISpec | null | undefined) {
  if (!spec || !('tooltip' in spec) || spec.tooltip == null)
    return true
  const tooltip = spec.tooltip as { visible?: boolean }
  return tooltip.visible !== false
}

function wrapSize() {
  const wrap = chartWrapRef.value
  const host = containerRef.value
  const width = wrap?.clientWidth || host?.clientWidth || 0
  const height = host?.clientHeight || host?.parentElement?.clientHeight || wrap?.clientHeight || 0
  if (width < 1 || height < 1)
    return null
  return { width, height }
}

function withSize(spec: ISpec, size: { width: number, height: number }): ISpec {
  return { ...spec, width: size.width, height: size.height } as ISpec
}

function specRec(spec: ISpec | null | undefined) {
  if (!spec || typeof spec !== 'object')
    return null
  return spec as unknown as Record<string, unknown>
}

function plainRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {}
}

function darkTextBlock(value: unknown, fill: string) {
  const block = plainRecord(value)
  return {
    ...block,
    style: {
      ...plainRecord(block.style),
      fill,
    },
  }
}

function darkIndicator(value: unknown) {
  const indicator = plainRecord(value)
  return {
    ...indicator,
    title: darkTextBlock(indicator.title, '#F2F5F9'),
    content: Array.isArray(indicator.content)
      ? indicator.content.map(item => darkTextBlock(item, '#9DA9B8'))
      : indicator.content,
  }
}

function withSurfaceTheme(spec: ISpec): ISpec {
  const source = spec as unknown as Record<string, unknown>
  const current = plainRecord(source.theme)
  if (!props.dark) {
    return {
      ...source,
      theme: {
        fontFamily: FONT_SANS,
        ...current,
      },
    } as ISpec
  }
  const base = darkTheme as unknown as Record<string, unknown>
  return {
    ...source,
    ...(source.indicator ? { indicator: darkIndicator(source.indicator) } : {}),
    theme: {
      ...base,
      fontFamily: FONT_SANS,
      ...current,
      component: {
        ...plainRecord(base.component),
        ...plainRecord(current.component),
      },
      series: {
        ...plainRecord(base.series),
        ...plainRecord(current.series),
      },
    },
  } as ISpec
}

function lineCurveType(spec: ISpec | null | undefined) {
  const rec = specRec(spec)
  if (!rec)
    return ''
  const fromLine = (obj: unknown) => {
    if (!obj || typeof obj !== 'object')
      return ''
    const line = (obj as { line?: { style?: { curveType?: string } } }).line
    return line?.style?.curveType ? String(line.style.curveType) : ''
  }
  const list = rec.series
  if (Array.isArray(list) && list[0])
    return fromLine(list[0]) || fromLine(rec)
  return fromLine(rec)
}

function fieldArity(field: unknown) {
  return Array.isArray(field) ? field.length : 1
}

function stackPiece(obj: Record<string, unknown>) {
  return [
    obj.stack === true ? '1' : '0',
    obj.percent === true ? '1' : '0',
    `x${fieldArity(obj.xField)}`,
    `y${fieldArity(obj.yField)}`,
  ].join('')
}

/** 堆叠 / 分组 / 百分比会改 xField 形态和 stack 变换，updateSpec 清不掉旧柱 */
function stackSignature(spec: ISpec | null | undefined) {
  const rec = specRec(spec)
  if (!rec)
    return ''
  const parts = [stackPiece(rec)]
  const list = rec.series
  if (Array.isArray(list)) {
    for (const item of list) {
      if (item && typeof item === 'object')
        parts.push(stackPiece(item as Record<string, unknown>))
    }
  }
  return parts.join('|')
}

function hasComponent(spec: ISpec | null | undefined, key: string) {
  const value = specRec(spec)?.[key]
  return Array.isArray(value) ? value.length > 0 : !!value
}

function markLineKey(spec: ISpec | null | undefined) {
  const value = specRec(spec)?.markLine
  const list = Array.isArray(value) ? value : value ? [value] : []
  if (!list.length)
    return ''
  const axes = list.map((item) => {
    const rec = item && typeof item === 'object' ? item as Record<string, unknown> : {}
    return rec.x != null ? 'x' : 'y'
  }).join('')
  return `m${list.length}${axes}`
}

/** 瀑布图合计走数据变换，updateSpec 拆不掉已生成的合计柱 */
function waterfallTotalKey(spec: ISpec | null | undefined) {
  const rec = specRec(spec)
  if (rec?.type !== 'waterfall')
    return ''
  const total = rec.total
  if (!total || typeof total !== 'object')
    return 'wt-end'
  const type = (total as { type?: string }).type
  return type === 'end' || !type ? 'wt-end' : `wt-${type}`
}

/** 图例名在 theme 上，updateSpec 换不掉英文默认值 */
function waterfallLegendKey(spec: ISpec | null | undefined) {
  const rec = specRec(spec)
  if (rec?.type !== 'waterfall')
    return ''
  const names = (rec.theme as { series?: { waterfall?: { seriesFieldName?: { increase?: string } } } } | undefined)
    ?.series
    ?.waterfall
    ?.seriesFieldName
  return names?.increase || ''
}

/** updateSpec 清不掉的形态变化；新组件开关往这里加一项 */
function remountKey(spec: ISpec | null | undefined) {
  if (!spec)
    return ''
  return [
    specType(spec),
    tooltipVisible(spec) ? '1' : '0',
    lineCurveType(spec),
    stackSignature(spec),
    hasComponent(spec, 'scrollBar') ? 's' : '',
    hasComponent(spec, 'crosshair') ? 'c' : '',
    markLineKey(spec),
    waterfallTotalKey(spec),
    waterfallLegendKey(spec),
  ].join('/')
}

function destroyChart() {
  chart?.release()
  chart = null
  lastRemountKey = ''
}

function createChart(spec: ISpec) {
  const el = chartWrapRef.value
  const size = wrapSize()
  if (!el || !size)
    return
  chart = new VChart(withSize(spec, size), {
    dom: el,
    autoFit: true,
  })
  chart.renderSync()
  chart.resizeSync(size.width, size.height)
  lastRemountKey = remountKey(spec)
  bindEvents()
  if (props.lockTooltip)
    hideTooltip()
}

function pointerPosition(event?: unknown) {
  if (!event || typeof event !== 'object')
    return null
  const rec = event as Record<string, unknown>
  const candidates = [rec, rec.event, rec.nativeEvent, rec.sourceEvent]
  for (const item of candidates) {
    if (!item || typeof item !== 'object')
      continue
    const point = item as { clientX?: number, clientY?: number }
    if (point.clientX != null && point.clientY != null)
      return { clientX: point.clientX, clientY: point.clientY }
  }
  return null
}

function eventDatum(params: { datum?: unknown, item?: unknown, node?: unknown }) {
  const item = params.item as { getDatum?: () => unknown } | undefined
  const node = params.node as { getDatum?: () => unknown } | undefined
  return unwrapChartDatum(params.datum ?? item?.getDatum?.() ?? node?.getDatum?.())
}

function hideTooltip() {
  chart?.hideTooltip()
}

function onTooltipShow() {
  if (props.lockTooltip)
    hideTooltip()
}

function handleClick(params: { datum?: unknown, event?: unknown, item?: unknown, node?: unknown }) {
  const datum = eventDatum(params)
  if (!datum)
    return
  const pos = pointerPosition(params.event)
  if (!pos)
    return
  hideTooltip()
  emit('markClick', {
    datum,
    clientX: pos.clientX,
    clientY: pos.clientY,
  })
}

function bindEvents() {
  if (!chart)
    return
  chart.off('click', handleClick)
  chart.off('tooltipShow', onTooltipShow)
  if (props.interactive)
    chart.on('click', handleClick)
  chart.on('tooltipShow', onTooltipShow)
}

function syncChart() {
  if (props.empty || !props.spec) {
    destroyChart()
    return
  }
  const spec = withSurfaceTheme(props.spec)
  if (!chart) {
    createChart(spec)
    return
  }
  if (remountKey(spec) !== lastRemountKey) {
    destroyChart()
    createChart(spec)
    return
  }
  const size = wrapSize()
  chart.updateSpecSync(size ? withSize(spec, size) : spec)
}

function fitChart() {
  if (props.empty || !props.spec)
    return
  const size = wrapSize()
  if (!size)
    return
  if (!chart) {
    syncChart()
    return
  }
  chart.resizeSync(size.width, size.height)
}

onMounted(() => {
  nextTick(syncChart)
})

watch(
  [() => props.spec, () => props.empty],
  () => {
    nextTick(syncChart)
  },
  { deep: true },
)

watch(
  () => props.interactive,
  () => {
    bindEvents()
  },
)

watch(
  () => props.lockTooltip,
  (locked) => {
    if (locked)
      hideTooltip()
  },
)

watch(
  () => props.dark,
  () => {
    destroyChart()
    nextTick(syncChart)
  },
)

useResizeObserver(containerRef, fitChart)
useResizeObserver(chartWrapRef, fitChart)

onUnmounted(destroyChart)
</script>

<template>
  <div ref="containerRef" class="vis-vchart">
    <div
      v-show="!empty"
      ref="chartWrapRef"
      class="vis-vchart__canvas"
      :class="{ 'is-interactive': interactive }"
    />
    <div
      v-if="empty"
      class="vis-vchart__empty"
    >
      {{ emptyText }}
    </div>
  </div>
</template>

<style scoped lang="scss">
.vis-vchart {
  position: relative;
  flex: 1 1 0;
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 200px;

  &__canvas {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    overflow: hidden;

    &.is-interactive {
      cursor: pointer;
    }
  }

  &__empty {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 13px;
    color: var(--vis-content-color, var(--el-text-color-secondary));
  }
}
</style>
