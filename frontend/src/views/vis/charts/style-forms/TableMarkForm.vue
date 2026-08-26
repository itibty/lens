<!--
 * @Description: 表格 / 透视数据标注
-->
<script setup lang="ts">
import type { FilterConditionDraft, FilterOp } from '@/views/vis/shared/filterValue'
import type { DatasetField, VisQueryConfig, VisTableMarkFilter, VisTableMarkRule, VisVisualConfig } from '@/views/vis/shared/types'
import FieldPill from '@/views/vis/cards/components/FieldPill.vue'
import FilterConditionForm from '@/views/vis/cards/components/FilterConditionForm.vue'
import { createDragUid } from '@/views/vis/shared/dnd'
import {
  applyFilterConditionDraft,
  defaultValueForOp,
  formatFilterConditionTip,
  opsForDataType,
  toFilterConditionDraft,
} from '@/views/vis/shared/filterValue'
import {
  emptyMarkRule,
  listMarkableFields,
  markFieldDataType,
} from '@/views/vis/shared/tableMark'
import { isDateField } from '@/views/vis/shared/types'

type StyleColorKey = 'color' | 'bgColor'
type MarkFilterView = VisTableMarkFilter & { _uid: string }

interface MarkFilterDraft extends FilterConditionDraft {
  field: string
}

const props = defineProps<{
  query?: VisQueryConfig
  fields?: DatasetField[]
}>()

const visual = defineModel<VisVisualConfig>('visual', { required: true })

const STYLE_PALETTES = [
  {
    key: 'color' as const,
    colors: [
      '#F5222D',
      '#FA541C',
      '#FA8C16',
      '#FADB14',
      '#52C41A',
      '#13C2C2',
      '#1677FF',
      '#2F54EB',
      '#722ED1',
      '#EB2F96',
      '#8C8C8C',
      '#141414',
    ],
    placeholder: '#1677FF',
  },
  {
    key: 'bgColor' as const,
    colors: [
      '#FFCCC7',
      '#FFD8BF',
      '#FFE7BA',
      '#FFF1B8',
      '#D9F7BE',
      '#B5F5EC',
      '#BAE0FF',
      '#D6E4FF',
      '#EFDBFF',
      '#FFD6E7',
      '#D9D9D9',
      '#BFBFBF',
    ],
    placeholder: '#BAE0FF',
  },
]

