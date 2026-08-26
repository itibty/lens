<!--
 * @Description: 排行榜样式（配色 + 尺寸 + 卡片）
-->
<script setup lang="ts">
import type { VisVisualConfig } from '@/views/vis/shared/types'
import CardChromeFields from './CardChromeFields.vue'
import FlatForm from './FlatForm.vue'
import RankColorPicker from './RankColorPicker.vue'
import RankSizePicker from './RankSizePicker.vue'
import StyleBlock from './StyleBlock.vue'

const visual = defineModel<VisVisualConfig>('visual', { required: true })
</script>

<template>
  <FlatForm>
    <StyleBlock title="配色">
      <RankColorPicker v-model:visual="visual" />
    </StyleBlock>
    <StyleBlock
      title="尺寸"
      hint="名称 / 数值 / 条高"
    >
      <RankSizePicker v-model:visual="visual" />
    </StyleBlock>
    <StyleBlock title="卡片">
      <CardChromeFields v-model:visual="visual" />
    </StyleBlock>
  </FlatForm>
</template>
