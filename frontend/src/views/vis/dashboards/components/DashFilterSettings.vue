<!--
 * @Description: 看板配置 · 筛选器。左列表点一项编辑，只改草稿。
-->
<script setup lang="ts">
import type { DashFilterApplyAs, DashFilterFormType, DashFilterOptionItem, DashFilterOptionSource, DashFilterValue, VisDashFilterDef } from '../dashApi'
import type { FilterOp } from '@/views/vis/shared/filterValue'
import type { DatasetField, VisCard } from '@/views/vis/shared/types'
import vis from '@/apis/vis/index'
import { fromConfSqlField } from '@/views/vis/cards/cardApi'
import { filterOpLabel } from '@/views/vis/shared/filterValue'
import { dataTypeLabel } from '@/views/vis/shared/types'
import { useDatasetOptions } from '@/views/vis/shared/useDatasetOptions'
import {
  createEmptyFilterDef,
  dashFilterOpText,
  defaultFilterOp,
  defaultFormType,
  EMPTY_FILTER_VALUE,
  FORM_TYPE_OPTIONS,
  formTypeLabel,
  isBlankFilterValue,
  isTemporalFormType,
  needsFilterOp,
  needsOptions,
  opsForFormType,
  resolveManualOptions,
  snapshotFilterValue,
  suggestApplyAs,
} from '../dashApi'
import { FILTER_OPTIONS_LIMIT, filterOptionsErrorMessage, filterOptionsQuery, parseFilterOptionsRes } from '../useDashFilterOptions'
import DashFilterChipFields from './DashFilterChipFields.vue'

const props = defineProps<{
  cards: VisCard[]
}>()

const items = defineModel<VisDashFilterDef[]>('items', { required: true })

const APPLY_OPTIONS: Array<{ label: string, value: DashFilterApplyAs }> = [
  { label: '按字段筛选', value: 'filter' },
  { label: '作为参数', value: 'param' },
]

const SOURCE_OPTIONS: Array<{ label: string, value: DashFilterOptionSource }> = [
  { label: '手动填写', value: 'manual' },
  { label: '从数据集读取', value: 'dataset' },
]

const fields = ref<DatasetField[]>([])
const optionFields = ref<DatasetField[]>([])
const loadingFields = ref(false)
const loadingOptionFields = ref(false)
const selectedUid = ref('')

const selected = computed(() => items.value.find(item => item.uid === selectedUid.value) || null)
const targetDatasetId = computed(() => selected.value?.datasetId || '')
const optionDatasetId = computed(() => selected.value?.options?.datasetId || '')
const {
  datasets: targetDatasets,
  loading: loadingTargetDatasets,
  search: searchTargetDatasets,
  reload: reloadTargetDatasets,
} = useDatasetOptions(targetDatasetId)
const {
  datasets: optionDatasets,
  loading: loadingOptionDatasets,
  search: searchOptionDatasets,
  reload: reloadOptionDatasets,
} = useDatasetOptions(optionDatasetId)
const showOp = computed(() => selected.value ? needsFilterOp(selected.value) : false)
const opOptions = computed(() => selected.value ? opsForFormType(selected.value.formType) : [])
const showValueAs = computed(() => isTemporalFormType(selected.value?.formType))
const showOptions = computed(() => needsOptions(selected.value?.formType))
const optionSource = computed(() => selected.value?.options?.source || 'manual')
const manualItems = computed(() => {
  const opts = selected.value?.options
  if (!opts || opts.source === 'dataset')
    return []
  return (opts.items ?? []).map((item) => {
    if (typeof item === 'string')
      return { label: item, value: item }
    return {
      label: String(item.label ?? ''),
      value: String(item.value ?? ''),
    }
  })
})
const previewOptions = ref<DashFilterOptionItem[]>([])
const previewLoading = ref(false)
const previewError = ref('')
let previewSeq = 0

