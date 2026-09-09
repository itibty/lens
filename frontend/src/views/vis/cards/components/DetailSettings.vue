<script setup lang="ts">
import type { QueryIssue } from '../cardApi'
import type { DragFieldPayload, OrderPill } from '@/views/vis/shared/dnd'
import type { ResolvedFieldFormat } from '@/views/vis/shared/fieldStyle'
import type { DatasetField, VisDetailConfig, VisQueryConfig, VisVisualConfig } from '@/views/vis/shared/types'
import draggable from 'vuedraggable'
import NumberFormatFields from '@/views/vis/charts/style-forms/NumberFormatFields.vue'
import StyleFormLabel from '@/views/vis/charts/style-forms/StyleFormLabel.vue'
import StyleFormSection from '@/views/vis/charts/style-forms/StyleFormSection.vue'
import StyleFormShell from '@/views/vis/charts/style-forms/StyleFormShell.vue'
import { DEFAULT_DETAIL_LIMIT, defaultDetailFields, MAX_DETAIL_LIMIT, normalizeDetailConfig } from '@/views/vis/shared/detailConfig'
import { DND_GROUP } from '@/views/vis/shared/dnd'
import { FIELD_FORMAT_DEFAULTS } from '@/views/vis/shared/fieldStyle'
import { needsDataset } from '@/views/vis/shared/types'
import { pillMessage, shelfMessage } from '../cardApi'
import FieldPill from './FieldPill.vue'
import OrderShelf from './OrderShelf.vue'
import ShelfTitle from './ShelfTitle.vue'

const props = defineProps<{ query?: VisQueryConfig, fields?: DatasetField[], issues?: QueryIssue[] }>()
const visual = defineModel<VisVisualConfig>('visual', { required: true })
const openSections = ref<(string | number)[]>(['detail'])
const pickField = ref('')
const drafts = reactive<Record<string, { label: string, format: ResolvedFieldFormat }>>({})
const shelfError = computed(() => shelfMessage(props.issues, 'detail'))
const limitError = computed(() => pillMessage(props.issues, 'detail', 'detail:limit'))

watch(() => props.issues, (issues) => {
  if (!issues?.some(item => item.shelf === 'detail'))
    return
  if (!openSections.value.includes('detail'))
    openSections.value = [...openSections.value, 'detail']
}, { immediate: true })

function patch(patch: Partial<VisDetailConfig>) {
  visual.value.detail = normalizeDetailConfig({ ...visual.value.detail, ...patch })
}
const enabled = computed({
  get: () => !!visual.value.allowDetail,
  set: (value: boolean) => {
    visual.value.allowDetail = value
    if (value && visual.value.detail?.fields == null)
      patch({ fields: defaultDetailFields(props.query) })
  },
})
const fieldNames = computed(() => visual.value.detail?.fields ?? [])
const unusedFields = computed(() => (props.fields ?? []).filter(item => !fieldNames.value.includes(item.field)))
const fieldPills = computed({
  get: () => fieldNames.value.map(field => ({ _uid: `detail:${field}`, field })),
  set: (items: DragFieldPayload[]) => patch({ fields: [...new Set(items.map(item => item.field))] }),
})
const sortDimensions = computed(() => fieldNames.value.map(field => ({ field, _uid: `detail:${field}` })))
const maxRows = computed({
  get: () => visual.value.detail?.limit ?? DEFAULT_DETAIL_LIMIT,
  set: (limit: number) => patch({ limit }),
})
const invalidFields = computed(() => fieldNames.value.filter(field => !(props.fields ?? []).some(item => item.field === field)))

const orders = computed<OrderPill[]>({
  get: () => (visual.value.detail?.orderList ?? []).map(item => ({
    ...item,
    _uid: `detail-sort:${item.field}`,
    sourceUid: `detail:${item.field}`,
  })),
  set: items => patch({ orderList: items.map(({ field, dir }) => ({ field, dir })) }),
})

function addField(field: string) {
  if (field && !fieldNames.value.includes(field))
    patch({ fields: [...fieldNames.value, field] })
  pickField.value = ''
}
function removeField(field: string) {
  patch({ fields: fieldNames.value.filter(item => item !== field) })
  delete drafts[field]
}
function isNumber(field: string) {
  return props.fields?.find(item => item.field === field)?.dataType === 'number'
}
function openDraft(field: string) {
  const options = visual.value.detail?.fieldOptions?.[field]
  drafts[field] = { label: options?.label ?? '', format: { ...FIELD_FORMAT_DEFAULTS, ...options?.format } }
}
function confirmDraft(field: string) {
  const draft = drafts[field]
  if (!draft)
    return
  patch({ fieldOptions: {
    ...visual.value.detail?.fieldOptions,
    [field]: { label: draft.label.trim() || undefined, ...(isNumber(field) ? { format: { ...draft.format } } : {}) },
  } })
  delete drafts[field]
}
</script>

