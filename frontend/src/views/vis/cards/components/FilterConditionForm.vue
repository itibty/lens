<!--
 * @Description: 筛选条件 popover 表单（比较 / 日期快捷），供筛选、Having、数据标注复用
-->
<script setup lang="ts">
import type { FilterConditionDraft, FilterOp } from '@/views/vis/shared/filterValue'
import type { DatasetFieldDataType } from '@/views/vis/shared/types'
import { defaultDateExpValue } from '@/views/vis/shared/dateExp'
import {
  defaultValueForOp,
  filterOpsForDataType,
  needsFilterValue,
  opsForDataType,
} from '@/views/vis/shared/filterValue'
import { isDateField } from '@/views/vis/shared/types'
import DateExpFields from './DateExpFields.vue'
import FilterValueFields from './FilterValueFields.vue'

const props = withDefaults(defineProps<{
  dataType?: DatasetFieldDataType
  allowDateExp?: boolean
  showHint?: boolean
}>(), {
  dataType: 'string',
  allowDateExp: true,
  showHint: true,
})

const draft = defineModel<FilterConditionDraft & { field?: string }>({ required: true })

const showDateExp = computed(() => props.allowDateExp && isDateField(props.dataType))

function onModeChange(mode: string | number | boolean | undefined) {
  if (mode !== 'op' && mode !== 'exp')
    return
  if (mode === 'exp') {
    const valueExp = draft.value.valueExp || 'current_month'
    draft.value = {
      ...draft.value,
      mode,
      valueExp,
      value: defaultDateExpValue(valueExp),
    }
    return
  }
  const op = (draft.value.op || opsForDataType(props.dataType)[0] || 'eq') as FilterOp
  draft.value = {
    ...draft.value,
    mode,
    op,
    value: defaultValueForOp(op, props.dataType),
  }
}

function onOpChange(op: FilterOp) {
  draft.value = {
    ...draft.value,
    op,
    value: defaultValueForOp(op, props.dataType),
  }
}
</script>

<template>
  <el-form
    label-position="top"
    size="small"
    @submit.prevent
  >
    <slot name="prepend" />
    <el-form-item
      v-if="showDateExp"
      label="取值方式"
      label-position="left"
      label-width="72px"
    >
      <el-radio-group
        :model-value="draft.mode"
        size="small"
        @update:model-value="onModeChange"
      >
        <el-radio-button value="op">
          比较
        </el-radio-button>
        <el-radio-button value="exp">
          日期快捷
        </el-radio-button>
      </el-radio-group>
    </el-form-item>
    <template v-if="showDateExp && draft.mode === 'exp'">
      <DateExpFields
        v-model:value-exp="draft.valueExp"
        v-model:value="draft.value"
        label=""
        :show-hint="showHint"
      />
    </template>
    <template v-else>
      <el-form-item label="条件">
        <el-select
          :model-value="draft.op"
          class="w-full"
          @update:model-value="onOpChange"
        >
          <el-option
            v-for="item in filterOpsForDataType(dataType)"
            :key="item.value"
            :label="item.label"
            :value="item.value"
          />
        </el-select>
      </el-form-item>
      <el-form-item
        v-if="needsFilterValue(draft.op)"
        label="值"
      >
        <FilterValueFields
          v-model:value="draft.value"
          :op="draft.op"
          :data-type="dataType"
        />
      </el-form-item>
    </template>
  </el-form>
</template>
