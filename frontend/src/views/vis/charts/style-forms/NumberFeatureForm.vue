<!--
 * @Description: 指标卡功能设置（通用 / 展示 / 格式）
-->
<script setup lang="ts">
import type { VisNumberStyle, VisVisualConfig } from '@/views/vis/shared/types'
import { NUMBER_STYLE_DEFAULTS } from '@/views/vis/shared/numberStyle'
import { useVisualBranch } from './composables/useVisualBranch'
import NumberFormatFields from './NumberFormatFields.vue'
import StyleFormLabel from './StyleFormLabel.vue'
import StyleFormSection from './StyleFormSection.vue'
import StyleFormShell from './StyleFormShell.vue'
import TitleStyleFields from './TitleStyleFields.vue'

const visual = defineModel<VisVisualConfig>('visual', { required: true })
const openSections = ref(['common', 'display', 'format'])
const branch = useVisualBranch(visual, 'number')

const showLabel = branch.boolField('showLabel', NUMBER_STYLE_DEFAULTS.showLabel)
const showAuxLabel = branch.boolField('showAuxLabel', NUMBER_STYLE_DEFAULTS.showAuxLabel)
const decimals = branch.valueField<NonNullable<VisNumberStyle['decimals']>>(
  'decimals',
  NUMBER_STYLE_DEFAULTS.decimals,
)
const separator = branch.boolField('separator', NUMBER_STYLE_DEFAULTS.separator)
const prefix = branch.optionalStringField('prefix')
const compact = branch.boolField('compact', NUMBER_STYLE_DEFAULTS.compact)
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
