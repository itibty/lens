<!--
 * @Description: 目标进度功能设置（目标 / 期限 / 展示 / 格式）
-->
<script setup lang="ts">
import type { VisKpiOptions, VisKpiPeriodMode, VisQueryConfig, VisVisualConfig } from '@/views/vis/shared/types'
import { KPI_DEFAULTS, KPI_FEATURE_TIPS, KPI_PERIOD_OPTIONS, kpiMetricNames } from '@/views/vis/shared/kpiCard'
import { useVisualBranch } from './composables/useVisualBranch'
import NumberFormatFields from './NumberFormatFields.vue'
import StyleFormLabel from './StyleFormLabel.vue'
import StyleFormSection from './StyleFormSection.vue'
import StyleFormShell from './StyleFormShell.vue'
import TitleStyleFields from './TitleStyleFields.vue'

const props = defineProps<{
  query?: VisQueryConfig
}>()

const visual = defineModel<VisVisualConfig>('visual', { required: true })
const openSections = ref(['common', 'target', 'period', 'display', 'format'])
const branch = useVisualBranch(visual, 'kpi')
const names = computed(() => kpiMetricNames(props.query))

const showPercent = branch.boolField('showPercent', KPI_DEFAULTS.showPercent)
const showValue = branch.boolField('showValue', KPI_DEFAULTS.showValue)
const target = computed({
  get: () => visual.value.kpi?.target,
  set: (value: number | null | undefined) => {
    if (value == null || !Number.isFinite(value) || value <= 0)
      branch.clearKey('target')
    else
      branch.patch({ target: value })
  },
})
const periodMode = computed({
  get: () => visual.value.kpi?.periodMode ?? '',
  set: (value: VisKpiPeriodMode | '' | undefined) => {
    if (!value) {
      branch.clearKey('periodMode')
      branch.clearKey('periodStart')
      branch.clearKey('periodEnd')
      return
    }
    branch.patch({ periodMode: value })
    if (value !== 'custom') {
      branch.clearKey('periodStart')
      branch.clearKey('periodEnd')
    }
  },
})
const periodRange = computed({
  get: () => {
    const start = visual.value.kpi?.periodStart
    const end = visual.value.kpi?.periodEnd
    return start && end ? [start, end] as [string, string] : null
  },
  set: (value: [string, string] | null) => {
    if (!value?.[0] || !value[1]) {
      branch.clearKey('periodStart')
      branch.clearKey('periodEnd')
      return
    }
    branch.patch({ periodStart: value[0], periodEnd: value[1] })
  },
})
const percentDecimals = branch.valueField<NonNullable<VisKpiOptions['percentDecimals']>>(
  'percentDecimals',
  KPI_DEFAULTS.percentDecimals,
)
const decimals = branch.valueField<NonNullable<VisKpiOptions['decimals']>>(
  'decimals',
  KPI_DEFAULTS.decimals,
)
const separator = branch.boolField('separator', KPI_DEFAULTS.separator)
const prefix = branch.optionalStringField('prefix')
const compact = branch.boolField('compact', KPI_DEFAULTS.compact)
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
      title="目标"
      name="target"
    >
      <div
        v-if="names.hasMetricTarget"
        class="vis-style-form__row"
      >
        <StyleFormLabel>指标目标</StyleFormLabel>
        <span class="vis-style-form__value">{{ names.pair }}</span>
      </div>
      <div
        v-else
        class="vis-style-form__row"
      >
        <StyleFormLabel :tip="KPI_FEATURE_TIPS.fixedTarget">
          固定目标
        </StyleFormLabel>
        <el-input-number
          v-model="target"
          size="small"
          class="vis-style-form__control"
          :min="0"
          :controls="false"
          placeholder="必填"
          :value-on-clear="undefined"
        />
      </div>
    </StyleFormSection>

    <StyleFormSection
      title="期限"
      name="period"
    >
      <div class="vis-style-form__row">
        <StyleFormLabel :tip="KPI_FEATURE_TIPS.period">
          期限
        </StyleFormLabel>
        <el-radio-group
          v-model="periodMode"
          size="small"
          class="vis-style-form__segmented"
        >
          <el-radio-button value="">
            无
          </el-radio-button>
          <el-radio-button
            v-for="item in KPI_PERIOD_OPTIONS"
            :key="item.id"
            :value="item.id"
          >
            {{ item.label }}
          </el-radio-button>
        </el-radio-group>
      </div>
      <div
        v-if="periodMode === 'custom'"
        class="vis-style-form__row"
      >
        <StyleFormLabel>起止</StyleFormLabel>
        <el-date-picker
          v-model="periodRange"
          type="daterange"
          size="small"
          class="vis-style-form__control is-wide"
          value-format="YYYY-MM-DD"
          start-placeholder="开始"
          end-placeholder="结束"
          unlink-panels
        />
      </div>
    </StyleFormSection>

    <StyleFormSection
      title="展示"
      name="display"
    >
      <div class="vis-style-form__row">
        <StyleFormLabel :tip="KPI_FEATURE_TIPS.showPercent">
          完成率
        </StyleFormLabel>
        <el-switch v-model="showPercent" size="small" />
      </div>
      <div class="vis-style-form__row">
        <StyleFormLabel :tip="KPI_FEATURE_TIPS.showValue">
          目标值
        </StyleFormLabel>
        <el-switch v-model="showValue" size="small" />
      </div>
    </StyleFormSection>

    <StyleFormSection
      v-if="showPercent || showValue"
      title="格式"
      name="format"
    >
      <div
        v-if="showPercent"
        class="vis-style-form__block"
      >
        <div
          v-if="showValue"
          class="vis-style-form__group-title"
        >
          进度
        </div>
        <div class="vis-style-form__row">
          <StyleFormLabel :tip="KPI_FEATURE_TIPS.percentDecimals">
            小数位
          </StyleFormLabel>
          <el-radio-group
            v-model="percentDecimals"
            size="small"
            class="vis-style-form__segmented"
          >
            <el-radio-button value="auto">
              自动
            </el-radio-button>
            <el-radio-button :value="0">
              0
            </el-radio-button>
            <el-radio-button :value="1">
              1
            </el-radio-button>
            <el-radio-button :value="2">
              2
            </el-radio-button>
          </el-radio-group>
        </div>
      </div>
      <div
        v-if="showPercent && showValue"
        class="vis-style-form__divider"
      />
      <div
        v-if="showValue"
        class="vis-style-form__block"
      >
        <div
          v-if="showPercent"
          class="vis-style-form__group-title"
        >
          目标值
        </div>
        <NumberFormatFields
          v-model:decimals="decimals"
          v-model:prefix="prefix"
          v-model:separator="separator"
          v-model:compact="compact"
        />
      </div>
    </StyleFormSection>
  </StyleFormShell>
</template>
