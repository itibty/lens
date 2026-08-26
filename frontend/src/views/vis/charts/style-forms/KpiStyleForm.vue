<!--
 * @Description: 目标进度样式（配色 + 尺寸 + 卡片风格）
-->
<script setup lang="ts">
import type { VisVisualConfig } from '@/views/vis/shared/types'
import CardChromeFields from './CardChromeFields.vue'
import FlatForm from './FlatForm.vue'
import KpiColorPicker from './KpiColorPicker.vue'
import KpiSizePicker from './KpiSizePicker.vue'
import StyleBlock from './StyleBlock.vue'

const visual = defineModel<VisVisualConfig>('visual', { required: true })
</script>

<template>
  <FlatForm>
    <StyleBlock
      title="配色"
      hint="填充 / 轨道"
    >
      <KpiColorPicker v-model:visual="visual" />
    </StyleBlock>
    <StyleBlock
      title="尺寸"
      hint="完成率 / 条高"
    >
      <KpiSizePicker v-model:visual="visual" />
    </StyleBlock>
    <StyleBlock title="卡片">
      <CardChromeFields v-model:visual="visual" />
    </StyleBlock>
  </FlatForm>
</template>
