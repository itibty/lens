<!--
 * @Description: 排行榜功能设置（通用 / 展示 / 格式）
-->
<script setup lang="ts">
import type { VisQueryConfig, VisVisualConfig } from '@/views/vis/shared/types'
import { RANK_DEFAULTS, RANK_FEATURE_TIPS } from '@/views/vis/shared/rankCard'
import { useVisualBranch } from './composables/useVisualBranch'
import FieldStyleShelf from './FieldStyleShelf.vue'
import StyleFormLabel from './StyleFormLabel.vue'
import StyleFormSection from './StyleFormSection.vue'
import StyleFormShell from './StyleFormShell.vue'
import TitleStyleFields from './TitleStyleFields.vue'

defineProps<{
  query?: VisQueryConfig
}>()

const visual = defineModel<VisVisualConfig>('visual', { required: true })
const openSections = ref(['common', 'display', 'fieldStyle'])
const branch = useVisualBranch(visual, 'rank')

const showRank = branch.boolField('showRank', RANK_DEFAULTS.showRank)
const showValue = branch.boolField('showValue', RANK_DEFAULTS.showValue)
const showPercent = branch.boolField('showPercent', RANK_DEFAULTS.showPercent)
const showBar = branch.boolField('showBar', RANK_DEFAULTS.showBar)
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
      title="展示"
      name="display"
    >
      <div class="vis-style-form__row">
        <StyleFormLabel>
          名次
        </StyleFormLabel>
        <el-switch v-model="showRank" size="small" />
      </div>
      <div class="vis-style-form__row">
        <StyleFormLabel>
          数值
        </StyleFormLabel>
        <el-switch v-model="showValue" size="small" />
      </div>
      <div class="vis-style-form__row">
        <StyleFormLabel>
          占比
        </StyleFormLabel>
        <el-switch v-model="showPercent" size="small" />
      </div>
      <div class="vis-style-form__row">
        <StyleFormLabel :tip="RANK_FEATURE_TIPS.showBar">
          占比条
        </StyleFormLabel>
        <el-switch v-model="showBar" size="small" />
      </div>
    </StyleFormSection>

    <FieldStyleShelf
      v-model:visual="visual"
      v-model:open-sections="openSections"
      :query="query"
    />
  </StyleFormShell>
</template>
