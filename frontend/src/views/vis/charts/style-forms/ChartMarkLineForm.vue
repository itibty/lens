<!--
 * @Description: 几何图标记线（固定值 / 平均 / 极值）
-->
<script setup lang="ts">
import type { VisMarkLine, VisMarkLineKind, VisQueryConfig, VisVisualConfig } from '@/views/vis/shared/types'
import { CHART_FEATURE_TIPS, chartMetricAliases } from '@/views/vis/shared/chartOptions'
import {
  defaultMarkLineField,
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
    class="chart-mark-line"
  >
    <div class="chart-mark-line__head">
      <span class="chart-mark-line__name">
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
        placeholder="必填"
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
        placeholder="空则自动"
        @update:model-value="(value: string) => patchLine(index, { label: value.trim() || undefined })"
      />
    </div>
  </div>
</template>

<style scoped lang="scss">
.chart-mark-line {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 8px 10px;
  border: 1px solid var(--el-border-color-extra-light);
  border-radius: 8px;
  background: var(--el-fill-color-lighter);

  &__head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    min-height: 22px;
  }

  &__name {
    font-size: var(--vis-cfg-group-size, 12px);
    font-weight: var(--vis-cfg-group-weight, 500);
    color: var(--vis-cfg-group-color, var(--el-text-color-regular));
    line-height: 1.3;
    white-space: nowrap;
  }
}
</style>
