<!--
 * @Description: 维度投放区（拖拽 + 胶囊；别名在 popover，关闭时确认）
-->
<script setup lang="ts">
import type { QueryIssue, QueryShelf } from '../cardApi'
import type { DimensionPill, DragFieldPayload } from '@/views/vis/shared/dnd'
import type { DatasetField, VisVisualConfig } from '@/views/vis/shared/types'
import draggable from 'vuedraggable'
import { showToast } from '@/utils/index'
import { DND_GROUP, toDimensionPill } from '@/views/vis/shared/dnd'
import { remapTableMarkAliases } from '@/views/vis/shared/tableMark'
import { dimensionAlias, isDateField, TIME_GRAIN_OPTIONS } from '@/views/vis/shared/types'
import { pillMessage, shelfMessage } from '../cardApi'
import FieldPill from './FieldPill.vue'
import ShelfTitle from './ShelfTitle.vue'

const props = withDefaults(defineProps<{
  fields?: DatasetField[]
  title?: string
  tip?: string
  shelf?: QueryShelf
  issues?: QueryIssue[]
  visual?: VisVisualConfig
}>(), {
  title: '维度',
  tip: '按什么拆开看，例如地区、日期',
  shelf: 'dimensions',
})

const dimensions = defineModel<DimensionPill[]>('dimensions', { required: true })
const drafts = reactive<Record<string, { label: string, timeGrain: VIS.DimensionItem['timeGrain'] | '' }>>({})

function fieldMeta(field: string) {
  return props.fields?.find(item => item.field === field)
}

function onAdd(evt: { newIndex?: number }) {
  const index = evt.newIndex
  if (index == null)
    return
  const raw = dimensions.value[index] as DragFieldPayload | DimensionPill
  const pill = toDimensionPill(raw)
  if (dimensions.value.some((d, i) => i !== index && d.field === pill.field)) {
    dimensions.value.splice(index, 1)
    showToast('该维度已添加', 'warning')
    return
  }
  dimensions.value[index] = pill
}

function removeAt(index: number) {
  const item = dimensions.value[index]
  if (item)
    delete drafts[item._uid]
  dimensions.value.splice(index, 1)
}

function openDraft(element: DimensionPill) {
  drafts[element._uid] = {
    label: element.label || '',
    timeGrain: element.timeGrain || '',
  }
}

function confirmDraft(element: DimensionPill) {
  const draft = drafts[element._uid]
  if (!draft)
    return
  const prevAlias = dimensionAlias(element)
  const text = draft.label.trim()
  if (!text)
    delete element.label
  else
    element.label = text
  if (draft.timeGrain && isDateField(fieldMeta(element.field)?.dataType))
    element.timeGrain = draft.timeGrain
  else
    delete element.timeGrain
  if (props.visual)
    remapTableMarkAliases(props.visual, prevAlias, dimensionAlias(element))
  delete drafts[element._uid]
}

function pillName(element: DimensionPill) {
  const alias = element.label?.trim()
  return alias ? `${element.field} (${alias})` : element.field
}

function pillSubtitle(element: DimensionPill) {
  const grain = TIME_GRAIN_OPTIONS.find(item => item.value === element.timeGrain)
  return grain?.label
}

const shelfError = computed(() => shelfMessage(props.issues, props.shelf))

function pillError(uid: string) {
  return pillMessage(props.issues, props.shelf, uid)
}
</script>

<template>
  <div class="shelf" :class="{ 'is-invalid': !!shelfError }">
    <div class="shelf__title">
      <ShelfTitle :tip="tip">
        {{ title }}
      </ShelfTitle>
    </div>
    <draggable
      v-model="dimensions"
      class="shelf__drop"
      :class="{ 'is-empty': !dimensions.length, 'is-invalid': !!shelfError }"
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
            tone="dimension"

            drag-handle block
            @open="openDraft(element)"
            @confirm="confirmDraft(element)"
            @remove="removeAt(index)"
          >
            <template v-if="drafts[element._uid]">
              <el-form label-position="top" size="small" @submit.prevent>
                <el-form-item label="显示名（可选）">
                  <el-input
                    v-model="drafts[element._uid].label"
                    clearable
                    placeholder="不填则使用字段名"
                  />
                </el-form-item>
                <el-form-item
                  v-if="isDateField(fieldMeta(element.field)?.dataType)"
                  label="时间粒度（可选）"
                >
                  <el-select
                    v-model="drafts[element._uid].timeGrain"
                    class="w-full"
                    clearable
                    placeholder="不按粒度截断"
                  >
                    <el-option
                      v-for="opt in TIME_GRAIN_OPTIONS"
                      :key="opt.value"
                      :label="opt.label"
                      :value="opt.value"
                    />
                  </el-select>
                </el-form-item>
              </el-form>
            </template>
          </FieldPill>
        </div>
      </template>
    </draggable>
    <div v-if="!dimensions.length && !shelfError" class="shelf__hint">
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

:deep(.sortable-ghost) {
  opacity: 0.4;
}

:deep(.sortable-drag) {
  opacity: 0.95;
}
</style>
