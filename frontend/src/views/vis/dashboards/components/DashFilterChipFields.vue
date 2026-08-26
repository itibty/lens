<!--
 * @Description: 筛选 tag 弹层表单（只改草稿，确认由外层写回）
-->
<script setup lang="ts">
import type { DashFilterValue, VisDashFilterDef } from '../dashApi'
import { useDebounceFn } from '@vueuse/core'
import DateExpFields from '@/views/vis/cards/components/DateExpFields.vue'
import { isDateTimeFormType, isRangeFormType, isTemporalFormType, needsOptions, resolveFilterOp } from '../dashApi'
import { useDashFilterOptions } from '../useDashFilterOptions'

const props = withDefaults(defineProps<{
  def: VisDashFilterDef
  item: DashFilterValue
  opLabel: string
  bare?: boolean
}>(), {
  bare: false,
})
const emit = defineEmits<{
  patch: [next: DashFilterValue]
}>()

const cells = computed(() => props.item.value ?? [])
const isRange = computed(() => isRangeFormType(props.def.formType) || resolveFilterOp(props.def) === 'between')
const asTimestamp = computed(() => props.def.valueAs === 'timestamp')
const datePickerType = computed(() => {
  return isDateTimeFormType(props.def.formType) || asTimestamp.value ? 'datetime' : 'date'
})
const dateValueFormat = computed(() => {
  if (asTimestamp.value)
    return 'x'
  return isDateTimeFormType(props.def.formType) ? 'YYYY-MM-DD HH:mm:ss' : 'YYYY-MM-DD'
})

const { options, loading, isRemote, search, mergeSelected, hydrateSelected } = useDashFilterOptions(
  () => props.def,
  () => cells.value,
)
const debouncedSearch = useDebounceFn((keyword: string) => {
  void search(keyword)
}, 300)

function remoteSearch(keyword: string) {
  if (!String(keyword || '').trim()) {
    debouncedSearch.cancel()
    void search('')
    return
  }
  debouncedSearch(keyword)
}

function text() {
  return String(cells.value[0] ?? '')
}

function numberAt(index: number) {
  const n = Number(cells.value[index])
  return Number.isFinite(n) ? n : undefined
}

function tags() {
  return cells.value.map(item => String(item))
}

function temporalAt(index: number) {
  const raw = cells.value[index]
  if (raw == null || raw === '')
    return undefined
  if (asTimestamp.value) {
    const n = Number(raw)
    return Number.isFinite(n) ? n : undefined
  }
  return String(raw)
}

function setTemporalAt(index: number, val: string | number | null) {
  const cell = val == null || val === '' ? undefined : val
  if (isRange.value)
    setAt(index, cell)
  else
    setValue(cell == null ? [] : [cell])
}

function setValue(value: unknown[]) {
  emit('patch', { value })
}

function setAt(index: number, cell: unknown) {
  const next = [...cells.value]
  while (next.length <= index)
    next.push(undefined)
  next[index] = cell
  setValue(next)
}

function onSelectVisible(open: boolean) {
  if (!open)
    return
  mergeSelected(cells.value)
  void hydrateSelected(cells.value)
}

watch(
  () => cells.value,
  (value) => {
    if (!needsOptions(props.def.formType))
      return
    mergeSelected(value)
    if (props.bare)
      void hydrateSelected(value)
  },
  { immediate: true },
)
</script>

