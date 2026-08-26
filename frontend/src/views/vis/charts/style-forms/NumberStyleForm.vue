<!--
 * @Description: 指标卡样式（配色 + 尺寸 + 卡片风格）
-->
<script setup lang="ts">
import type { VisVisualConfig } from '@/views/vis/shared/types'
import CardChromeFields from './CardChromeFields.vue'
import FlatForm from './FlatForm.vue'
import NumberColorPicker from './NumberColorPicker.vue'
import NumberSizePicker from './NumberSizePicker.vue'
import StyleBlock from './StyleBlock.vue'

const visual = defineModel<VisVisualConfig>('visual', { required: true })
</script>

<template>
  <FlatForm>
    <StyleBlock title="配色">
      <NumberColorPicker v-model:visual="visual" />
    </StyleBlock>
    <StyleBlock
      title="尺寸"
      hint="主值 / 辅值 / 指标名"
    >
      <NumberSizePicker v-model:visual="visual" />
    </StyleBlock>
    <StyleBlock title="卡片">
      <CardChromeFields v-model:visual="visual" />
    </StyleBlock>
  </FlatForm>
</template>
