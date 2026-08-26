<!--
 * @Description: WHERE filters — FilterGroup[]（组间 AND，组内 and/or）
-->
<script setup lang="ts">
import type { QueryIssue } from '../cardApi'
import type { DragFieldPayload, FilterPill } from '@/views/vis/shared/dnd'
import type { FilterConditionDraft, FilterOp } from '@/views/vis/shared/filterValue'
import type { DatasetField, DatasetFieldDataType } from '@/views/vis/shared/types'
import draggable from 'vuedraggable'
import { defaultDateExpValue } from '@/views/vis/shared/dateExp'
import {
  createDragUid,
  DND_GROUP,
  toFilterPill,
} from '@/views/vis/shared/dnd'
import {
  applyFilterConditionDraft,
  defaultValueForOp,
  formatFilterConditionTip,
  opsForDataType,
  toFilterConditionDraft,
} from '@/views/vis/shared/filterValue'
import { pillMessage, shelfMessage } from '../cardApi'
import FieldPill from './FieldPill.vue'
import FilterConditionForm from './FilterConditionForm.vue'
import ShelfTitle from './ShelfTitle.vue'

interface FilterGroupView {
  _uid: string
  combineOp: 'and' | 'or'
  conditions: FilterPill[]
}

const props = defineProps<{
  fields: DatasetField[]
  issues?: QueryIssue[]
}>()

const shelfError = computed(() => shelfMessage(props.issues, 'filters'))

function pillError(uid: string) {
  return pillMessage(props.issues, 'filters', uid)
}

const filters = defineModel<VIS.FilterGroup[]>('filters', { required: true })

const groups = ref<FilterGroupView[]>([])
const drafts = reactive<Record<string, FilterConditionDraft>>({})
let syncing = false

const fieldTypeMap = computed(() => {
  const map = new Map<string, DatasetFieldDataType>()
  for (const f of props.fields ?? []) {
    if (f.dataType)
      map.set(f.field, f.dataType)
  }
  return map
})

function fieldType(field: string): DatasetFieldDataType {
  return fieldTypeMap.value.get(field) || 'string'
}

function emptyGroup(): FilterGroupView {
  return {
    _uid: createDragUid(),
    combineOp: 'and',
    conditions: [],
  }
}

function hydrateCondition(item: FilterPill | VIS.FilterItem): FilterPill {
  const dataType = fieldType(item.field)
  if (item.valueExp) {
    return {
      ...item,
      _uid: (item as FilterPill)._uid || createDragUid(),
      value: (item.value ?? defaultDateExpValue(item.valueExp)) as VIS.FilterItem['value'],
    }
  }
  const allowed = opsForDataType(dataType)
  const op = (item.op && allowed.includes(item.op) ? item.op : allowed[0]) as FilterOp
  return {
    ...item,
    _uid: (item as FilterPill)._uid || createDragUid(),
    op,
    value: (item.value ?? defaultValueForOp(op, dataType)) as VIS.FilterItem['value'],
  }
}

function pullFromModel() {
  syncing = true
  const raw = filters.value ?? []
  // 无已保存条件时不默认创建条件组
  groups.value = raw.length
    ? raw.map(group => ({
        _uid: createDragUid(),
        combineOp: group.combineOp === 'or' ? 'or' : 'and',
        conditions: (group.conditions as FilterPill[]).map(hydrateCondition),
      }))
    : []
  nextTick(() => {
    syncing = false
  })
}

function pushToModel() {
  const next = groups.value
    .map(group => ({
      combineOp: group.combineOp,
      conditions: group.conditions.map((item) => {
        const { label: _label, ...rest } = item
        return rest
      }),
    }))
    .filter(group => group.conditions.length > 0)
  filters.value = next
}

function pushSafely() {
  if (syncing)
    return
  syncing = true
  pushToModel()
  nextTick(() => {
    syncing = false
  })
}

watch(
  () => filters.value,
  () => {
    if (syncing)
      return
    pullFromModel()
  },
  { immediate: true },
)
watch(groups, pushSafely, { deep: true })

function addGroup() {
  groups.value = [...groups.value, emptyGroup()]
}

function removeGroup(index: number) {
  groups.value.splice(index, 1)
}

function onAdd(group: FilterGroupView, evt: { newIndex?: number }) {
  const index = evt.newIndex
  if (index == null)
    return
  const raw = group.conditions[index] as DragFieldPayload | FilterPill
  const dataType = fieldType(raw.field) || (raw as DragFieldPayload).dataType || 'string'
  const pill = toFilterPill(raw)
  const allowed = opsForDataType(dataType)
  if (!pill.op || !allowed.includes(pill.op))
    pill.op = allowed[0]
  delete pill.value
  delete pill.valueExp
  group.conditions[index] = pill
}

