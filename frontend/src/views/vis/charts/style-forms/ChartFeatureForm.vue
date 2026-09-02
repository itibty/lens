<!--
 * @Description: 几何图功能设置（通用 / 展示 / 形态，按类型显隐）
-->
<script setup lang="ts">
import type { ResolvedChartOptions } from '@/views/vis/shared/chartOptions'
import type { VisChartOptions, VisQueryConfig, VisVisualConfig } from '@/views/vis/shared/types'
import {
  CHART_FEATURE_TIPS,
  chartCaps,
  chartHasSeries,
  chartMetricAliases,
  defaultChartOptions,
  normalizeSecondaryFields,
  resolveChartOptions,
  resolveLineFields,
  resolveSecondaryFields,
} from '@/views/vis/shared/chartOptions'
import { MARK_LINE_MAX, sanitizeMarkLines } from '@/views/vis/shared/markLine'
import ChartMarkLineForm from './ChartMarkLineForm.vue'
import { useVisualBranch } from './composables/useVisualBranch'
import StyleFormLabel from './StyleFormLabel.vue'
import StyleFormSection from './StyleFormSection.vue'
import StyleFormShell from './StyleFormShell.vue'
import TitleStyleFields from './TitleStyleFields.vue'

const props = defineProps<{
  query?: VisQueryConfig
}>()

const visual = defineModel<VisVisualConfig>('visual', { required: true })
const branch = useVisualBranch(visual, 'chart')

const chartType = computed(() => visual.value.chartType)
const hasSeries = computed(() => chartHasSeries(chartType.value, props.query))
const caps = computed(() => chartCaps(chartType.value))
const metricAliases = computed(() => chartMetricAliases(props.query))
const canDualAxis = computed(() => caps.value.dualAxis && metricAliases.value.length >= 2)
const canLineMark = computed(() => caps.value.lineMark && metricAliases.value.length >= 2)
const lineFields = computed({
  get: () => resolveLineFields(visual.value, metricAliases.value),
  set: (value: string[]) => {
    const next = normalizeSecondaryFields(value, metricAliases.value)
    const fallback = resolveLineFields({}, metricAliases.value)
    if (next.length === fallback.length && next.every((field, index) => field === fallback[index]))
      branch.clearKey('lineFields')
    else
      branch.patch({ lineFields: next })
  },
})
const barAliases = computed(() => {
  const lines = new Set(lineFields.value)
  return metricAliases.value.filter(field => !lines.has(field))
})

function optField<K extends keyof ResolvedChartOptions>(
  key: K,
  onSet?: (value: ResolvedChartOptions[K]) => void,
) {
  return computed({
    get: () => resolveChartOptions(visual.value, chartType.value, hasSeries.value)[key],
    set: (value: ResolvedChartOptions[K]) => {
      onSet?.(value)
      const fallback = defaultChartOptions(chartType.value, hasSeries.value)[key]
      if (value === fallback)
        branch.clearKey(key as keyof VisChartOptions & string)
      else
        branch.patch({ [key]: value } as Partial<VisChartOptions>)
    },
  })
}

const dualAxis = optField('dualAxis', (value) => {
  if (!value) {
    branch.clearKey('secondaryFields')
  }
  else {
    branch.clearKey('stacked')
    branch.clearKey('percent')
  }
})
const canStack = computed(() =>
  caps.value.stacked
  && !dualAxis.value
  && (canLineMark.value ? barAliases.value.length > 1 : hasSeries.value),
)
const showShape = computed(() =>
  caps.value.orientation
  || canStack.value
  || caps.value.area
  || caps.value.smooth
  || caps.value.donut
  || caps.value.showRate
  || caps.value.randomRotate
  || caps.value.shapeText
  || canDualAxis.value
  || canLineMark.value,
)

const openSections = ref(['common', 'display', 'shape', 'markLine'])
const markLineFormRef = ref<{ addLine: () => void } | null>(null)

const legend = optField('legend')
const legendPosition = optField('legendPosition')
const tooltip = optField('tooltip')
const dataLabel = optField('dataLabel')
const stacked = optField('stacked', (value) => {
  if (!value)
    branch.clearKey('percent')
})
const percent = optField('percent')
const markLineCount = computed(() =>
  sanitizeMarkLines(visual.value.chart?.markLines, metricAliases.value, { keepIncomplete: true }).length,
)
const canMarkLine = computed(() =>
  caps.value.markLine && metricAliases.value.length >= 1 && !percent.value,
)
const waterfallTotal = computed({
  get: () => visual.value.chart?.waterfallTotal !== false,
  set: (value: boolean) => {
    if (value)
      branch.clearKey('waterfallTotal')
    else
      branch.patch({ waterfallTotal: false })
  },
})