function createDatasetFieldLoader(
  target: Ref<DatasetField[]>,
  loading: Ref<boolean>,
) {
  let seq = 0
  return async (datasetId: string) => {
    const current = ++seq
    target.value = []
    if (!datasetId) {
      loading.value = false
      return
    }
    loading.value = true
    try {
      const res = await vis.dataset.listDatasetFieldsById({ datasetId })
      if (current !== seq)
        return
      target.value = (res.data ?? []).map(fromConfSqlField)
    }
    finally {
      if (current === seq)
        loading.value = false
    }
  }
}

const loadFields = createDatasetFieldLoader(fields, loadingFields)
const loadOptionFields = createDatasetFieldLoader(optionFields, loadingOptionFields)

function onTargetDatasetsVisible(visible: boolean) {
  if (visible)
    reloadTargetDatasets()
}

function onOptionDatasetsVisible(visible: boolean) {
  if (visible)
    reloadOptionDatasets()
}

function patchOptions(partial: Partial<NonNullable<VisDashFilterDef['options']>>) {
  const prev = selected.value?.options
  patchSelected({
    options: {
      source: 'dataset',
      datasetId: prev?.datasetId || '',
      field: prev?.field,
      labelField: prev?.labelField,
      ...partial,
    },
  })
}

function patchSelected(partial: Partial<VisDashFilterDef>) {
  const uid = selectedUid.value
  if (!uid)
    return
  items.value = items.value.map(item => item.uid === uid ? { ...item, ...partial } : item)
}

function selectItem(uid: string) {
  selectedUid.value = uid
}

function addItem() {
  const next = createEmptyFilterDef()
  items.value = [...items.value, next]
  selectedUid.value = next.uid
}

function removeSelected() {
  const uid = selectedUid.value
  if (!uid)
    return
  const index = items.value.findIndex(item => item.uid === uid)
  items.value = items.value.filter(item => item.uid !== uid)
  const fallback = items.value[Math.min(index, items.value.length - 1)]
  selectedUid.value = fallback?.uid || ''
}

function onFormTypeChange(formType: DashFilterFormType) {
  patchSelected({
    formType,
    op: defaultFilterOp(formType),
    valueAs: isTemporalFormType(formType) ? selected.value?.valueAs : undefined,
    options: needsOptions(formType)
      ? (selected.value?.options || { source: 'manual', items: [{ label: '', value: '' }] })
      : undefined,
    defaultValue: undefined,
  })
}

function onApplyAsChange(applyAs: DashFilterApplyAs) {
  patchSelected({
    applyAs,
    op: applyAs === 'filter' ? defaultFilterOp(selected.value?.formType || 'input') : undefined,
  })
}

function onValueAsChange(asTimestamp: boolean) {
  patchSelected({
    valueAs: asTimestamp ? 'timestamp' : undefined,
    defaultValue: undefined,
  })
}

function onOptionSourceChange(source: DashFilterOptionSource) {
  const prev = selected.value?.options
  if (source === 'dataset') {
    patchSelected({
      options: {
        source,
        datasetId: prev?.datasetId || '',
        field: prev?.field || '',
        labelField: prev?.labelField,
      },
      defaultValue: undefined,
    })
    return
  }
  const items = resolveManualOptions(prev)
  patchSelected({
    options: { source, items: items.length ? items : [{ label: '', value: '' }] },
    defaultValue: undefined,
  })
}

function clearOptionPreview() {
  previewSeq += 1
  previewOptions.value = []
  previewError.value = ''
  previewLoading.value = false
}

async function loadOptionPreview(datasetId: string, field: string, labelField?: string) {
  const query = filterOptionsQuery({
    options: { source: 'dataset', datasetId, field, labelField },
  })
  const seq = ++previewSeq
  previewError.value = ''
  if (!query) {
    previewOptions.value = []
    previewLoading.value = false
    return
  }
  previewLoading.value = true
  try {
    const res = await vis.query.listFilterOptions({
      ...query,
      limit: FILTER_OPTIONS_LIMIT,
    })
    if (seq !== previewSeq)
      return
    previewOptions.value = parseFilterOptionsRes(res).list
  }
  catch (err) {
    if (seq !== previewSeq)
      return
    previewOptions.value = []
    previewError.value = filterOptionsErrorMessage(err)
  }
  finally {
    if (seq === previewSeq)
      previewLoading.value = false
  }
}

