<!--
 * @Description: 指标投放区（agg / formula 二选一，可选 contrast）
-->
<script setup lang="ts">
import type { QueryIssue } from '../cardApi'
import type { DragFieldPayload, MetricPill } from '@/views/vis/shared/dnd'
import type { DatasetField, VisVisualConfig } from '@/views/vis/shared/types'
import draggable from 'vuedraggable'
import {
  contrastDisplayLabel,
  contrastMethodOptions,
  fillContrastPeriodValue,
  syncContrastMethod,
} from '@/views/vis/shared/contrastExp'
import { dateValueExpCount } from '@/views/vis/shared/dateExp'
import { DND_GROUP, toMetricPill } from '@/views/vis/shared/dnd'
import { remapTableMarkAliases } from '@/views/vis/shared/tableMark'
import {
  AGG_OPTIONS,
  aggLabel,
  CONTRAST_CALC_TYPE_OPTIONS,
  DEFAULT_METRIC_AGG,
  isDateField,
  metricAlias,
} from '@/views/vis/shared/types'
import { pillMessage, shelfMessage } from '../cardApi'
import ContrastWindowHint from './ContrastWindowHint.vue'
import DateExpFields from './DateExpFields.vue'
import FieldPill from './FieldPill.vue'
import ShelfTitle from './ShelfTitle.vue'

interface MetricDraft {
  field: string
  mode: 'agg' | 'formula'
  agg: NonNullable<VIS.MetricItem['agg']>
  formula: string
  label: string
  contrastEnabled: boolean
  timeField: string
  calcMethod: VIS.ContrastConfig['calcMethod']
  calcType: VIS.ContrastConfig['calcType']
  valueExp: VIS.ContrastConfig['valueExp']
  value: unknown[]
  /** 自动生成的显示名，用户改过则不再覆盖 */
  contrastAutoLabel: string
}

const props = withDefaults(defineProps<{
  fields?: DatasetField[]
  allowContrast?: boolean
  issues?: QueryIssue[]
  visual?: VisVisualConfig
}>(), {
  allowContrast: true,
})

const metrics = defineModel<MetricPill[]>('metrics', { required: true })
const drafts = reactive<Record<string, MetricDraft>>({})

const dateFields = computed(() =>
  (props.fields ?? []).filter(item => isDateField(item.dataType)),
)

function onAdd(evt: { newIndex?: number }) {
  const index = evt.newIndex
  if (index == null)
    return
  const raw = metrics.value[index] as DragFieldPayload | MetricPill
  metrics.value[index] = toMetricPill(raw)
}

function removeAt(index: number) {
  const item = metrics.value[index]
  if (item)
    delete drafts[item._uid]
  metrics.value.splice(index, 1)
}

function metricMode(element: MetricPill): 'agg' | 'formula' {
  return element.formula != null ? 'formula' : 'agg'
}

function defaultTimeField(current?: string) {
  if (current)
    return current
  return dateFields.value[0]?.field || ''
}

function sameValues(left: unknown[], right: unknown[]) {
  return left.length === right.length && left.every((item, index) => item === right[index])
}

function ensureContrastDraft(draft: MetricDraft) {
  draft.timeField = defaultTimeField(draft.timeField)
  draft.valueExp = draft.valueExp || 'current_day'
  draft.calcMethod = syncContrastMethod(draft.valueExp, draft.calcMethod)
  draft.calcType = draft.calcType || 'diff'
  const nextValue = fillContrastPeriodValue(draft.valueExp, draft.value)
  if (!sameValues(nextValue, draft.value))
    draft.value = nextValue
  const auto = contrastDisplayLabel(draft.valueExp, draft.calcMethod, draft.calcType, draft.value, draft.field)
  const current = draft.label.trim()
  if (!current || current === draft.contrastAutoLabel) {
    draft.label = auto
    draft.contrastAutoLabel = auto
  }
}

function openDraft(element: MetricPill) {
  const mode = metricMode(element)
  const contrast = element.contrast
  const valueExp = contrast?.valueExp || 'current_day'
  const calcMethod = syncContrastMethod(valueExp, contrast?.calcMethod)
  const calcType = contrast?.calcType || 'diff'
  const value = contrast ? fillContrastPeriodValue(valueExp, contrast.value as unknown[]) : []
  const label = element.label || ''
  const auto = contrastDisplayLabel(valueExp, calcMethod, calcType, value, element.field)
  drafts[element._uid] = {
    field: element.field,
    mode,
    agg: element.agg || DEFAULT_METRIC_AGG,
    formula: element.formula || '',
    label,
    contrastEnabled: !!contrast,
    timeField: defaultTimeField(contrast?.timeField),
    calcMethod,
    calcType,
    valueExp,
    value,
    contrastAutoLabel: label.trim() && label.trim() === auto ? auto : '',
  }
  if (drafts[element._uid].contrastEnabled)
    ensureContrastDraft(drafts[element._uid])
}

