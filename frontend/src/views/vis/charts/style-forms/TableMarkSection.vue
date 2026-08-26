<!--
 * @Description: 功能设置里的数据标注分组（表格 / 透视共用）
-->
<script setup lang="ts">
import type { DatasetField, VisQueryConfig, VisVisualConfig } from '@/views/vis/shared/types'
import StyleFormSection from './StyleFormSection.vue'
import TableMarkForm from './TableMarkForm.vue'

defineProps<{
  query?: VisQueryConfig
  fields?: DatasetField[]
}>()

const visual = defineModel<VisVisualConfig>('visual', { required: true })
const openSections = defineModel<string[]>('openSections', { required: true })
const formRef = ref<{ addRule: () => void } | null>(null)

function addMark() {
  if (!openSections.value.includes('marks'))
    openSections.value = [...openSections.value, 'marks']
  formRef.value?.addRule()
}
</script>

<template>
  <StyleFormSection
    title="数据标注"
    name="marks"
  >
    <template #extra>
      <button
        type="button"
        class="vis-icon-btn"
        title="添加"
        @click="addMark"
      >
        <span class="i-mingcute-add-line" />
      </button>
    </template>
    <TableMarkForm
      ref="formRef"
      v-model:visual="visual"
      :query="query"
      :fields="fields"
    />
  </StyleFormSection>
</template>