function onOptionsDatasetChange(datasetId: string) {
  patchSelected({
    options: {
      source: 'dataset',
      datasetId: String(datasetId || '').trim(),
      field: '',
      labelField: undefined,
    },
    defaultValue: undefined,
  })
}

function onOptionFieldChange(field: string) {
  const prev = selected.value?.options
  patchSelected({
    options: {
      source: 'dataset',
      datasetId: prev?.datasetId || '',
      field,
      labelField: prev?.labelField,
    },
    defaultValue: undefined,
  })
}

function onOptionLabelFieldChange(labelField: string) {
  patchOptions({ labelField: labelField || undefined })
}

function setManualItems(next: DashFilterOptionItem[]) {
  patchSelected({
    options: { source: 'manual', items: next },
  })
}

function addManualRow() {
  setManualItems([...manualItems.value, { label: '', value: '' }])
}

function patchManualRow(index: number, partial: Partial<DashFilterOptionItem>) {
  setManualItems(manualItems.value.map((item, i) => i === index ? { ...item, ...partial } : item))
}

function removeManualRow(index: number) {
  setManualItems(manualItems.value.filter((_, i) => i !== index))
}

function patchDefault(next: DashFilterValue) {
  const merged = { ...snapshotFilterValue(selected.value?.defaultValue), ...next }
  patchSelected({
    defaultValue: isBlankFilterValue(merged) ? undefined : snapshotFilterValue(merged),
  })
}

function onTargetDatasetChange(datasetId: string) {
  patchSelected({
    datasetId,
    field: '',
    label: selected.value?.label || '',
    defaultValue: undefined,
  })
}

function onFieldChange(field: string) {
  const meta = fields.value.find(item => item.field === field)
  const formType = defaultFormType(meta?.dataType)
  const label = selected.value?.label?.trim()
  patchSelected({
    field,
    label: label || meta?.label || field,
    formType,
    applyAs: suggestApplyAs(selected.value?.datasetId || '', field, props.cards),
    op: defaultFilterOp(formType),
    valueAs: isTemporalFormType(formType) ? selected.value?.valueAs : undefined,
    options: needsOptions(formType)
      ? (selected.value?.options || { source: 'manual', items: [{ label: '', value: '' }] })
      : undefined,
    defaultValue: undefined,
  })
}

watch(
  () => selected.value?.datasetId,
  (id) => {
    void loadFields(id || '')
  },
)

watch(
  () => {
    if (!showOptions.value || optionSource.value !== 'dataset')
      return ''
    return String(selected.value?.options?.datasetId || '').trim()
  },
  (datasetId) => {
    void loadOptionFields(datasetId)
  },
  { immediate: true },
)

watch(
  items,
  (list) => {
    if (selectedUid.value && list.some(item => item.uid === selectedUid.value))
      return
    selectedUid.value = list[0]?.uid || ''
  },
  { immediate: true },
)

watch(
  () => {
    if (!showOptions.value || optionSource.value !== 'dataset')
      return ''
    const opts = selected.value?.options
    const datasetId = String(opts?.datasetId || '').trim()
    const field = String(opts?.field || '').trim()
    if (!datasetId || !field)
      return ''
    return [selected.value?.uid || '', datasetId, field, String(opts?.labelField || '').trim()].join('\u0001')
  },
  (key) => {
    if (!key) {
      clearOptionPreview()
      return
    }
    const [, datasetId, field, labelField] = key.split('\u0001')
    void loadOptionPreview(datasetId, field, labelField || undefined)
  },
  { immediate: true },
)
</script>

