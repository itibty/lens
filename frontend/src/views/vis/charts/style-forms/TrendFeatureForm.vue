<!--
 * @Description: 趋势卡功能设置（通用 / 展示 / 格式）
-->
<script setup lang="ts">
import type { VisQueryConfig, VisVisualConfig } from '@/views/vis/shared/types'
import { NUMBER_STYLE_DEFAULTS } from '@/views/vis/shared/numberStyle'
import { TREND_DEFAULTS } from '@/views/vis/shared/trendCard'
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
const number = useVisualBranch(visual, 'number')
const trend = useVisualBranch(visual, 'trend')

const showLabel = number.boolField('showLabel', NUMBER_STYLE_DEFAULTS.showLabel)
const showAuxLabel = number.boolField('showAuxLabel', NUMBER_STYLE_DEFAULTS.showAuxLabel)
const showSparkline = trend.boolField('showSparkline', TREND_DEFAULTS.showSparkline)
const showChange = trend.boolField('showChange', TREND_DEFAULTS.showChange)
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
          主指标名
        </StyleFormLabel>
        <el-switch v-model="showLabel" size="small" />
      </div>
      <div class="vis-style-form__row">
        <StyleFormLabel>
          走势
        </StyleFormLabel>
        <el-switch v-model="showSparkline" size="small" />
      </div>
      <div class="vis-style-form__row">
        <StyleFormLabel>
          较上期
        </StyleFormLabel>
        <el-switch v-model="showChange" size="small" />
      </div>
      <div class="vis-style-form__row">
        <StyleFormLabel>
          辅指标名
        </StyleFormLabel>
        <el-switch v-model="showAuxLabel" size="small" />
      </div>
    </StyleFormSection>

    <FieldStyleShelf
      v-model:visual="visual"
      v-model:open-sections="openSections"
      :query="query"
    />
  </StyleFormShell>
</template>
