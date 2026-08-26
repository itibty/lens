<!--
 * @Description: 无需数据集的图表：卡片级开关
-->
<script setup lang="ts">
import type { VisVisualConfig } from '@/views/vis/shared/types'
import StyleFormSection from './StyleFormSection.vue'
import StyleFormShell from './StyleFormShell.vue'
import TitleStyleFields from './TitleStyleFields.vue'

const visual = defineModel<VisVisualConfig>('visual', { required: true })
const openSections = ref(['common'])
</script>

<template>
  <StyleFormShell v-model="openSections">
    <StyleFormSection
      title="通用"
      name="common"
    >
      <TitleStyleFields v-model:visual="visual" />
    </StyleFormSection>
  </StyleFormShell>
</template>