<template>
  <div
    class="filter-settings"
    :class="{ 'has-side': Boolean(selected && showOptions) }"
  >
    <aside class="filter-settings__list">
      <div class="filter-settings__list-head">
        <span>筛选</span>
        <div class="filter-settings__list-actions">
          <button
            type="button"
            class="filter-settings__icon-btn"
            title="添加"
            @click="addItem"
          >
            <span class="i-mingcute-add-line" />
          </button>
          <button
            type="button"
            class="filter-settings__icon-btn"
            title="删除"
            :disabled="!selected"
            @click="removeSelected"
          >
            <span class="i-mingcute-delete-2-line" />
          </button>
        </div>
      </div>
      <div class="filter-settings__list-body">
        <div
          v-if="!items.length"
          class="filter-settings__empty"
        >
          还没有筛选项
        </div>
        <button
          v-for="item in items"
          :key="item.uid"
          type="button"
          class="filter-settings__item"
          :class="{
            'is-active': item.uid === selectedUid,
            'is-incomplete': !item.field,
          }"
          @click="selectItem(item.uid)"
        >
          <span class="filter-settings__item-name">
            {{ item.label || item.field || '未命名' }}
          </span>
          <span class="filter-settings__item-meta">
            {{ formTypeLabel(item.formType) }}
            <template v-if="item.field"> · {{ item.field }}</template>
          </span>
        </button>
      </div>
    </aside>
    <div
      v-if="selected"
      class="filter-settings__editor"
    >
      <el-form
        class="filter-settings__form"
        label-position="top"
        @submit.prevent
      >
        <section class="filter-settings__block">
          <h3 class="filter-settings__block-title">
            筛选对象
          </h3>
          <el-form-item label="名称">
            <el-input
              :model-value="selected.label"
              placeholder="顶栏上显示的名称，默认用字段名"
              @update:model-value="(val: string) => patchSelected({ label: val })"
            />
          </el-form-item>
          <el-form-item label="筛选数据集">
            <el-select
              :model-value="selected.datasetId"
              filterable
              remote
              :loading="loadingTargetDatasets"
              :remote-method="searchTargetDatasets"
              placeholder="这项筛选作用在哪个数据集"
              @update:model-value="onTargetDatasetChange"
              @visible-change="onTargetDatasetsVisible"
            >
              <el-option
                v-for="item in targetDatasets"
                :key="item.id"
                :label="item.sqlName"
                :value="String(item.id)"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="筛选字段">
            <el-select
              :model-value="selected.field"
              filterable
              :loading="loadingFields"
              :disabled="!selected.datasetId"
              placeholder="按哪个字段筛"
              @update:model-value="onFieldChange"
            >
              <el-option
                v-for="item in fields"
                :key="item.field"
                :label="`${item.label || item.field}（${dataTypeLabel(item.dataType)}）`"
                :value="item.field"
              />
            </el-select>
          </el-form-item>
        </section>
        <section class="filter-settings__block">
          <h3 class="filter-settings__block-title">
            填写方式
          </h3>
          <el-form-item label="输入方式">
            <el-select
              :model-value="selected.formType"
              placeholder="顶栏里怎么填写"
              @update:model-value="onFormTypeChange"
            >
              <el-option
                v-for="item in FORM_TYPE_OPTIONS"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="作用方式">
            <el-select
              :model-value="selected.applyAs"
              placeholder="怎么应用到卡片"
              @update:model-value="onApplyAsChange"
            >
              <el-option
                v-for="item in APPLY_OPTIONS"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </el-select>
          </el-form-item>
          <el-form-item
            v-if="showOp"
            label="条件"
          >
            <el-select
              :model-value="selected.op || defaultFilterOp(selected.formType)"
              placeholder="请选择"
              @update:model-value="(op: FilterOp) => patchSelected({ op })"
            >
              <el-option
                v-for="op in opOptions"
                :key="op"
                :label="filterOpLabel(op)"
                :value="op"
              />
            </el-select>
          </el-form-item>
          <el-form-item
            v-if="showValueAs"
            label="按时间戳"
          >
            <div class="filter-settings__switch">
              <el-switch
                :model-value="selected.valueAs === 'timestamp'"
                @update:model-value="(val: string | number | boolean) => onValueAsChange(val === true)"
              />
              <span class="filter-settings__hint">
                默认按日期
              </span>
            </div>
          </el-form-item>
        </section>
        <section
          v-if="showOptions"
          class="filter-settings__block"
        >
          <h3 class="filter-settings__block-title">
            选项
          </h3>
          <el-form-item label="选项来源">
            <el-select
              :model-value="optionSource"
              placeholder="下拉选项从哪里来"
              @update:model-value="onOptionSourceChange"
            >
              <el-option
                v-for="item in SOURCE_OPTIONS"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </el-select>
          </el-form-item>
          <el-form-item
            v-if="optionSource === 'dataset'"
            label="选项数据集"
          >
            <el-select
              :model-value="selected.options?.datasetId || ''"
              filterable
              remote
              :loading="loadingOptionDatasets"
              :remote-method="searchOptionDatasets"
              placeholder="下拉选项从哪个数据集读"
              @update:model-value="onOptionsDatasetChange"
              @visible-change="onOptionDatasetsVisible"
            >
              <el-option
                v-for="item in optionDatasets"
                :key="`opt-${item.id}`"
                :label="item.sqlName"
                :value="String(item.id)"
              />
            </el-select>
          </el-form-item>
          <el-form-item
            v-if="optionSource === 'dataset'"
            label="选项值"
          >
            <el-select
              :model-value="selected.options?.field || ''"
              filterable
              :loading="loadingOptionFields"
              :disabled="!selected.options?.datasetId"
              placeholder="实际用来筛选的值"
              @update:model-value="onOptionFieldChange"
            >
              <el-option
                v-for="item in optionFields"
                :key="`val-${item.field}`"
                :label="`${item.label || item.field}（${dataTypeLabel(item.dataType)}）`"
                :value="item.field"
              />
            </el-select>
          </el-form-item>
          <el-form-item
            v-if="optionSource === 'dataset'"
            label="选项名"
          >
            <el-select
              :model-value="selected.options?.labelField || ''"
              filterable
              clearable
              :loading="loadingOptionFields"
              :disabled="!selected.options?.datasetId"
              placeholder="下拉里看到的文字，可不选"
              @update:model-value="onOptionLabelFieldChange"
            >
              <el-option
                v-for="item in optionFields"
                :key="`lab-${item.field}`"
                :label="`${item.label || item.field}（${dataTypeLabel(item.dataType)}）`"
                :value="item.field"
              />
            </el-select>
          </el-form-item>
        </section>
        <section class="filter-settings__block">
          <DashFilterChipFields
            bare
            :def="selected"
            :item="selected.defaultValue || EMPTY_FILTER_VALUE"
            :op-label="dashFilterOpText(selected)"
            @patch="patchDefault"
          />
        </section>
      </el-form>
    </div>
    <aside
      v-if="selected && showOptions"
      class="filter-settings__side"
    >
      <div class="filter-settings__side-head">
        <div class="filter-settings__side-title">
          {{ optionSource === 'dataset' ? '选项预览' : '自定义选项' }}
        </div>
        <div class="filter-settings__list-actions">
          <button
            v-if="optionSource === 'dataset'"
            type="button"
            class="filter-settings__icon-btn"
            title="刷新"
            :disabled="!selected.options?.datasetId || !selected.options?.field || previewLoading"
            @click="loadOptionPreview(String(selected.options?.datasetId || ''), String(selected.options?.field || ''), selected.options?.labelField)"
          >
            <span class="i-mingcute-refresh-2-line" />
          </button>
          <button
            v-else
            type="button"
            class="filter-settings__icon-btn"
            title="添加"
            @click="addManualRow"
          >
            <span class="i-mingcute-add-line" />
          </button>
        </div>
      </div>
      <div class="filter-settings__side-body">
        <template v-if="optionSource === 'dataset'">
          <div
            v-if="!selected.options?.datasetId"
            class="filter-settings__preview-state"
          >
            先选择选项数据集
          </div>
          <div
            v-else-if="!selected.options?.field"
            class="filter-settings__preview-state"
          >
            再选择选项值对应的字段
          </div>
          <div
            v-else-if="previewLoading"
            class="filter-settings__preview-state"
          >
            正在加载…
          </div>
          <div
            v-else-if="previewError"
            class="filter-settings__preview-state is-error"
          >
            {{ previewError }}
          </div>
          <div
            v-else-if="!previewOptions.length"
            class="filter-settings__preview-state"
          >
            没有可选项
          </div>
          <ul
            v-else
            class="filter-settings__preview-list"
          >
            <li
              v-for="(opt, index) in previewOptions"
              :key="`${opt.value}-${index}`"
              class="filter-settings__preview-item"
            >
              <span class="filter-settings__preview-label">
                {{ opt.label }}
              </span>
              <span
                v-if="opt.value && opt.value !== opt.label"
                class="filter-settings__preview-value"
              >
                {{ opt.value }}
              </span>
            </li>
            <li class="filter-settings__preview-item is-note">
              仅显示前 {{ FILTER_OPTIONS_LIMIT }} 项
            </li>
          </ul>
        </template>
        <div
          v-else
          class="filter-settings__manual"
        >
          <div
            v-for="(row, index) in manualItems"
            :key="index"
            class="filter-settings__manual-row"
          >
            <el-input
              :model-value="row.label"
              placeholder="显示文字"
              @update:model-value="(val: string) => patchManualRow(index, { label: val })"
            />
            <el-input
              :model-value="row.value"
              placeholder="选项值"
              @update:model-value="(val: string) => patchManualRow(index, { value: val })"
            />
            <button
              type="button"
              class="filter-settings__icon-btn"
              title="删除"
              @click="removeManualRow(index)"
            >
              <span class="i-mingcute-delete-2-line" />
            </button>
          </div>
        </div>
      </div>
    </aside>
    <div
      v-else-if="!selected"
      class="filter-settings__placeholder"
    >
      <span class="filter-settings__placeholder-icon i-mingcute-filter-2-line" />
      从左侧添加一项筛选
    </div>
  </div>
