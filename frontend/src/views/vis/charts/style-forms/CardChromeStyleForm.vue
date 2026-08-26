<!--
 * @Description: 表格 / 透视样式（配色 + 卡片）
-->
<script setup lang="ts">
import type { VisVisualConfig } from '@/views/vis/shared/types'
import CardChromeFields from './CardChromeFields.vue'
import FlatForm from './FlatForm.vue'
import StyleBlock from './StyleBlock.vue'
import VTableThemePicker from './VTableThemePicker.vue'

const visual = defineModel<VisVisualConfig>('visual', { required: true })
</script>

<template>
  <FlatForm>
    <StyleBlock title="配色">
      <VTableThemePicker
        v-model:visual="visual"
        variant="table"
      />
    </StyleBlock>
    <StyleBlock title="卡片">
      <CardChromeFields v-model:visual="visual" />
    </StyleBlock>
  </FlatForm>
</template>