function addMarkLine() {
  if (!openSections.value.includes('markLine'))
    openSections.value = [...openSections.value, 'markLine']
  markLineFormRef.value?.addLine()
}
const orientation = optField('orientation')
const area = optField('area')
const smooth = optField('smooth')
const donut = optField('donut', (value) => {
  if (!value)
    branch.clearKey('centerText')
})
const centerText = computed({
  get: () => resolveChartOptions(visual.value, chartType.value, hasSeries.value).centerText,
  set: (value: boolean) => {
    if (value)
      branch.clearKey('centerText')
    else
      branch.patch({ centerText: false })
  },
})
const showRate = optField('showRate')
const scrollbar = optField('scrollbar')
const crosshair = optField('crosshair')
const randomRotate = optField('randomRotate')
const shapeText = computed({
  get: () => visual.value.chart?.shapeText ?? '',
  set: (value: string) => {
    if (!value)
      branch.clearKey('shapeText')
    else
      branch.patch({ shapeText: value })
  },
})
const secondaryFields = computed({
  get: () => resolveSecondaryFields(visual.value, metricAliases.value, chartType.value),
  set: (value: string[]) => {
    const next = normalizeSecondaryFields(value, metricAliases.value)
    const fallback = resolveSecondaryFields(
      { chart: { ...visual.value.chart, secondaryFields: undefined } },
      metricAliases.value,
      chartType.value,
    )
    if (next.length === fallback.length && next.every((field, index) => field === fallback[index]))
      branch.clearKey('secondaryFields')
    else
      branch.patch({ secondaryFields: next })
  },
})
</script>