</template>

<style scoped lang="scss">
.filter-settings {
  display: grid;
  grid-template-columns: 196px minmax(0, 1fr);
  flex: 1;
  min-height: 320px;
  height: 100%;
  overflow: hidden;

  &.has-side {
    grid-template-columns: 196px minmax(260px, 1fr) minmax(280px, 1.05fr);
  }
}

.filter-settings__list {
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
  border-right: 1px solid var(--el-border-color-extra-light);
  background: var(--el-fill-color-lighter);
}

.filter-settings__list-head {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 12px 10px 8px 14px;
  font-size: 13px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.filter-settings__list-body {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: 2px 0 8px;
}

.filter-settings__list-actions {
  display: flex;
  align-items: center;
  gap: 2px;
}

.filter-settings__icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  padding: 0;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--el-text-color-regular);
  cursor: pointer;

  .i-mingcute-add-line,
  .i-mingcute-delete-2-line,
  .i-mingcute-refresh-2-line {
    width: 16px;
    height: 16px;
  }

  &:hover:not(:disabled) {
    background: var(--el-fill-color);
    color: var(--el-color-primary);
  }

  &:disabled {
    color: var(--el-text-color-placeholder);
    cursor: not-allowed;
  }
}

.filter-settings__empty {
  padding: 20px 16px;
  color: var(--el-text-color-placeholder);
  font-size: 12px;
  line-height: 1.5;
}