function removeAt(group: FilterGroupView, index: number) {
  const item = group.conditions[index]
  if (item)
    delete drafts[item._uid]
  group.conditions.splice(index, 1)
}

function openDraft(item: FilterPill) {
  drafts[item._uid] = toFilterConditionDraft(item, fieldType(item.field))
}

function confirmDraft(item: FilterPill) {
  const draft = drafts[item._uid]
  if (!draft)
    return
  applyFilterConditionDraft(item, draft, fieldType(item.field))
  delete drafts[item._uid]
}
</script>

<template>
  <div class="shelf" :class="{ 'is-invalid': !!shelfError }">
    <div class="shelf__title">
      <ShelfTitle tip="只留下符合条件的数据">
        筛选
      </ShelfTitle>
    </div>

    <div
      v-if="groups.length"
      class="shelf__groups"
    >
      <div
        v-for="(group, gIndex) in groups"
        :key="group._uid"
        class="filter-group"
      >
        <div class="filter-group__title flex items-center justify-between gap-8px">
          <span class="filter-group__name">
            条件组 {{ gIndex + 1 }}
          </span>
          <div class="filter-group__actions flex items-center gap-4px">
            <el-radio-group v-model="group.combineOp" size="small">
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
              title="删除条件组"
              @click="removeGroup(gIndex)"
            >
              <span class="i-mingcute-close-line" />
            </button>
          </div>
        </div>

        <div class="filter-group__body">
          <draggable
            v-model="group.conditions"
            class="shelf__drop"
            :class="{ 'is-empty': !group.conditions.length, 'is-invalid': !!shelfError }"
            :group="DND_GROUP"
            handle=".field-pill__handle"
            :animation="180"
            item-key="_uid"
            @add="onAdd(group, $event)"
          >
            <template #item="{ element, index }">
              <div class="shelf__pill-wrap">
                <FieldPill
                  :name="element.field"
                  :tip="formatFilterConditionTip(element)"
                  :error="pillError(element._uid)"
                  tone="filter"

                  drag-handle block
                  :popover-width="320"
                  @open="openDraft(element)"
                  @confirm="confirmDraft(element)"
                  @remove="removeAt(group, index)"
                >
                  <FilterConditionForm
                    v-if="drafts[element._uid]"
                    v-model="drafts[element._uid]"
                    :data-type="fieldType(element.field)"
                  />
                </FieldPill>
              </div>
            </template>
          </draggable>
          <div
            v-if="!group.conditions.length"
            class="filter-group__hint"
          >
            从左侧拖入字段
          </div>
        </div>
      </div>
    </div>

    <button
      type="button"
      class="shelf__add"
      @click="addGroup"
    >
      <span class="i-mingcute-add-line" />
      <span>添加条件组</span>
    </button>
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

  &__groups {
    display: flex;
    flex-direction: column;
    gap: 10px;
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

  &__add {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    width: 100%;
    min-height: 28px;
    margin: 0;
    padding: 0;
    border: 1px dashed var(--el-border-color);
    border-radius: 6px;
    background: #fff;
    color: var(--el-text-color-secondary);
    font-size: 12px;
    line-height: 1;
    cursor: pointer;
    box-sizing: border-box;
    transition:
      border-color 0.15s ease,
      background 0.15s ease,
      color 0.15s ease;

    > .i-mingcute-add-line {
      font-size: 14px;
    }

    &:hover {
      border-color: var(--vis-select-border, #1f6fad);
      color: var(--vis-select-fg, #124a78);
      background: var(--vis-select-bg, #e6f0fa);
    }
  }

  &__groups + &__add {
    margin-top: 8px;
  }
}

.filter-group {
  &__title {
    margin-bottom: 8px;
  }

  &__name {
    font-size: var(--vis-cfg-group-size, 12px);
    font-weight: var(--vis-cfg-group-weight, 500);
    color: var(--vis-cfg-group-color, var(--el-text-color-regular));
    white-space: nowrap;
  }

  &__body {
    position: relative;
  }

  &__hint {
    position: absolute;
    left: 16px;
    top: 14px;
    font-size: var(--vis-cfg-hint-size, 12px);
    color: var(--vis-cfg-hint-color, var(--el-text-color-placeholder));
    pointer-events: none;
  }
}

:deep(.sortable-ghost) {
  opacity: 0.4;
}

:deep(.sortable-drag) {
  opacity: 0.95;
}
</style>