<template>
  <StyleFormShell v-if="needsDataset(visual.chartType)" v-model="openSections">
    <StyleFormSection title="明细" name="detail">
      <template #extra>
        <el-switch v-model="enabled" size="small" aria-label="允许查看明细" />
      </template>
      <template v-if="enabled">
        <div class="detail-fields" :class="{ 'is-invalid': !!shelfError }">
          <div class="detail-fields__head">
            <ShelfTitle tip="使用当前数据集，自动继承卡片筛选、看板筛选、模板参数和点击维度；展示原始记录，不重新聚合。">
              展示字段
            </ShelfTitle>
            <el-select v-model="pickField" size="small" filterable clearable placeholder="添加字段" class="detail-fields__picker" @change="addField">
              <el-option v-for="field in unusedFields" :key="field.field" :value="field.field" :label="field.field" />
            </el-select>
          </div>
          <draggable v-model="fieldPills" :group="{ name: DND_GROUP, pull: false, put: true }" item-key="_uid" handle=".field-pill__handle" :animation="180" class="detail-fields__drop" :class="{ 'is-empty': !fieldNames.length, 'is-invalid': !!shelfError }">
            <template #item="{ element }">
              <FieldPill
                :name="element.field"
                :subtitle="visual.detail?.fieldOptions?.[element.field]?.label"
                :tone="isNumber(element.field) ? 'metric' : 'dimension'"
                :error="shelfError && invalidFields.includes(element.field) ? shelfError : undefined"
                drag-handle block
                @open="openDraft(element.field)"
                @confirm="confirmDraft(element.field)"
                @remove="removeField(element.field)"
              >
                <template v-if="drafts[element.field]">
                  <el-form label-position="top" size="small" @submit.prevent>
                    <el-form-item label="显示名（可选）">
                      <el-input v-model="drafts[element.field].label" clearable placeholder="不填则使用字段名" />
                    </el-form-item>
                    <NumberFormatFields
                      v-if="isNumber(element.field)"
                      v-model:decimals="drafts[element.field].format.decimals"
                      v-model:prefix="drafts[element.field].format.prefix"
                      v-model:suffix="drafts[element.field].format.suffix"
                      v-model:separator="drafts[element.field].format.separator"
                      v-model:compact="drafts[element.field].format.compact"
                    />
                  </el-form>
                </template>
              </FieldPill>
            </template>
            <template #footer>
              <div v-if="!fieldNames.length && !shelfError" class="detail-fields__hint">
                从左侧拖入字段，至少选择一个字段
              </div>
            </template>
          </draggable>
          <div v-if="shelfError" class="detail-fields__error">
            {{ shelfError }}
          </div>
        </div>
        <OrderShelf v-model:order-list="orders" :dimensions="sortDimensions" :metrics="[]" empty-hint="选择已展示的明细字段" />
        <div class="detail-limit" :class="{ 'is-invalid': !!limitError }">
          <div class="vis-style-form__row">
            <StyleFormLabel tip="超过上限仅展示部分记录">
              行数上限
            </StyleFormLabel>
            <el-input-number v-model="maxRows" :min="1" :max="MAX_DETAIL_LIMIT" :value-on-clear="DEFAULT_DETAIL_LIMIT" controls-position="right" size="small" aria-label="行数上限" />
          </div>
          <div v-if="limitError" class="detail-fields__error">
            {{ limitError }}
          </div>
        </div>
      </template>
    </StyleFormSection>
  </StyleFormShell>
</template>

<style scoped lang="scss">
.detail-fields {
  padding: 10px 12px 12px;
  margin-bottom: 12px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
  background: var(--vis-shelf-well, var(--na-fill-color-light));

  &.is-invalid {
    border-color: var(--el-color-danger-light-5);
  }

  &__head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    margin-bottom: 8px;
  }

  &__picker {
    width: 130px;
    flex-shrink: 0;
  }

  &__drop {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 8px;
    border: 1px dashed var(--el-border-color);
    border-radius: 6px;
    background: var(--el-bg-color);

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

  &__hint {
    padding: 8px;
    font-size: var(--vis-cfg-hint-size, 12px);
    color: var(--el-text-color-placeholder);
    pointer-events: none;
  }
}

.detail-limit.is-invalid :deep(.el-input__wrapper) {
  box-shadow: 0 0 0 1px var(--el-color-danger-light-5) inset;
}
</style>
