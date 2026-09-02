<!--
 * @Description: 结果过滤 — 平铺 AND；关闭 popover 时确认
-->
<script setup lang="ts">
import type { QueryIssue } from '../cardApi'
import type { HavingPill } from '@/views/vis/shared/dnd'
import type { FilterConditionDraft } from '@/views/vis/shared/filterValue'
import { createDragUid } from '@/views/vis/shared/dnd'
import {
  applyFilterConditionDraft,
  defaultValueForOp,
  formatFilterConditionTip,
  toFilterConditionDraft,
} from '@/views/vis/shared/filterValue'
import { aggLabel } from '@/views/vis/shared/types'
import { pillMessage, shelfMessage } from '../cardApi'
import { buildHavingCandidates, havingCandidateKey } from '../queryDependents'
import AdvancedModule from './AdvancedModule.vue'
import FieldPill from './FieldPill.vue'
import FilterConditionForm from './FilterConditionForm.vue'

const props = defineProps<{
  metrics: VIS.MetricItem[]
  issues?: QueryIssue[]
  /** 透视：HAVING 只滤最细交叉格，小计/总计仍按全部数据汇总 */
  forPivot?: boolean
}>()

const tip = computed(() => props.forPivot
  ? '只过滤最细交叉格；小计、总计仍按筛选后的全部数据汇总'
  : '对汇总结果再过滤，相当于 HAVING')

const shelfError = computed(() => shelfMessage(props.issues, 'having'))

function pillError(uid: string) {
  return pillMessage(props.issues, 'having', uid)
}

const havingFilters = defineModel<HavingPill[]>('havingFilters', { required: true })
const drafts = reactive<Record<string, FilterConditionDraft>>({})

const candidates = computed(() => buildHavingCandidates(props.metrics ?? []))
const pickKey = ref('')

watch(candidates, (list) => {
  if (pickKey.value && !list.some(c => havingCandidateKey(c.field, c.agg) === pickKey.value))
    pickKey.value = ''
})

function addHaving(key: string) {
  const item = candidates.value.find(c => havingCandidateKey(c.field, c.agg) === key)
  if (!item)
    return
  const pill: HavingPill = {
    _uid: createDragUid(),
    field: item.field,
    agg: item.agg,
    op: 'gte',
    value: defaultValueForOp('gte', 'number') as VIS.HavingFilterItem['value'],
  }
  havingFilters.value = [...havingFilters.value, pill]
  pickKey.value = ''
}

function removeAt(index: number) {
  const item = havingFilters.value[index]
  if (item)
    delete drafts[item._uid]
  const next = havingFilters.value.slice()
  next.splice(index, 1)
  havingFilters.value = next
}

function openDraft(item: HavingPill) {
  drafts[item._uid] = toFilterConditionDraft(item, 'number')
}

function confirmDraft(item: HavingPill) {
  const draft = drafts[item._uid]
  if (!draft)
    return
  applyFilterConditionDraft(item, draft, 'number')
  delete drafts[item._uid]
}

function pillName(item: HavingPill) {
  return `${aggLabel(item.agg)}(${item.field})`
}
</script>

<template>
  <AdvancedModule
    title="结果过滤"
    :tip="tip"
    :invalid="!!shelfError"
  >
    <template #extra>
      <el-select
        v-model="pickKey"
        class="pick"
        size="small"
        clearable
        filterable
        placeholder="添加指标"
        :disabled="!candidates.length"
        @change="addHaving"
      >
        <el-option
          v-for="c in candidates"
          :key="havingCandidateKey(c.field, c.agg)"
          :label="c.display"
          :value="havingCandidateKey(c.field, c.agg)"
        />
      </el-select>
    </template>
    <div
      class="drop"
      :class="{ 'is-empty': !havingFilters.length, 'is-invalid': !!shelfError }"
    >
      <div
        v-for="(element, index) in havingFilters"
        :key="element._uid"
        class="drop__pill"
      >
        <FieldPill
          :name="pillName(element)"
          :tip="formatFilterConditionTip(element)"
          :error="pillError(element._uid)"
          tone="filter"
          block
          @open="openDraft(element)"
          @confirm="confirmDraft(element)"
          @remove="removeAt(index)"
        >
          <FilterConditionForm
            v-if="drafts[element._uid]"
            v-model="drafts[element._uid]"
            data-type="number"
            :allow-date-exp="false"
          />
        </FieldPill>
      </div>
      <div
        v-if="!havingFilters.length"
        class="drop-empty"
      >
        {{ candidates.length ? '选择已配置的指标添加' : '请先添加汇总指标' }}
      </div>
    </div>
    <div v-if="shelfError" class="drop-error">
      {{ shelfError }}
    </div>
  </AdvancedModule>
</template>

<style scoped lang="scss">
.pick {
  width: 130px;
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

  &.is-invalid {
    border-color: var(--el-color-danger-light-5);
  }

  &__pill {
    width: 100%;
  }
}

.drop-empty {
  color: var(--el-text-color-placeholder);
  font-size: 12px;
  line-height: 28px;
}

.drop-error {
  margin-top: 8px;
  font-size: 12px;
  line-height: 1.4;
  color: var(--el-color-danger);
}
</style>
