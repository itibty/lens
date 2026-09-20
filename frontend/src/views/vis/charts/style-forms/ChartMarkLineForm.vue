<!--
 * @Description: 几何图标记线（固定值 / 平均 / 极值）
-->
<script setup lang="ts">
import type { VisMarkLine, VisMarkLineKind, VisMarkLineStyle, VisQueryConfig, VisVisualConfig } from '@/views/vis/shared/types'
import { CARD_INPUT_PLACEHOLDERS } from '@/views/vis/charts/chartHelp'
import { CHART_FEATURE_TIPS, chartMetricAliases } from '@/views/vis/shared/chartOptions'
import { resolveChartSeriesColors } from '@/views/vis/shared/chartPalette'
import {
  defaultMarkLineField,
  MARK_LINE_DEFAULT_STYLE,
  MARK_LINE_KINDS,
  MARK_LINE_MAX,
  sanitizeMarkLines,
} from '@/views/vis/shared/markLine'
import { useVisualBranch } from './composables/useVisualBranch'
import StyleFormLabel from './StyleFormLabel.vue'

const props = defineProps<{
  query?: VisQueryConfig
}>()

const visual = defineModel<VisVisualConfig>('visual', { required: true })
const branch = useVisualBranch(visual, 'chart')

const metricAliases = computed(() => chartMetricAliases(props.query))
const defaultField = computed(() => defaultMarkLineField(visual.value.chartType, metricAliases.value))
const showField = computed(() => metricAliases.value.length > 1)
const lines = computed(() =>
  sanitizeMarkLines(visual.value.chart?.markLines, metricAliases.value, { keepIncomplete: true }),
)

function persist(next: VisMarkLine[]) {
  const cleaned = sanitizeMarkLines(next, metricAliases.value, { keepIncomplete: true })
  if (!cleaned.length)
    branch.clearKey('markLines')
  else
    branch.patch({ markLines: cleaned })
}

function addLine() {
  if (lines.value.length >= MARK_LINE_MAX)
    return
  persist([...lines.value, { kind: 'avg' }])
}

function removeLine(index: number) {
  persist(lines.value.filter((_, itemIndex) => itemIndex !== index))
}

function patchLine(index: number, partial: Partial<VisMarkLine>) {
  persist(lines.value.map((line, itemIndex) => {
    if (itemIndex !== index)
      return line
    const next = { ...line, ...partial }
    if (next.kind !== 'fixed')
      delete next.value
    if (!next.field)
      delete next.field
    if (!next.label)
      delete next.label
    return next
  }))
}

function lineField(line: VisMarkLine) {
  return line.field && metricAliases.value.includes(line.field)
    ? line.field
    : defaultField.value
}

function patchStyle(index: number, key: keyof VisMarkLineStyle, value: unknown) {
  patchLine(index, { style: { ...lines.value[index]?.style, [key]: value } })
}

function setKind(index: number, kind: VisMarkLineKind) {
  patchLine(index, { kind })
}

function setField(index: number, field: string) {
  patchLine(index, { field: field === defaultField.value ? undefined : field })
}

defineExpose({ addLine })
</script>

<template>
  <div
    v-if="!lines.length"
    class="vis-style-form__hint"
  >
    最多 {{ MARK_LINE_MAX }} 条，可标固定值、平均或极值
  </div>

  <div
    v-for="(line, index) in lines"
    :key="index"
    class="vis-feature-rule"
  >
    <div class="vis-feature-rule__head">
      <span class="vis-feature-rule__title">
        标记线 {{ index + 1 }}
      </span>
      <button
        type="button"
        class="vis-icon-btn"
        title="删除"
        @click="removeLine(index)"
      >
        <span class="i-mingcute-close-line" />
      </button>
    </div>

    <div class="vis-style-form__row">
      <StyleFormLabel>
        类型
      </StyleFormLabel>
      <el-select
        :model-value="line.kind"
        size="small"
        class="vis-style-form__control"
        @update:model-value="(value: VisMarkLineKind) => setKind(index, value)"
      >
        <el-option
          v-for="item in MARK_LINE_KINDS"
          :key="item.value"
          :label="item.label"
          :value="item.value"
        />
      </el-select>
    </div>

    <div
      v-if="line.kind === 'fixed'"
      class="vis-style-form__row"
    >
      <StyleFormLabel>
        数值
      </StyleFormLabel>
      <el-input-number
        :model-value="line.value"
        size="small"
        class="vis-style-form__control"
        :controls="false"
        :placeholder="CARD_INPUT_PLACEHOLDERS.number"
        :value-on-clear="undefined"
        @update:model-value="(value: number | undefined) => patchLine(index, { value })"
      />
    </div>

    <div
      v-if="showField"
      class="vis-style-form__row"
    >
      <StyleFormLabel :tip="CHART_FEATURE_TIPS.markLineField">
        对应指标
      </StyleFormLabel>
      <el-select
        :model-value="lineField(line)"
        size="small"
        class="vis-style-form__control"
        @update:model-value="(value: string) => setField(index, value)"
      >
        <el-option
          v-for="field in metricAliases"
          :key="field"
          :label="field"
          :value="field"
        />
      </el-select>
    </div>

    <div class="vis-style-form__row">
      <StyleFormLabel>
        标签
      </StyleFormLabel>
      <el-input
        :model-value="line.label ?? ''"
        size="small"
        class="vis-style-form__control"
        maxlength="12"
        clearable
        :placeholder="CARD_INPUT_PLACEHOLDERS.label"
        @update:model-value="(value: string) => patchLine(index, { label: value.trim() || undefined })"
      />
    </div>
    <div class="vis-style-form__row">
      <StyleFormLabel>颜色</StyleFormLabel>
      <el-color-picker
        :model-value="line.style?.color ?? null"
        :predefine="resolveChartSeriesColors(visual)"
        size="small"
        @update:model-value="patchStyle(index, 'color', $event)"
      />
    </div>
    <div class="vis-style-form__row">
      <StyleFormLabel>线型</StyleFormLabel>
      <el-radio-group
        :model-value="line.style?.lineStyle ?? MARK_LINE_DEFAULT_STYLE.lineStyle"
        size="small"
        class="vis-style-form__segmented"
        @update:model-value="patchStyle(index, 'lineStyle', $event)"
      >
        <el-radio-button value="solid">
          实线
        </el-radio-button>
        <el-radio-button value="dashed">
          虚线
        </el-radio-button>
        <el-radio-button value="dotted">
          点线
        </el-radio-button>
      </el-radio-group>
    </div>
    <div class="vis-style-form__row">
      <StyleFormLabel>线宽</StyleFormLabel>
      <el-radio-group
        :model-value="line.style?.lineWidth ?? MARK_LINE_DEFAULT_STYLE.lineWidth"
        size="small"
        class="vis-style-form__segmented"
        @update:model-value="patchStyle(index, 'lineWidth', $event)"
      >
        <el-radio-button :value="1">
          细
        </el-radio-button>
        <el-radio-button :value="2">
          标准
        </el-radio-button>
        <el-radio-button :value="4">
          粗
        </el-radio-button>
      </el-radio-group>
    </div>
  </div>
</template>