function onContrastEnabled(uid: string) {
  const draft = drafts[uid]
  if (!draft?.contrastEnabled)
    return
  ensureContrastDraft(draft)
}

function onContrastFieldChange(uid: string) {
  const draft = drafts[uid]
  if (!draft?.contrastEnabled)
    return
  ensureContrastDraft(draft)
}

function onValueExpChange(uid: string, exp?: VIS.ContrastConfig['valueExp']) {
  const draft = drafts[uid]
  if (!draft?.contrastEnabled)
    return
  if (exp)
    draft.valueExp = exp
  ensureContrastDraft(draft)
  nextTick(() => ensureContrastDraft(draft))
}

function methodOptions(uid: string) {
  return contrastMethodOptions(drafts[uid]?.valueExp)
}

function confirmDraft(element: MetricPill) {
  const draft = drafts[element._uid]
  if (!draft)
    return
  const prevAlias = metricAlias(element)
  if (draft.mode === 'formula') {
    delete element.agg
    element.formula = draft.formula
  }
  else {
    delete element.formula
    element.agg = draft.agg || DEFAULT_METRIC_AGG
  }
  const text = draft.label.trim()
  if (!text)
    delete element.label
  else
    element.label = text
  if (props.visual)
    remapTableMarkAliases(props.visual, prevAlias, metricAlias(element))
  if (props.allowContrast && draft.contrastEnabled) {
    const contrast: VIS.ContrastConfig = {
      timeField: defaultTimeField(draft.timeField),
      calcMethod: syncContrastMethod(draft.valueExp, draft.calcMethod),
      calcType: draft.calcType || 'diff',
      valueExp: draft.valueExp || 'current_day',
    }
    if (dateValueExpCount(contrast.valueExp) > 0)
      contrast.value = fillContrastPeriodValue(contrast.valueExp, draft.value) as VIS.ContrastConfig['value']
    element.contrast = contrast
  }
  else {
    delete element.contrast
  }
  delete drafts[element._uid]
}

function pillName(element: MetricPill) {
  const alias = element.label?.trim()
  if (metricMode(element) === 'formula')
    return alias || element.field
  return alias ? `${element.field} (${alias})` : element.field
}

function labelRequired(uid: string) {
  const draft = drafts[uid]
  return !!draft && (draft.mode === 'formula' || draft.contrastEnabled)
}

function pillSubtitle(element: MetricPill) {
  if (props.allowContrast && element.contrast)
    return '对比'
  if (metricMode(element) === 'formula')
    return '公式'
  return aggLabel(element.agg || DEFAULT_METRIC_AGG)
}

const shelfError = computed(() => shelfMessage(props.issues, 'metrics'))

function pillError(uid: string) {
  return pillMessage(props.issues, 'metrics', uid)
}
</script>