.filter-settings__item {
  display: flex;
  flex-direction: column;
  gap: 2px;
  width: calc(100% - 16px);
  margin: 0 8px 4px;
  padding: 8px 10px;
  border: none;
  border-radius: 8px;
  background: transparent;
  text-align: left;
  cursor: pointer;

  &:hover:not(.is-active) {
    background: var(--el-fill-color);
  }

  &.is-active {
    background: var(--el-color-primary-light-9);

    .filter-settings__item-name {
      color: var(--el-color-primary);
    }

    .filter-settings__item-meta {
      color: color-mix(in srgb, var(--el-color-primary) 62%, var(--el-text-color-placeholder));
    }

    &.is-incomplete .filter-settings__item-name {
      color: color-mix(in srgb, var(--el-color-primary) 72%, var(--el-text-color-regular));
    }
  }

  &.is-incomplete:not(.is-active) .filter-settings__item-name {
    color: var(--el-text-color-secondary);
  }
}

.filter-settings__item-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 13px;
  color: var(--el-text-color-primary);
}

.filter-settings__item-meta {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 11px;
  color: var(--el-text-color-placeholder);
}

.filter-settings__editor {
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  overflow: auto;
  padding: 16px 16px 20px;
  background: var(--el-bg-color);
}

.filter-settings__block {
  min-width: 0;
  padding: 12px 14px 14px;
  border-radius: 8px;
  background: var(--el-fill-color-lighter);
}

