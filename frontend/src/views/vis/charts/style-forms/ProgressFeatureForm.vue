<!--
 * @Description: 进度条功能设置（通用 / 目标 / 展示 / 格式）
-->
<script setup lang="ts">
import type { VisProgressOptions, VisQueryConfig, VisVisualConfig } from '@/views/vis/shared/types'
import { PROGRESS_DEFAULTS, PROGRESS_FEATURE_TIPS, progressMetricNames } from '@/views/vis/shared/progressCard'
import { useVisualBranch } from './composables/useVisualBranch'
import FieldStyleShelf from './FieldStyleShelf.vue'
import StyleFormLabel from './StyleFormLabel.vue'
import StyleFormSection from './StyleFormSection.vue'
import StyleFormShell from './StyleFormShell.vue'
import TitleStyleFields from './TitleStyleFields.vue'

const props = defineProps<{
  query?: VisQueryConfig
}>()

const visual = defineModel<VisVisualConfig>('visual', { required: true })
const openSections = ref(['common', 'target', 'display', 'fieldStyle'])
const branch = useVisualBranch(visual, 'progress')

const names = computed(() => progressMetricNames(props.query))

const showLabel = branch.boolField('showLabel', PROGRESS_DEFAULTS.showLabel)
const shape = branch.valueField<NonNullable<VisProgressOptions['shape']>>('shape', PROGRESS_DEFAULTS.shape)
const showPercent = branch.boolField('showPercent', PROGRESS_DEFAULTS.showPercent)
const showValue = branch.boolField('showValue', PROGRESS_DEFAULTS.showValue)
const target = computed({
  get: () => visual.value.progress?.target,
  set: (value: number | null | undefined) => {
    if (value == null || !Number.isFinite(value) || value <= 0)
      branch.clearKey('target')
    else
      branch.patch({ target: value })
  },
})
const percentDecimals = branch.valueField<NonNullable<VisProgressOptions['percentDecimals']>>(
  'percentDecimals',
  PROGRESS_DEFAULTS.percentDecimals,
)
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
        <StyleFormLabel :tip="PROGRESS_FEATURE_TIPS.fixedTarget">
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
      title="展示"
      name="display"
    >
      <div class="vis-style-form__row">
        <StyleFormLabel>形态</StyleFormLabel>
        <el-radio-group
          v-model="shape"
          size="small"
          class="vis-style-form__segmented"
        >
          <el-radio-button value="bar">
            条形
          </el-radio-button>
          <el-radio-button value="ring">
            环形
          </el-radio-button>
          <el-radio-button value="gauge">
            半环
          </el-radio-button>
        </el-radio-group>
      </div>

      <div class="vis-style-form__row">
        <StyleFormLabel>
          指标名
        </StyleFormLabel>
        <el-switch v-model="showLabel" size="small" />
      </div>

      <div class="vis-style-form__row">
        <StyleFormLabel>
          完成率
        </StyleFormLabel>
        <el-switch v-model="showPercent" size="small" />
      </div>

      <div
        v-if="showPercent"
        class="vis-style-form__row"
      >
        <StyleFormLabel :tip="PROGRESS_FEATURE_TIPS.percentDecimals">
          完成率小数位
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

      <div class="vis-style-form__row">
        <StyleFormLabel :tip="PROGRESS_FEATURE_TIPS.showValue">
          目标值
        </StyleFormLabel>
        <el-switch v-model="showValue" size="small" />
      </div>
    </StyleFormSection>

    <FieldStyleShelf
      v-model:visual="visual"
      v-model:open-sections="openSections"
      :query="query"
    />
  </StyleFormShell>
</template>