<template>
  <div class="shelf" :class="{ 'is-invalid': !!shelfError }">
    <div class="shelf__title">
      <ShelfTitle tip="要看的数字，例如销售额、订单量">
        指标
      </ShelfTitle>
    </div>
    <draggable
      v-model="metrics"
      class="shelf__drop"
      :class="{ 'is-empty': !metrics.length, 'is-invalid': !!shelfError }"
      :group="DND_GROUP"
      handle=".field-pill__handle"
      :animation="180"
      item-key="_uid"
      @add="onAdd"
    >
      <template #item="{ element, index }">
        <div class="shelf__pill-wrap">
          <FieldPill
            :name="pillName(element)"
            :subtitle="pillSubtitle(element)"
            :error="pillError(element._uid)"
            tone="metric"

            drag-handle block
            :popover-width="allowContrast ? 360 : 312"
            @open="openDraft(element)"
            @confirm="confirmDraft(element)"
            @remove="removeAt(index)"
          >
            <template v-if="drafts[element._uid]">
              <el-form label-position="top" size="small" @submit.prevent>
                <el-form-item
                  label="计算方式"
                  label-position="left"
                  label-width="auto"
                >
                  <el-radio-group v-model="drafts[element._uid].mode" size="small">
                    <el-radio-button value="agg">
                      汇总
                    </el-radio-button>
                    <el-radio-button value="formula">
                      计算
                    </el-radio-button>
                  </el-radio-group>
                </el-form-item>
                <el-form-item v-if="drafts[element._uid].mode === 'agg'" label="汇总方式">
                  <el-select v-model="drafts[element._uid].agg" class="w-full">
                    <el-option
                      v-for="opt in AGG_OPTIONS"
                      :key="opt.value"
                      :label="opt.label"
                      :value="opt.value"
                    />
                  </el-select>
                </el-form-item>
                <el-form-item v-else label="计算公式">
                  <el-input
                    v-model="drafts[element._uid].formula"
                    type="textarea"
                    :rows="2"
                    placeholder="例如：营收 / 成本"
                  />
                </el-form-item>
                <el-form-item
                  v-if="!allowContrast || !drafts[element._uid].contrastEnabled"
                  :label="labelRequired(element._uid) ? '显示名' : '显示名（可选）'"
                >
                  <el-input
                    v-model="drafts[element._uid].label"
                    clearable
                    :placeholder="labelRequired(element._uid) ? '必填' : '不填则使用字段名'"
                  />
                </el-form-item>
                <div v-if="allowContrast" class="contrast-group">
                  <div class="contrast-group__head">
                    <span class="contrast-group__title">同比 / 环比</span>
                    <el-switch
                      v-model="drafts[element._uid].contrastEnabled"
                      @change="onContrastEnabled(element._uid)"
                    />
                  </div>
                  <div
                    v-if="drafts[element._uid].contrastEnabled"
                    class="contrast-group__body"
                  >
                    <el-form-item label="显示名">
                      <el-input
                        v-model="drafts[element._uid].label"
                        clearable
                        placeholder="必填"
                      />
                    </el-form-item>
                    <el-form-item label="日期字段">
                      <el-select
                        v-model="drafts[element._uid].timeField"
                        class="w-full"
                        filterable
                        allow-create
                        default-first-option
                        placeholder="选择或输入日期字段"
                        @change="onContrastFieldChange(element._uid)"
                      >
                        <el-option
                          v-for="item in dateFields"
                          :key="item.field"
                          :label="item.field"
                          :value="item.field"
                        />
                      </el-select>
                    </el-form-item>
                    <DateExpFields
                      v-model:value-exp="drafts[element._uid].valueExp"
                      v-model:value="drafts[element._uid].value"
                      label="评估期"
                      :show-hint="false"
                      @update:value-exp="exp => onValueExpChange(element._uid, exp)"
                      @update:value="onContrastFieldChange(element._uid)"
                    />
                    <div class="form-pair">
                      <el-form-item label="对比">
                        <el-select
                          v-model="drafts[element._uid].calcMethod"
                          class="w-full"
                          @change="onContrastFieldChange(element._uid)"
                        >
                          <el-option
                            v-for="opt in methodOptions(element._uid)"
                            :key="opt.value"
                            :label="opt.label"
                            :value="opt.value"
                          />
                        </el-select>
                      </el-form-item>
                      <el-form-item label="结果">
                        <el-select
                          v-model="drafts[element._uid].calcType"
                          class="w-full"
                          @change="onContrastFieldChange(element._uid)"
                        >
                          <el-option
                            v-for="opt in CONTRAST_CALC_TYPE_OPTIONS"
                            :key="opt.value"
                            :label="opt.label"
                            :value="opt.value"
                          />
                        </el-select>
                      </el-form-item>
                    </div>
                    <ContrastWindowHint
                      :value-exp="drafts[element._uid].valueExp"
                      :value="drafts[element._uid].value"
                      :calc-method="drafts[element._uid].calcMethod"
                    />
                  </div>
                </div>
              </el-form>
            </template>
          </FieldPill>
        </div>
      </template>
    </draggable>
    <div v-if="!metrics.length && !shelfError" class="shelf__hint">
      从左侧拖入字段
    </div>
    <div v-if="shelfError" class="shelf__error">
      {{ shelfError }}
    </div>
  </div>
</template>

<style scoped lang="scss">
.shelf {
  position: relative;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
  padding: 10px 12px 12px;
  margin-bottom: 12px;
  background: var(--vis-shelf-well, #eef3f8);

  &.is-invalid {
    border-color: var(--el-color-danger-light-5);
  }

  &__title {
    margin-bottom: 8px;
    font-size: var(--vis-cfg-title-size, 13px);
    font-weight: var(--vis-cfg-title-weight, 500);
    color: var(--vis-cfg-title-color, var(--el-text-color-regular));
    line-height: 1.3;
  }

  &__drop {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 8px;
    border: 1px dashed var(--el-border-color);
    border-radius: 6px;
    background: #fff;

    &.is-empty {
      min-height: 44px;
    }

    &.is-invalid {
      border-color: var(--el-color-danger-light-5);
    }
  }

  &__error {
    margin-top: 8px;
    font-size: 12px;
    line-height: 1.4;
    color: var(--el-color-danger);
  }

  &__pill-wrap {
    width: 100%;
  }

  &__hint {
    position: absolute;
    left: 28px;
    top: 52px;
    font-size: var(--vis-cfg-hint-size, 12px);
    color: var(--vis-cfg-hint-color, var(--el-text-color-placeholder));
    pointer-events: none;
  }
}

.form-pair {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0 8px;
}

.contrast-group {
  margin: 4px 0 8px;
  border-radius: 6px;
  background: var(--el-fill-color-light);
  overflow: visible;

  &__head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    min-height: 32px;
    padding: 6px 10px;
  }

  &__title {
    font-size: 12px;
    font-weight: 500;
    color: var(--el-text-color-regular);
    line-height: 1.3;
  }

  &__body {
    padding: 2px 10px 10px;

    .form-pair :deep(.el-form-item) {
      margin-bottom: 0;
    }
  }
}

:deep(.sortable-ghost) {
  opacity: 0.4;
}
</style>
