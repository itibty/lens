<!--
 * @Description: 模板参数 params（Enjoy 参数，无 op）
-->
<script setup lang="ts">
import type { DragFieldPayload, ParamPill } from '@/views/vis/shared/dnd'
import type { DatasetField } from '@/views/vis/shared/types'
import draggable from 'vuedraggable'
import { dateValueExpLabel } from '@/views/vis/shared/dateExp'
import { DND_GROUP, toParamPill } from '@/views/vis/shared/dnd'
import AdvancedModule from './AdvancedModule.vue'
import DateExpFields from './DateExpFields.vue'
import FieldPill from './FieldPill.vue'

interface ParamDraft {
  field: string
  mode: 'value' | 'exp'
  text: string
  valueExp: VIS.FilterItem['valueExp']
  value: unknown[]
}

const props = defineProps<{
  fields?: DatasetField[]
}>()

const params = defineModel<ParamPill[]>('params', { required: true })
const drafts = reactive<Record<string, ParamDraft>>({})

const fieldNames = computed(() => (props.fields ?? []).map(item => item.field))

function onAdd(evt: { newIndex?: number }) {
  const index = evt.newIndex
  if (index == null)
    return
  const raw = params.value[index] as DragFieldPayload | ParamPill
  const pill = toParamPill(raw)
  if (pill.field && params.value.some((p, i) => i !== index && p.field === pill.field)) {
    params.value.splice(index, 1)
    return
  }
  params.value[index] = pill
}

function removeAt(index: number) {
  const item = params.value[index]
  if (item)
    delete drafts[item._uid]
  params.value.splice(index, 1)
}

function openDraft(element: ParamPill) {
  drafts[element._uid] = {
    field: element.field || '',
    mode: element.valueExp ? 'exp' : 'value',
    text: Array.isArray(element.value) && element.value[0] != null ? String(element.value[0]) : '',
    valueExp: element.valueExp,
    value: (element.value as unknown[]) ?? [],
  }
}

function confirmDraft(element: ParamPill) {
  const draft = drafts[element._uid]
  if (!draft)
    return
  element.field = draft.field.trim()
  if (draft.mode === 'exp' && draft.valueExp) {
    element.valueExp = draft.valueExp
    element.value = draft.value as VIS.FilterItem['value']
  }
  else {
    delete element.valueExp
    const text = draft.text.trim()
    if (text)
      element.value = [text] as unknown as VIS.FilterItem['value']
    else
      delete element.value
  }
  delete drafts[element._uid]
}

function pillName(element: ParamPill) {
  return element.field || '未命名参数'
}

function pillSubtitle(element: ParamPill) {
  if (element.valueExp)
    return dateValueExpLabel(element.valueExp)
  const first = Array.isArray(element.value) ? element.value[0] : undefined
  if (first == null || String(first) === '')
    return ''
  return String(first)
}
</script>

<template>
  <AdvancedModule
    title="模板参数"
    tip="写入数据集 SQL 模板的参数"
  >
    <div class="drop-wrap">
      <draggable
        v-model="params"
        class="drop"
        :class="{ 'is-empty': !params.length }"
        :group="DND_GROUP"
        handle=".field-pill__handle"
        :animation="180"
        item-key="_uid"
        @add="onAdd"
      >
        <template #item="{ element, index }">
          <div class="drop__pill">
            <FieldPill
              :name="pillName(element)"
              :subtitle="pillSubtitle(element)"
              tone="filter"

              drag-handle block
              :popover-width="320"
              @open="openDraft(element)"
              @confirm="confirmDraft(element)"
              @remove="removeAt(index)"
            >
              <template v-if="drafts[element._uid]">
                <el-form label-position="top" size="small" @submit.prevent>
                  <el-form-item label="参数名">
                    <el-select
                      v-model="drafts[element._uid].field"
                      class="w-full"
                      filterable
                      allow-create
                      default-first-option
                      placeholder="选择或输入 Enjoy 参数名"
                    >
                      <el-option
                        v-for="name in fieldNames"
                        :key="name"
                        :label="name"
                        :value="name"
                      />
                    </el-select>
                  </el-form-item>
                  <el-form-item label="取值方式">
                    <el-radio-group v-model="drafts[element._uid].mode" size="small">
                      <el-radio-button value="value">
                        手填
                      </el-radio-button>
                      <el-radio-button value="exp">
                        日期快捷
                      </el-radio-button>
                    </el-radio-group>
                  </el-form-item>
                  <el-form-item v-if="drafts[element._uid].mode === 'value'" label="值">
                    <el-input
                      v-model="drafts[element._uid].text"
                      clearable
                      placeholder="写入模板的参数值"
                    />
                  </el-form-item>
                  <DateExpFields
                    v-else
                    v-model:value-exp="drafts[element._uid].valueExp"
                    v-model:value="drafts[element._uid].value"
                    label=""
                  />
                </el-form>
              </template>
            </FieldPill>
          </div>
        </template>
      </draggable>
      <div
        v-if="!params.length"
        class="drop-empty"
      >
        从左侧拖入字段
      </div>
    </div>
  </AdvancedModule>
</template>

<style scoped lang="scss">
.drop-wrap {
  position: relative;
}

.drop {
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

  &__pill {
    width: 100%;
  }
}

.drop-empty {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  padding: 0 16px;
  font-size: var(--vis-cfg-hint-size, 12px);
  color: var(--vis-cfg-hint-color, var(--el-text-color-placeholder));
  pointer-events: none;
}

:deep(.sortable-ghost) {
  opacity: 0.4;
}
</style>