.filter-settings__block-title {
  margin: 0 0 10px;
  font-size: 13px;
  font-weight: 600;
  line-height: 1.3;
  color: var(--el-text-color-primary);
}

.filter-settings__form {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-width: 360px;

  :deep(.dash-filter-chip-popper__form) {
    width: 100%;
    max-width: 100%;
    padding: 0;
  }

  :deep(.el-form-item) {
    margin-bottom: 16px;
  }

  :deep(.filter-settings__block .el-form-item:last-child) {
    margin-bottom: 0;
  }

  :deep(.el-form-item__label) {
    margin-bottom: 0;
    padding-bottom: 6px;
    height: auto;
    line-height: 1.2;
  }

  :deep(.el-select),
  :deep(.el-input),
  :deep(.el-input-number),
  :deep(.el-input-tag),
  :deep(.el-date-editor) {
    width: 100%;
    max-width: 100%;
  }
}

.filter-settings__side {
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  border-left: 1px solid var(--el-border-color-extra-light);
  background: var(--el-fill-color-lighter);
}

.filter-settings__side-head {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 12px 10px 8px 14px;
  font-size: 13px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.filter-settings__side-title {
  min-width: 0;
}

.filter-settings__side-body {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: 0 12px 12px;
}

.filter-settings__switch {
  display: flex;
  align-items: center;
  min-height: 32px;
}

.filter-settings__hint {
  margin-left: 8px;
  font-size: 12px;
  color: var(--el-text-color-placeholder);
}

.filter-settings__preview-item.is-note {
  justify-content: center;
  color: var(--el-text-color-placeholder);
  font-size: 12px;
}

.filter-settings__preview-state {
  padding: 16px 4px;
  color: var(--el-text-color-placeholder);
  font-size: 13px;
  line-height: 1.5;

  &.is-error {
    color: var(--el-color-danger);
  }
}

.filter-settings__preview-list {
  margin: 0;
  padding: 0;
  list-style: none;
  border: 1px solid var(--el-border-color-extra-light);
  border-radius: 6px;
  background: var(--el-bg-color);
}

.filter-settings__preview-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 12px;
  border-top: 1px solid var(--el-border-color-extra-light);
  font-size: 13px;
  line-height: 1.4;

  &:first-child {
    border-top: none;
  }
}

.filter-settings__preview-label {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--el-text-color-primary);
}

.filter-settings__preview-value {
  flex-shrink: 0;
  color: var(--el-text-color-placeholder);
}

.filter-settings__manual {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
}

.filter-settings__manual-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) 26px;
  gap: 8px;
  align-items: center;
}

.filter-settings__placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 0;
  padding: 24px 16px;
  color: var(--el-text-color-placeholder);
  font-size: 13px;
  line-height: 1.5;
}

.filter-settings__placeholder-icon {
  width: 28px;
  height: 28px;
  color: var(--el-text-color-disabled);
}
</style>
