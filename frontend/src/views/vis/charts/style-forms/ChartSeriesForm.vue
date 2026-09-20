<script setup lang="ts">
import type { VisQueryConfig, VisSeriesStyle, VisVisualConfig } from '@/views/vis/shared/types'
import { CARD_INPUT_PLACEHOLDERS } from '@/views/vis/charts/chartHelp'
import { resolveLineFields } from '@/views/vis/shared/chartOptions'
import { resolveChartSeriesColors } from '@/views/vis/shared/chartPalette'
import { sanitizeSeriesStyles, seriesCandidates, seriesTargetKey } from '@/views/vis/shared/chartSeriesStyle'
import { metricAlias, regularMetrics } from '@/views/vis/shared/types'
import StyleFormLabel from './StyleFormLabel.vue'

const props = defineProps<{ query?: VisQueryConfig, rows?: Record<string, unknown>[] }>()
const visual = defineModel<VisVisualConfig>('visual', { required: true })
const rules = computed(() => sanitizeSeriesStyles(visual.value.chart?.seriesStyles, props.query))
const candidates = computed(() => seriesCandidates(props.query, props.rows, rules.value))
const selectedKey = ref('')
const selected = computed(() => candidates.value.find(item => seriesTargetKey(item.target) === selectedKey.value) ?? candidates.value[0])
const selection = computed({
  get: () => selected.value ? seriesTargetKey(selected.value.target) : '',
  set: (value: string) => { selectedKey.value = value },
})
const style = computed(() => rules.value.find(rule => seriesTargetKey(rule) === selection.value)?.style ?? {})
const isLine = computed(() => visual.value.chartType === 'line' || (visual.value.chartType === 'combo' && selected.value
  && 'metric' in selected.value.target
  && resolveLineFields(visual.value, regularMetrics(props.query?.metrics).map(metricAlias)).includes(selected.value.target.metric)))

function patch(key: keyof VisSeriesStyle, value: unknown) {
  if (!selected.value)
    return
  const next = { ...style.value, [key]: value }
  if (value === '' || value == null || value === 'auto')
    delete next[key]
  const list = rules.value.filter(rule => seriesTargetKey(rule) !== selection.value)
  if (Object.keys(next).length)
    list.push({ ...selected.value.target, style: next })
  visual.value.chart = { ...visual.value.chart, seriesStyles: list }
}
function reset() {
  visual.value.chart = { ...visual.value.chart, seriesStyles: rules.value.filter(rule => seriesTargetKey(rule) !== selection.value) }
}
</script>

<template>
  <div class="vis-style-form__row">
    <StyleFormLabel>
      系列
    </StyleFormLabel>
    <el-select v-model="selection" size="small" class="vis-style-form__control" filterable :placeholder="candidates.length ? CARD_INPUT_PLACEHOLDERS.series : CARD_INPUT_PLACEHOLDERS.noSeries" :disabled="!candidates.length">
      <el-option v-for="item in candidates" :key="seriesTargetKey(item.target)" :value="seriesTargetKey(item.target)" :label="item.label" />
    </el-select>
  </div>
  <template v-if="selected">
    <div class="vis-style-form__row">
      <StyleFormLabel>颜色</StyleFormLabel>
      <el-color-picker :model-value="style.color ?? null" :predefine="resolveChartSeriesColors(visual)" size="small" @update:model-value="patch('color', $event)" />
    </div>
    <template v-if="isLine">
      <div class="vis-style-form__row">
        <StyleFormLabel>线型</StyleFormLabel>
        <el-radio-group :model-value="style.lineStyle ?? 'solid'" size="small" @update:model-value="patch('lineStyle', $event)">
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
        <el-radio-group :model-value="style.lineWidth ?? 2" size="small" @update:model-value="patch('lineWidth', $event)">
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
      <div class="vis-style-form__row">
        <StyleFormLabel>数据点</StyleFormLabel>
        <el-radio-group :model-value="style.points ?? 'auto'" size="small" @update:model-value="patch('points', $event)">
          <el-radio-button value="auto">
            自动
          </el-radio-button>
          <el-radio-button :value="true">
            显示
          </el-radio-button>
          <el-radio-button :value="false">
            隐藏
          </el-radio-button>
        </el-radio-group>
      </div>
    </template>
    <div class="vis-style-form__row">
      <StyleFormLabel>数据标签</StyleFormLabel>
      <el-select :model-value="style.dataLabel ?? 'auto'" size="small" class="vis-style-form__control" @update:model-value="patch('dataLabel', $event)">
        <el-option value="auto" label="跟随整体" />
        <el-option :value="true" label="显示" />
        <el-option :value="false" label="隐藏" />
      </el-select>
    </div>
    <div class="vis-style-form__row">
      <el-button text size="small" :disabled="!Object.keys(style).length" @click="reset">
        恢复默认
      </el-button>
    </div>
  </template>
</template>