<template>
  <StyleFormShell v-model="openSections">
    <StyleFormSection
      title="通用"
      name="common"
    >
      <TitleStyleFields v-model:visual="visual" />
    </StyleFormSection>

    <StyleFormSection
      title="展示"
      name="display"
    >
      <div
        v-if="caps.legend"
        class="vis-style-form__row"
      >
        <StyleFormLabel>
          图例
        </StyleFormLabel>
        <el-switch v-model="legend" size="small" />
      </div>

      <div
        v-if="caps.legend && legend"
        class="vis-style-form__row"
      >
        <StyleFormLabel>
          图例位置
        </StyleFormLabel>
        <el-radio-group
          v-model="legendPosition"
          size="small"
          class="vis-style-form__segmented"
        >
          <el-radio-button value="top">
            上
          </el-radio-button>
          <el-radio-button value="bottom">
            下
          </el-radio-button>
          <el-radio-button value="left">
            左
          </el-radio-button>
          <el-radio-button value="right">
            右
          </el-radio-button>
        </el-radio-group>
      </div>

      <div class="vis-style-form__row">
        <StyleFormLabel>
          提示
        </StyleFormLabel>
        <el-switch v-model="tooltip" size="small" />
      </div>

      <div
        v-if="caps.crosshair"
        class="vis-style-form__row"
      >
        <StyleFormLabel :tip="CHART_FEATURE_TIPS.crosshair">
          辅助线
        </StyleFormLabel>
        <el-switch v-model="crosshair" size="small" />
      </div>

      <div
        v-if="caps.dataLabel"
        class="vis-style-form__row"
      >
        <StyleFormLabel :tip="chartType === 'bar' || chartType === 'combo' ? CHART_FEATURE_TIPS.dataLabelBar : undefined">
          数据标签
        </StyleFormLabel>
        <el-switch v-model="dataLabel" size="small" />
      </div>

      <div
        v-if="caps.scrollbar"
        class="vis-style-form__row"
      >
        <StyleFormLabel>
          滚动条
        </StyleFormLabel>
        <el-switch v-model="scrollbar" size="small" />
      </div>
    </StyleFormSection>

    <StyleFormSection
      v-if="showShape"
      title="形态"
      name="shape"
    >
      <div
        v-if="caps.orientation"
        class="vis-style-form__row"
      >
        <StyleFormLabel>
          方向
        </StyleFormLabel>
        <el-radio-group
          v-model="orientation"
          size="small"
          class="vis-style-form__segmented"
        >
          <el-radio-button value="vertical">
            纵向
          </el-radio-button>
          <el-radio-button value="horizontal">
            横向
          </el-radio-button>
        </el-radio-group>
      </div>

      <div
        v-if="chartType === 'waterfall'"
        class="vis-style-form__row"
      >
        <StyleFormLabel :tip="CHART_FEATURE_TIPS.waterfallTotal">
          末项合计
        </StyleFormLabel>
        <el-switch v-model="waterfallTotal" size="small" />
      </div>

      <div
        v-if="canLineMark"
        class="vis-style-form__row"
      >
        <StyleFormLabel :tip="CHART_FEATURE_TIPS.lineFields">
          折线指标
        </StyleFormLabel>
        <el-select
          v-model="lineFields"
          size="small"
          class="vis-style-form__control"
          multiple
          collapse-tags
          collapse-tags-tooltip
          clearable
          placeholder="选择指标"
        >
          <el-option
            v-for="field in metricAliases"
            :key="field"
            :label="field"
            :value="field"
          />
        </el-select>
      </div>

      <div
        v-if="canDualAxis"
        class="vis-style-form__row"
      >
        <StyleFormLabel>
          双轴
        </StyleFormLabel>
        <el-switch v-model="dualAxis" size="small" />
      </div>

      <div
        v-if="canDualAxis && dualAxis"
        class="vis-style-form__row"
      >
        <StyleFormLabel :tip="CHART_FEATURE_TIPS.secondaryFields">
          副轴指标
        </StyleFormLabel>
        <el-select
          v-model="secondaryFields"
          size="small"
          class="vis-style-form__control"
          multiple
          collapse-tags
          collapse-tags-tooltip
          clearable
          placeholder="选择指标"
        >
          <el-option
            v-for="field in metricAliases"
            :key="field"
            :label="field"
            :value="field"
          />
        </el-select>
      </div>

      <div
        v-if="canStack"
        class="vis-style-form__row"
      >
        <StyleFormLabel>
          堆叠
        </StyleFormLabel>
        <el-switch v-model="stacked" size="small" />
      </div>

      <div
        v-if="canStack && stacked && chartType === 'bar'"
        class="vis-style-form__row"
      >
        <StyleFormLabel :tip="CHART_FEATURE_TIPS.percent">
          百分比
        </StyleFormLabel>
        <el-switch v-model="percent" size="small" />
      </div>

      <div
        v-if="caps.area"
        class="vis-style-form__row"
      >
        <StyleFormLabel :tip="chartType === 'radar' ? CHART_FEATURE_TIPS.areaRadar : undefined">
          面积
        </StyleFormLabel>
        <el-switch v-model="area" size="small" />
      </div>

      <div
        v-if="caps.smooth"
        class="vis-style-form__row"
      >
        <StyleFormLabel>
          平滑
        </StyleFormLabel>
        <el-switch v-model="smooth" size="small" />
      </div>

      <div
        v-if="caps.donut"
        class="vis-style-form__row"
      >
        <StyleFormLabel>
          圆环
        </StyleFormLabel>
        <el-switch v-model="donut" size="small" />
      </div>

      <div
        v-if="caps.donut && donut"
        class="vis-style-form__row"
      >
        <StyleFormLabel>
          环指标卡
        </StyleFormLabel>
        <el-switch v-model="centerText" size="small" />
      </div>

      <div
        v-if="caps.showRate"
        class="vis-style-form__row"
      >
        <StyleFormLabel :tip="CHART_FEATURE_TIPS.showRate">
          转化率
        </StyleFormLabel>
        <el-switch v-model="showRate" size="small" />
      </div>

      <div
        v-if="caps.shapeText"
        class="vis-style-form__row"
      >
        <StyleFormLabel>
          轮廓文字
        </StyleFormLabel>
        <el-input
          v-model="shapeText"
          size="small"
          class="vis-style-form__control"
          maxlength="12"
          clearable
          placeholder="空则铺满"
        />
      </div>

      <div
        v-if="caps.randomRotate"
        class="vis-style-form__row"
      >
        <StyleFormLabel>
          随机角度
        </StyleFormLabel>
        <el-switch v-model="randomRotate" size="small" />
      </div>
    </StyleFormSection>

    <StyleFormSection
      v-if="canMarkLine"
      title="标记线"
      name="markLine"
    >
      <template #extra>
        <button
          type="button"
          class="vis-icon-btn"
          title="添加"
          :disabled="markLineCount >= MARK_LINE_MAX"
          @click="addMarkLine"
        >
          <span class="i-mingcute-add-line" />
        </button>
      </template>
      <ChartMarkLineForm
        ref="markLineFormRef"
        v-model:visual="visual"
        :query="query"
      />
    </StyleFormSection>
  </StyleFormShell>
</template>