function normalizeHex(raw?: string) {
  if (!raw)
    return
  const text = raw.trim()
  const hex = text.startsWith('#') ? text : `#${text}`
  if (/^#[\da-f]{3}$/i.test(hex)) {
    const r = hex[1]
    const g = hex[2]
    const b = hex[3]
    return `#${r}${r}${g}${g}${b}${b}`.toUpperCase()
  }
  if (/^#[\da-f]{6}$/i.test(hex))
    return hex.toUpperCase()
}

const fieldOptions = computed(() =>
  listMarkableFields(props.query, props.fields, visual.value.chartType),
)

const drafts = reactive<Record<string, MarkFilterDraft>>({})
const hexFocus = ref<{ index: number, key: StyleColorKey, text: string } | null>(null)

const rules = computed({
  get: () => visual.value.table?.marks ?? [],
  set: (next: VisTableMarkRule[]) => {
    const table = { ...visual.value.table }
    if (!next.length)
      delete table.marks
    else
      table.marks = next
    if (!Object.keys(table).length)
      delete visual.value.table
    else
      visual.value.table = table
  },
})

const ruleRows = computed(() =>
  rules.value.map((rule, ruleIndex) => ({
    rule,
    ruleIndex,
    filters: (rule.filters ?? []).map((item, filterIndex) => {
      const key = filterKey(ruleIndex, filterIndex, item)
      return { item, filterIndex, key, draft: drafts[key] }
    }),
  })),
)

function patchRule(index: number, partial: Partial<VisTableMarkRule>) {
  rules.value = rules.value.map((rule, i) => i === index ? { ...rule, ...partial } : rule)
}

function fieldType(alias?: string) {
  return markFieldDataType(fieldOptions.value, alias)
}

function swatchOn(current: string | undefined, color: string) {
  return normalizeHex(current) === normalizeHex(color)
}

function hexValue(index: number, key: StyleColorKey) {
  if (hexFocus.value?.index === index && hexFocus.value.key === key)
    return hexFocus.value.text
  return rules.value[index]?.style?.[key] ?? ''
}

function patchStyle(index: number, key: StyleColorKey | 'bold' | 'italic', value: string | boolean | undefined) {
  const style = { ...rules.value[index]?.style }
  if (value === undefined || value === false || value === '')
    delete style[key]
  else
    (style as Record<string, unknown>)[key] = value
  patchRule(index, { style })
}

function pickColor(index: number, key: StyleColorKey, color: string) {
  const next = swatchOn(rules.value[index]?.style?.[key], color) ? undefined : color
  patchStyle(index, key, next)
  if (hexFocus.value?.index === index && hexFocus.value.key === key)
    hexFocus.value = next ? { index, key, text: next } : null
}

function clearColor(index: number, key: StyleColorKey) {
  patchStyle(index, key, undefined)
  if (hexFocus.value?.index === index && hexFocus.value.key === key)
    hexFocus.value = null
}

function onHexInput(index: number, key: StyleColorKey, raw: string) {
  hexFocus.value = { index, key, text: raw }
  const hex = normalizeHex(raw)
  if (hex)
    patchStyle(index, key, hex)
}

function onHexBlur(index: number, key: StyleColorKey) {
  const raw = hexFocus.value?.index === index && hexFocus.value.key === key
    ? hexFocus.value.text
    : ''
  hexFocus.value = null
  if (!raw.trim()) {
    patchStyle(index, key, undefined)
    return
  }
  const hex = normalizeHex(raw)
  if (hex)
    patchStyle(index, key, hex)
}

function addRule() {
  rules.value = [...rules.value, emptyMarkRule()]
}

function removeRule(index: number) {
  for (const [filterIndex, item] of (rules.value[index]?.filters ?? []).entries())
    delete drafts[filterKey(index, filterIndex, item)]
  rules.value = rules.value.filter((_, i) => i !== index)
}

function addFilter(index: number) {
  const first = fieldOptions.value[0]
  const dataType = first?.dataType || 'string'
  const op = (opsForDataType(dataType)[0] || 'eq') as FilterOp
  const item: MarkFilterView = {
    _uid: createDragUid(),
    field: first?.alias || '',
    op,
    value: defaultValueForOp(op, dataType),
  }
  patchRule(index, { filters: [...(rules.value[index]?.filters ?? []), item] })
}

function patchFilter(ruleIndex: number, filterIndex: number, partial: Partial<MarkFilterView>) {
  patchRule(ruleIndex, {
    filters: (rules.value[ruleIndex]?.filters ?? []).map((item, i) =>
      i === filterIndex ? { ...item, ...partial } : item,
    ),
  })
}

function filterKey(ruleIndex: number, filterIndex: number, item: VisTableMarkFilter) {
  return (item as MarkFilterView)._uid || `r${ruleIndex}f${filterIndex}`
}

function removeFilter(ruleIndex: number, filterIndex: number) {
  const item = rules.value[ruleIndex]?.filters?.[filterIndex]
  if (item)
    delete drafts[filterKey(ruleIndex, filterIndex, item)]
  patchRule(ruleIndex, {
    filters: (rules.value[ruleIndex]?.filters ?? []).filter((_, i) => i !== filterIndex),
  })
}

function openDraft(ruleIndex: number, filterIndex: number) {
  const item = rules.value[ruleIndex]?.filters?.[filterIndex]
  if (!item)
    return
  drafts[filterKey(ruleIndex, filterIndex, item)] = {
    field: item.field,
    ...toFilterConditionDraft(item, fieldType(item.field)),
  }
}

function confirmDraft(ruleIndex: number, filterIndex: number) {
  const item = rules.value[ruleIndex]?.filters?.[filterIndex]
  if (!item)
    return
  const key = filterKey(ruleIndex, filterIndex, item)
  const draft = drafts[key]
  if (!draft)
    return
  const next: MarkFilterView = { ...item, _uid: key, field: draft.field }
  applyFilterConditionDraft(next, draft, fieldType(draft.field))
  patchFilter(ruleIndex, filterIndex, next)
  delete drafts[key]
}

function onDraftFieldChange(key: string, alias: string) {
  const draft = drafts[key]
  if (!draft)
    return
  const dataType = fieldType(alias)
  drafts[key] = draft.mode === 'exp' && isDateField(dataType)
    ? { ...draft, field: alias }
    : { field: alias, ...toFilterConditionDraft({}, dataType) }
}

defineExpose({ addRule })
</script>

<template>
  <div class="table-mark">
    <div
      v-for="row in ruleRows"
      :key="row.ruleIndex"
      class="table-mark__group"
    >
      <div class="table-mark__group-title">
        <span class="table-mark__group-name">
          标注组 {{ row.ruleIndex + 1 }}
        </span>
        <button
          type="button"
          class="vis-icon-btn"
          title="删除标注组"
          @click="removeRule(row.ruleIndex)"
        >
          <span class="i-mingcute-close-line" />
        </button>
      </div>

      <div class="vis-style-form__row is-block">
        <div class="vis-style-form__label">
          字段
        </div>
        <el-select
          :model-value="row.rule.fields"
          class="table-mark__fields"
          multiple
          collapse-tags
          collapse-tags-tooltip
          placeholder="选择字段"
          @update:model-value="(value: string[]) => patchRule(row.ruleIndex, { fields: value })"
        >
          <el-option
            v-for="item in fieldOptions"
            :key="item.alias"
            :label="item.alias"
            :value="item.alias"
          />
        </el-select>
      </div>

      <div class="vis-style-form__row is-block">
        <div class="vis-style-form__label">
          样式
        </div>
        <div class="table-mark__toolbar">
          <button
            type="button"
            class="table-mark__tool"
            :class="{ 'is-on': !!row.rule.style?.bold }"
            @click="patchStyle(row.ruleIndex, 'bold', !row.rule.style?.bold)"
          >
            <span
              class="table-mark__icon"
              :class="row.rule.style?.bold ? 'i-mingcute-bold-fill' : 'i-mingcute-bold-line'"
            />
          </button>
          <button
            type="button"
            class="table-mark__tool"
            :class="{ 'is-on': !!row.rule.style?.italic }"
            @click="patchStyle(row.ruleIndex, 'italic', !row.rule.style?.italic)"
          >
            <span
              class="table-mark__icon"
              :class="row.rule.style?.italic ? 'i-mingcute-italic-fill' : 'i-mingcute-italic-line'"
            />
          </button>
          <el-popover
            v-for="palette in STYLE_PALETTES"
            :key="palette.key"
            placement="bottom"
            :width="220"
            trigger="hover"
            :show-after="200"
          >
            <template #reference>
              <button
                type="button"
                class="table-mark__tool"
                :class="{ 'is-on': !!row.rule.style?.[palette.key] }"
                :style="palette.key === 'color' && row.rule.style?.color ? { color: row.rule.style.color } : undefined"
              >
                <span
                  v-if="palette.key === 'color'"
                  class="table-mark__icon"
                  :class="row.rule.style?.color ? 'i-mingcute-text-color-fill' : 'i-mingcute-text-color-line'"
                />
                <span
                  v-else
                  class="table-mark__bg"
                >
                  <span class="table-mark__bg-letter">A</span>
                  <i
                    class="table-mark__bg-bar"
                    :style="{ background: row.rule.style?.bgColor || 'currentColor' }"
                  />
                </span>
              </button>
            </template>
            <div class="table-mark__palette">
              <div class="table-mark__swatches">
                <button
                  v-for="color in palette.colors"
                  :key="color"
                  type="button"
                  class="table-mark__swatch"
                  :class="{ 'is-on': swatchOn(row.rule.style?.[palette.key], color) }"
                  :style="{ background: color }"
                  @click="pickColor(row.ruleIndex, palette.key, color)"
                />
              </div>
              <div class="table-mark__hex">
                <el-input
                  :model-value="hexValue(row.ruleIndex, palette.key)"
                  size="small"
                  maxlength="7"
                  :placeholder="palette.placeholder"
                  @update:model-value="(value: string) => onHexInput(row.ruleIndex, palette.key, value)"
                  @blur="onHexBlur(row.ruleIndex, palette.key)"
                />
                <button
                  type="button"
                  class="table-mark__clear"
                  :disabled="!row.rule.style?.[palette.key]"
                  @click="clearColor(row.ruleIndex, palette.key)"
                >
                  清空
                </button>
              </div>
            </div>
          </el-popover>
        </div>
      </div>

      <div class="vis-style-form__row">
        <div class="vis-style-form__label">
          条件
        </div>
        <div class="table-mark__cond">
          <el-radio-group
            v-if="row.filters.length > 1"
            :model-value="row.rule.combineOp === 'or' ? 'or' : 'and'"
            size="small"
            @update:model-value="(value: string | number | boolean | undefined) => patchRule(row.ruleIndex, { combineOp: value === 'or' ? 'or' : 'and' })"
          >
            <el-radio-button value="and">
              全部
            </el-radio-button>
            <el-radio-button value="or">
              任一
            </el-radio-button>
          </el-radio-group>
          <button
            type="button"
            class="vis-icon-btn"
            title="添加"
            @click="addFilter(row.ruleIndex)"
          >
            <span class="i-mingcute-add-line" />
          </button>
        </div>
      </div>

      <div
        v-if="row.filters.length"
        class="table-mark__pills"
      >
        <FieldPill
          v-for="filter in row.filters"
          :key="filter.key"
          :name="filter.item.field || '字段'"
          :tip="formatFilterConditionTip(filter.item)"
          tone="filter"
          block
          :popover-width="320"
          @open="openDraft(row.ruleIndex, filter.filterIndex)"
          @confirm="confirmDraft(row.ruleIndex, filter.filterIndex)"
          @remove="removeFilter(row.ruleIndex, filter.filterIndex)"
        >
          <FilterConditionForm
            v-if="filter.draft"
            v-model="drafts[filter.key]"
            :data-type="fieldType(filter.draft.field)"
            :show-hint="false"
          >
            <template #prepend>
              <el-form-item label="字段">
                <el-select
                  :model-value="filter.draft.field"
                  class="w-full"
                  @update:model-value="(value: string) => onDraftFieldChange(filter.key, value)"
                >
                  <el-option
                    v-for="opt in fieldOptions"
                    :key="opt.alias"
                    :label="opt.alias"
                    :value="opt.alias"
                  />
                </el-select>
              </el-form-item>
            </template>
          </FilterConditionForm>
        </FieldPill>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.table-mark {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.table-mark__group {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 8px 10px;
  border: 1px solid var(--el-border-color-extra-light);
  border-radius: 8px;
  background: var(--el-fill-color-lighter);
}

.table-mark__group-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-height: 22px;
}

.table-mark__group-name {
  font-size: var(--vis-cfg-group-size, 12px);
  font-weight: var(--vis-cfg-group-weight, 500);
  color: var(--vis-cfg-group-color, var(--el-text-color-regular));
  line-height: 1.3;
  white-space: nowrap;
}

.table-mark__fields {
  width: 100%;
  min-width: 0;
}

.table-mark__cond {
  display: inline-flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  min-width: 0;
}

.table-mark__toolbar {
  display: flex;
  width: 100%;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
  overflow: hidden;
  background: var(--el-bg-color);

  > * {
    flex: 1 1 0;
    min-width: 0;
    display: flex;
  }

  > :not(:last-child) {
    border-right: 1px solid var(--el-border-color-extra-light);
  }
}

.table-mark__tool {
  width: 100%;
  height: 32px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 0;
  background: transparent;
  color: var(--el-text-color-regular);
  cursor: pointer;

  &:hover {
    background: var(--el-fill-color-light);
  }

  &.is-on {
    background: var(--el-fill-color);
    box-shadow: inset 0 0 0 1px var(--el-border-color);
  }
}

.table-mark__icon {
  font-size: 16px;
  pointer-events: none;
}

.table-mark__bg {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  pointer-events: none;
}

.table-mark__bg-letter {
  font-family: Georgia, 'Times New Roman', serif;
  font-size: 13px;
  font-weight: 700;
  line-height: 1;
}

.table-mark__bg-bar {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 3px;
  border-radius: 1px;
}

.table-mark__palette {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.table-mark__swatches {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 6px;
}

.table-mark__swatch {
  width: 22px;
  height: 22px;
  padding: 0;
  border: 1px solid rgb(0 0 0 / 8%);
  border-radius: 4px;
  cursor: pointer;

  &.is-on {
    box-shadow: 0 0 0 2px var(--el-color-primary-light-5);
  }
}

.table-mark__hex {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;

  :deep(.el-input) {
    flex: 1 1 0;
    min-width: 0;
  }
}

.table-mark__clear {
  flex-shrink: 0;
  padding: 0;
  border: none;
  background: transparent;
  font-size: 12px;
  line-height: 1;
  color: var(--el-color-primary);
  cursor: pointer;

  &:hover:not(:disabled) {
    color: var(--el-color-primary-light-3);
  }

  &:disabled {
    color: var(--el-text-color-placeholder);
    cursor: default;
  }
}

.table-mark__pills {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
</style>
