<!--
 * @Description: 表格功能设置（通用 / 排序 / 过滤 / 展示 / 数据标注）
-->
<script setup lang="ts">
import type { DatasetField, VisQueryConfig, VisVisualConfig } from '@/views/vis/shared/types'
import { TABLE_FEATURE_TIPS, TABLE_STYLE_DEFAULTS } from '@/views/vis/shared/tableStyle'
import { useVisualBranch } from './composables/useVisualBranch'
import StyleFormLabel from './StyleFormLabel.vue'
import StyleFormSection from './StyleFormSection.vue'
import StyleFormShell from './StyleFormShell.vue'
import TableMarkSection from './TableMarkSection.vue'
import TitleStyleFields from './TitleStyleFields.vue'

defineProps<{
  query?: VisQueryConfig
  fields?: DatasetField[]
}>()

const visual = defineModel<VisVisualConfig>('visual', { required: true })
const openSections = ref(['common', 'interaction', 'display', 'marks'])
const branch = useVisualBranch(visual, 'table')

const sortable = branch.boolField('sortable', TABLE_STYLE_DEFAULTS.sortable)
const showFilter = branch.boolField('showFilter', TABLE_STYLE_DEFAULTS.showFilter)
const striped = branch.boolField('striped', TABLE_STYLE_DEFAULTS.striped)
const showRowNumber = branch.boolField('showRowNumber', TABLE_STYLE_DEFAULTS.showRowNumber)
const mergeCell = branch.boolField('mergeCell', TABLE_STYLE_DEFAULTS.mergeCell)
</script>

<template>
  <StyleFormShell v-model="openSections">
    <StyleFormSection
      title="通用"
      name="common"
    >
      <TitleStyleFields v-model:visual="visual" />
    </StyleFormSection>

    <StyleFormSection
      title="交互"
      name="interaction"
    >
      <div class="vis-style-form__row">
        <StyleFormLabel>排序</StyleFormLabel>
        <el-switch v-model="sortable" size="small" />
      </div>

      <div class="vis-style-form__row">
        <StyleFormLabel :tip="TABLE_FEATURE_TIPS.showFilter">
          列过滤
        </StyleFormLabel>
        <el-switch v-model="showFilter" size="small" />
      </div>
    </StyleFormSection>

    <StyleFormSection
      title="展示"
      name="display"
    >
      <div class="vis-style-form__row">
        <StyleFormLabel>
          斑马纹
        </StyleFormLabel>
        <el-switch v-model="striped" size="small" />
      </div>
      <div class="vis-style-form__row">
        <StyleFormLabel>
          序号
        </StyleFormLabel>
        <el-switch v-model="showRowNumber" size="small" />
      </div>
      <div class="vis-style-form__row">
        <StyleFormLabel :tip="TABLE_FEATURE_TIPS.mergeCell">
          行合并
        </StyleFormLabel>
        <el-switch v-model="mergeCell" size="small" />
      </div>
    </StyleFormSection>

    <TableMarkSection
      v-model:visual="visual"
      v-model:open-sections="openSections"
      :query="query"
      :fields="fields"
    />
  </StyleFormShell>
</template>
