<!--
 * @Description: 按 op + 字段类型编辑 value[]（契约：永远是数组）
-->
<script setup lang="ts">
import type { FilterOp } from '@/views/vis/shared/filterValue'
import type { DatasetFieldDataType } from '@/views/vis/shared/types'
import { defaultValueForOp, valueArity } from '@/views/vis/shared/filterValue'

const props = withDefaults(defineProps<{
  op: FilterOp
  dataType?: DatasetFieldDataType
}>(), {
  dataType: 'string',
})

const value = defineModel<unknown[]>('value', { required: true })

const arity = computed(() => valueArity(props.op))
const kind = computed(() => props.dataType || 'string')

watch(
  () => [props.op, props.dataType] as const,
  ([op, dataType], prev) => {
    if (prev && op === prev[0] && dataType === prev[1])
      return
    if (!prev)
      return
    value.value = defaultValueForOp(op, dataType)
  },
)

function asText(v: unknown) {
  return v == null ? '' : String(v)
}

const oneText = computed({
  get: () => asText(value.value?.[0]),
  set: (text: string) => {
    value.value = [text]
  },
})

const oneNumber = computed({
  get: () => {
    const n = Number(value.value?.[0])
    return Number.isFinite(n) ? n : undefined
  },
  set: (n: number | undefined) => {
    value.value = [n]
  },
})

const betweenStartNum = computed({
  get: () => {
    const n = Number(value.value?.[0])
    return Number.isFinite(n) ? n : undefined
  },
  set: (n: number | undefined) => {
    value.value = [n, value.value?.[1]]
  },
})

const betweenEndNum = computed({
  get: () => {
    const n = Number(value.value?.[1])
    return Number.isFinite(n) ? n : undefined
  },
  set: (n: number | undefined) => {
    value.value = [value.value?.[0], n]
  },
})

const betweenStartText = computed({
  get: () => asText(value.value?.[0]),
  set: (text: string) => {
    value.value = [text, value.value?.[1] ?? '']
  },
})

const betweenEndText = computed({
  get: () => asText(value.value?.[1]),
  set: (text: string) => {
    value.value = [value.value?.[0] ?? '', text]
  },
})

/** date / datetime / timestamp 单值 */
const oneTemporal = computed({
  get: () => {
    const raw = value.value?.[0]
    if (raw == null || raw === '')
      return undefined
    if (kind.value === 'timestamp') {
      const n = Number(raw)
      return Number.isFinite(n) ? n : undefined
    }
    return asText(raw)
  },
  set: (v: string | number | undefined | null) => {
    value.value = [v ?? (kind.value === 'timestamp' ? undefined : '')]
  },
})

/** between：daterange / datetimerange */
const rangeTemporal = computed({
  get: (): [string | number, string | number] | undefined => {
    const a = value.value?.[0]
    const b = value.value?.[1]
    if (a == null || a === '' || b == null || b === '')
      return undefined
    if (kind.value === 'timestamp') {
      const na = Number(a)
      const nb = Number(b)
      if (!Number.isFinite(na) || !Number.isFinite(nb))
        return undefined
      return [na, nb]
    }
    return [asText(a), asText(b)]
  },
  set: (range: [string | number, string | number] | undefined | null) => {
    if (!range?.length) {
      value.value = defaultValueForOp(props.op, props.dataType)
      return
    }
    value.value = [range[0], range[1]]
  },
})

const manyTags = computed({
  get: () => (value.value ?? []).map(v => String(v)),
  set: (tags: string[]) => {
    if (kind.value === 'number') {
      value.value = tags.map((t) => {
        const n = Number(t)
        return Number.isFinite(n) ? n : t
      })
      return
    }
    value.value = tags
  },
})

const dateValueFormat = computed(() => {
  if (kind.value === 'timestamp')
    return 'x'
  if (kind.value === 'datetime')
    return 'YYYY-MM-DD HH:mm:ss'
  return 'YYYY-MM-DD'
})

const datePickerType = computed(() => {
  if (kind.value === 'datetime' || kind.value === 'timestamp')
    return 'datetime'
  return 'date'
})

const rangePickerType = computed(() => {
  if (kind.value === 'datetime' || kind.value === 'timestamp')
    return 'datetimerange'
  return 'daterange'
})
</script>

<template>
  <div class="filter-value">
    <template v-if="arity === 'one'">
      <el-input-number
        v-if="kind === 'number'"
        v-model="oneNumber"
        class="w-full"
        controls-position="right"
        placeholder="数值"
      />
      <el-date-picker
        v-else-if="kind === 'date' || kind === 'datetime' || kind === 'timestamp'"
        class="w-full"
        :type="datePickerType"
        :value-format="dateValueFormat"
        :model-value="oneTemporal as any"
        :placeholder="kind === 'date' ? '选择日期' : '选择日期时间'"
        @update:model-value="oneTemporal = $event"
      />
      <div v-else class="filter-value__with-tip">
        <el-input
          v-model="oneText"
          :placeholder="op === 'like' || op === 'not_like' ? '关键字' : '值'"
        />
        <el-tooltip
          v-if="op === 'like' || op === 'not_like'"
          content="支持模糊匹配"
          placement="top"
          :show-after="200"
        >
          <span class="filter-value__info i-mingcute-information-line" />
        </el-tooltip>
      </div>
    </template>

    <template v-else-if="arity === 'two'">
      <div v-if="kind === 'number'" class="filter-value__between">
        <el-input-number
          v-model="betweenStartNum"
          class="filter-value__num"
          controls-position="right"
          placeholder="下限"
        />
        <span class="filter-value__sep">~</span>
        <el-input-number
          v-model="betweenEndNum"
          class="filter-value__num"
          controls-position="right"
          placeholder="上限"
        />
      </div>
      <el-date-picker
        v-else-if="kind === 'date' || kind === 'datetime' || kind === 'timestamp'"
        class="w-full"
        :type="rangePickerType"
        :value-format="dateValueFormat"
        :model-value="rangeTemporal as any"
        start-placeholder="开始"
        end-placeholder="结束"
        @update:model-value="rangeTemporal = $event"
      />
      <div v-else class="filter-value__between">
        <el-input v-model="betweenStartText" placeholder="下限" />
        <span class="filter-value__sep">~</span>
        <el-input v-model="betweenEndText" placeholder="上限" />
      </div>
    </template>

    <template v-else-if="arity === 'many'">
      <el-select
        v-model="manyTags"
        class="w-full"
        multiple
        filterable
        allow-create
        default-first-option
        :reserve-keyword="false"
        :placeholder="kind === 'number' ? '输入数字后回车' : '输入后回车添加多个值'"
      />
    </template>
  </div>
</template>

<style scoped lang="scss">
.filter-value {
  width: 100%;

  :deep(.el-date-editor.el-input),
  :deep(.el-date-editor.el-input__wrapper),
  :deep(.el-date-editor) {
    width: 100%;
  }

  &__with-tip {
    display: flex;
    align-items: center;
    gap: 6px;
    width: 100%;

    .el-input {
      flex: 1;
      min-width: 0;
    }
  }

  &__between {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  &__num {
    flex: 1;
    min-width: 0;
    width: auto;
  }

  &__sep {
    color: var(--el-text-color-secondary);
    flex-shrink: 0;
  }

  &__info {
    flex-shrink: 0;
    font-size: 14px;
    color: var(--el-text-color-secondary);
    cursor: help;
    outline: none;

    &:hover {
      color: var(--el-color-primary);
    }
  }
}
</style>
