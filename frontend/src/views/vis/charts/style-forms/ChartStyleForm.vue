<!--
 * @Description: 几何图样式（配色 + 卡片风格）
-->
<script setup lang="ts">
import type { VisQueryConfig, VisVisualConfig } from '@/views/vis/shared/types'
import { supportsSeriesStyle } from '@/views/vis/shared/chartSeriesStyle'
import CardChromeFields from './CardChromeFields.vue'
import ChartSeriesForm from './ChartSeriesForm.vue'
import FlatForm from './FlatForm.vue'
import StyleBlock from './StyleBlock.vue'
import VTableThemePicker from './VTableThemePicker.vue'

defineProps<{ query?: VisQueryConfig, rows?: Record<string, unknown>[] }>()

const visual = defineModel<VisVisualConfig>('visual', { required: true })
</script>

<template>
  <FlatForm>
    <StyleBlock title="配色">
      <VTableThemePicker v-model:visual="visual" />
    </StyleBlock>
    <StyleBlock v-if="supportsSeriesStyle(visual.chartType)" title="系列">
      <ChartSeriesForm v-model:visual="visual" :query="query" :rows="rows" />
    </StyleBlock>
    <StyleBlock title="卡片">
      <CardChromeFields v-model:visual="visual" />
    </StyleBlock>
  </FlatForm>
</template>
