<!--
 * @Description: 日期快捷 valueExp + 所需 value[]
-->
<script setup lang="ts">
import type { CSSProperties } from 'vue'
import {
  DATE_VALUE_EXP_OPTIONS,
  dateExpValueError,
  dateValueExpCount,
  dateValueExpHint,
  defaultDateExpValue,
} from '@/views/vis/shared/dateExp'

const props = withDefaults(defineProps<{
  /** 空字符串则不展示表单项标题 */
  label?: string
  /** 选中项下方的周期说明；对比浮层里由区间预览代替 */
  showHint?: boolean
  size?: 'default' | 'small' | 'large'
  popperStyle?: CSSProperties
}>(), {
  label: '日期快捷',
  showHint: true,
  size: 'small',
  popperStyle: undefined,
})

const valueExp = defineModel<VIS.FilterItem['valueExp']>('valueExp')
const value = defineModel<unknown[]>('value', { required: true })

const valueCount = computed(() => dateValueExpCount(valueExp.value))
const selectedHint = computed(() => dateValueExpHint(valueExp.value))
const valueError = computed(() => dateExpValueError(valueExp.value, value.value))

watch(valueExp, (exp, prev) => {
  if (prev === undefined || exp === prev)
    return
  value.value = defaultDateExpValue(exp)
})

function asNumber(index: number) {
  const n = Number(value.value?.[index])
  return Number.isFinite(n) ? n : undefined
}

function setNumber(index: number, n: number | undefined) {
  const next = [...(value.value ?? [])]
  next[index] = n
  value.value = next
}
</script>

<template>
  <el-form-item :class="{ 'is-bare': !label }" :label="label || undefined">
    <el-select
      v-model="valueExp"
      class="w-full"
      :size="size"
      :popper-style="popperStyle"
      placeholder="选择快捷"
    >
      <el-option
        v-for="opt in DATE_VALUE_EXP_OPTIONS"
        :key="opt.value"
        :label="opt.label"
        :value="opt.value"
      >
        <span class="date-exp-option">
          <span>{{ opt.label }}</span>
          <span class="date-exp-option__hint">{{ opt.hint }}</span>
        </span>
      </el-option>
    </el-select>
    <div v-if="props.showHint && selectedHint" class="date-exp-tip">
      {{ selectedHint }}
    </div>
  </el-form-item>
  <div v-if="valueCount >= 1" class="date-exp-nums" :class="{ 'is-pair': valueCount >= 2 }">
    <el-form-item :label="valueCount === 1 ? '天数 N' : '距今 X'">
      <el-input-number
        :model-value="asNumber(0)"
        class="w-full"
        :size="size"
        :min="1"
        controls-position="right"
        @update:model-value="n => setNumber(0, n ?? undefined)"
      />
    </el-form-item>
    <el-form-item v-if="valueCount >= 2" label="距今 Y">
      <el-input-number
        :model-value="asNumber(1)"
        class="w-full"
        :size="size"
        :min="0"
        controls-position="right"
        @update:model-value="n => setNumber(1, n ?? undefined)"
      />
    </el-form-item>
    <div v-if="valueError" class="date-exp-error">
      {{ valueError }}
    </div>
  </div>
</template>

<style scoped lang="scss">
:deep(.el-form-item.is-bare > .el-form-item__label) {
  display: none;
}

.date-exp-option {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  width: 100%;

  &__hint {
    font-size: 12px;
    color: var(--el-text-color-placeholder);
  }
}

.date-exp-tip {
  margin-top: 4px;
  font-size: 12px;
  line-height: 1.4;
  color: var(--el-text-color-placeholder);
}

.date-exp-error {
  grid-column: 1 / -1;
  margin-top: 4px;
  font-size: 12px;
  line-height: 1.4;
  color: var(--el-color-danger);
}

.date-exp-nums {
  &.is-pair {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0 8px;
  }

  :deep(.el-form-item) {
    margin-bottom: 0;
  }
}
</style>