<template>
  <el-form
    class="dash-filter-chip-popper__form filter-chip-fields"
    :class="{ 'is-bare': bare }"
    label-position="top"
    label-width="auto"
    @submit.prevent
  >
    <DateExpFields
      v-if="def.formType === 'dateExp'"
      :value-exp="item.valueExp"
      :value="cells"
      :label="bare ? '默认值' : opLabel"
      size="default"
      :show-hint="false"
      @update:value-exp="(val: VIS.FilterItem['valueExp']) => emit('patch', { valueExp: val })"
      @update:value="setValue"
    />
    <el-form-item
      v-else
      :label="bare ? '默认值' : opLabel"
    >
      <el-input
        v-if="def.formType === 'input'"
        class="w-full"
        :model-value="text()"
        clearable
        placeholder="请输入"
        @update:model-value="(val: string) => setValue(val ? [val] : [])"
      />
      <el-input-tag
        v-else-if="def.formType === 'inputTag'"
        class="w-full"
        :model-value="tags()"
        clearable
        placeholder="输入后回车"
        @update:model-value="(val?: string[]) => setValue(val ?? [])"
      />
      <el-select
        v-else-if="needsOptions(def.formType)"
        class="w-full"
        :model-value="def.formType === 'select' ? (tags()[0] || undefined) : tags()"
        :multiple="def.formType === 'multiSelect'"
        filterable
        clearable
        collapse-tags
        collapse-tags-tooltip
        :remote="isRemote"
        :remote-method="isRemote ? remoteSearch : undefined"
        :loading="loading"
        reserve-keyword
        placeholder="请选择"
        @visible-change="onSelectVisible"
        @update:model-value="(val: string | string[]) => {
          if (def.formType === 'select')
            setValue(val ? [val] : [])
          else
            setValue(Array.isArray(val) ? val : [])
        }"
      >
        <el-option
          v-for="opt in options"
          :key="opt.value"
          :label="opt.label"
          :value="opt.value"
        />
      </el-select>
      <div
        v-else-if="def.formType === 'numberRange' || (def.formType === 'number' && isRange)"
        class="filter-chip-range"
      >
        <el-input-number
          :model-value="numberAt(0)"
          controls-position="right"
          placeholder="起"
          style="width: 100%"
          @update:model-value="(val: number | undefined) => setAt(0, val)"
        />
        <span class="filter-chip-range__sep">~</span>
        <el-input-number
          :model-value="numberAt(1)"
          controls-position="right"
          placeholder="止"
          style="width: 100%"
          @update:model-value="(val: number | undefined) => setAt(1, val)"
        />
      </div>
      <el-input-number
        v-else-if="def.formType === 'number'"
        :model-value="numberAt(0)"
        controls-position="right"
        placeholder="数字"
        style="width: 100%"
        @update:model-value="(val: number | undefined) => setValue(val == null ? [] : [val])"
      />
      <div
        v-else-if="isTemporalFormType(def.formType)"
        :class="isRange ? 'filter-chip-range is-temporal' : undefined"
      >
        <el-date-picker
          :type="datePickerType"
          :value-format="dateValueFormat"
          :model-value="temporalAt(0)"
          :placeholder="isRange ? '起' : (isDateTimeFormType(def.formType) ? '日期时间' : '日期')"
          clearable
          style="width: 100%"
          @update:model-value="(val: string | number | null) => setTemporalAt(0, val)"
        />
        <template v-if="isRange">
          <span class="filter-chip-range__sep">~</span>
          <el-date-picker
            :type="datePickerType"
            :value-format="dateValueFormat"
            :model-value="temporalAt(1)"
            placeholder="止"
            clearable
            style="width: 100%"
            @update:model-value="(val: string | number | null) => setTemporalAt(1, val)"
          />
        </template>
      </div>
    </el-form-item>
  </el-form>
</template>

<style scoped lang="scss">
.dash-filter-chip-popper__form:not(.is-bare) {
  :deep(.el-form-item) {
    display: flex;
    flex-direction: column;
    align-items: stretch;
  }

  :deep(.el-form-item__label) {
    justify-content: flex-start;
    margin-bottom: 0;
    padding-bottom: 4px;
    height: auto;
    line-height: 1.2;
  }
}

.filter-chip-fields.is-bare {
  width: 100%;
  max-width: 100%;
  padding: 0;
  --el-date-editor-width: 100%;

  :deep(.el-form-item),
  :deep(.el-form-item__content) {
    display: block;
    width: 100%;
    max-width: 100%;
    margin-left: 0;
    margin-bottom: 0;
  }

  :deep(.el-select),
  :deep(.el-input),
  :deep(.el-input-number),
  :deep(.el-input-tag),
  :deep(.el-date-editor),
  :deep(.el-date-editor.el-input),
  :deep(.el-date-editor.el-input__wrapper) {
    width: 100%;
    max-width: 100%;
  }

  .filter-chip-range {
    flex-direction: column;
    align-items: stretch;
    gap: 8px;
  }

  .filter-chip-range__sep {
    display: none;
  }
}

.filter-chip-range {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  max-width: 100%;
  min-width: 0;

  :deep(.el-input-number),
  :deep(.el-date-editor) {
    flex: 1;
    min-width: 0;
    max-width: 100%;
  }

  &.is-temporal {
    flex-direction: column;
    align-items: stretch;
    gap: 8px;
  }
}

.filter-chip-range__sep {
  flex-shrink: 0;
  color: var(--el-text-color-secondary);

  .is-temporal & {
    display: none;
  }
}
</style>
