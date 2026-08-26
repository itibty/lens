<!--
 * @Description: 趋势卡功能设置（通用 / 展示 / 格式）
-->
<script setup lang="ts">
import type { VisNumberStyle, VisVisualConfig } from '@/views/vis/shared/types'
import { NUMBER_FEATURE_TIPS, NUMBER_STYLE_DEFAULTS } from '@/views/vis/shared/numberStyle'
import { TREND_DEFAULTS, TREND_FEATURE_TIPS } from '@/views/vis/shared/trendCard'
import { useVisualBranch } from './composables/useVisualBranch'
import NumberFormatFields from './NumberFormatFields.vue'
import StyleFormLabel from './StyleFormLabel.vue'
import StyleFormSection from './StyleFormSection.vue'
import StyleFormShell from './StyleFormShell.vue'
import TitleStyleFields from './TitleStyleFields.vue'

const visual = defineModel<VisVisualConfig>('visual', { required: true })
const openSections = ref(['common', 'display', 'format'])
const number = useVisualBranch(visual, 'number')
const trend = useVisualBranch(visual, 'trend')

const showLabel = number.boolField('showLabel', NUMBER_STYLE_DEFAULTS.showLabel)
const showAuxLabel = number.boolField('showAuxLabel', NUMBER_STYLE_DEFAULTS.showAuxLabel)
const showSparkline = trend.boolField('showSparkline', TREND_DEFAULTS.showSparkline)
const showChange = trend.boolField('showChange', TREND_DEFAULTS.showChange)
const decimals = number.valueField<NonNullable<VisNumberStyle['decimals']>>(
  'decimals',
  NUMBER_STYLE_DEFAULTS.decimals,
)
const separator = number.boolField('separator', NUMBER_STYLE_DEFAULTS.separator)
const prefix = number.optionalStringField('prefix')
const compact = number.boolField('compact', NUMBER_STYLE_DEFAULTS.compact)
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
        <StyleFormLabel :tip="NUMBER_FEATURE_TIPS.showLabel">
          主指标名
        </StyleFormLabel>
        <el-switch v-model="showLabel" size="small" />
      </div>
      <div class="vis-style-form__row">
        <StyleFormLabel :tip="TREND_FEATURE_TIPS.showSparkline">
          走势
        </StyleFormLabel>
        <el-switch v-model="showSparkline" size="small" />
      </div>
      <div class="vis-style-form__row">
        <StyleFormLabel :tip="TREND_FEATURE_TIPS.showChange">
          较上期
        </StyleFormLabel>
        <el-switch v-model="showChange" size="small" />
      </div>
      <div class="vis-style-form__row">
        <StyleFormLabel :tip="NUMBER_FEATURE_TIPS.showAuxLabel">
          辅指标名
        </StyleFormLabel>
        <el-switch v-model="showAuxLabel" size="small" />
      </div>
    </StyleFormSection>

    <StyleFormSection
      title="格式"
      name="format"
    >
      <NumberFormatFields
        v-model:decimals="decimals"
        v-model:prefix="prefix"
        v-model:separator="separator"
        v-model:compact="compact"
      />
    </StyleFormSection>
  </StyleFormShell>
</template>
