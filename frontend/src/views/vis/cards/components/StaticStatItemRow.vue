<!--
 * @Description: 文本卡数字组里的一项
-->
<script setup lang="ts">
import type { VisVisualConfig } from '@/views/vis/shared/types'
import { STAT_GROUP_MIN } from '@/views/vis/shared/staticModules'

const props = defineProps<{
  moduleIndex: number
  itemIndex: number
}>()

const emit = defineEmits<{
  remove: [index: number]
}>()

const visual = defineModel<VisVisualConfig>('visual', { required: true })

const item = computed(() => {
  const mod = visual.value.richtext?.modules?.[props.moduleIndex]
  return mod?.type === 'stats' ? mod.items[props.itemIndex] : undefined
})

const canRemove = computed(() => {
  const mod = visual.value.richtext?.modules?.[props.moduleIndex]
  return mod?.type === 'stats' ? mod.items.length > STAT_GROUP_MIN : false
})

const label = computed({
  get: () => item.value?.label ?? '',
  set: (value: string) => {
    if (!item.value)
      return
    const next = value.trim()
    if (next)
      item.value.label = next
    else
      delete item.value.label
  },
})

const prefix = computed({
  get: () => item.value?.prefix ?? '',
  set: (value: string) => {
    if (!item.value)
      return
    const next = value.trim()
    if (next)
      item.value.prefix = next
    else
      delete item.value.prefix
  },
})

const value = computed({
  get: () => item.value?.value ?? 0,
  set: (next: number | undefined | null) => {
    if (!item.value)
      return
    item.value.value = next == null || !Number.isFinite(next) ? 0 : next
  },
})
</script>

<template>
  <div
    v-if="item"
    class="stat-item-row"
  >
    <div class="stat-item-row__head">
      <span>第 {{ itemIndex + 1 }} 项</span>
      <button
        type="button"
        class="vis-icon-btn"
        title="移除"
        :disabled="!canRemove"
        @click="emit('remove', itemIndex)"
      >
        <span class="i-mingcute-minimize-line" />
      </button>
    </div>
    <div class="stat-item-row__row">
      <span class="stat-item-row__label">标签</span>
      <el-input
        v-model="label"
        size="small"
        clearable
        maxlength="40"
        placeholder="可选"
      />
    </div>
    <div class="stat-item-row__nums">
      <div class="stat-item-row__row">
        <span class="stat-item-row__label">数值</span>
        <el-input-number
          v-model="value"
          size="small"
          class="stat-item-row__num"
          controls-position="right"
        />
      </div>
      <div class="stat-item-row__row">
        <span class="stat-item-row__label">前缀</span>
        <el-input
          v-model="prefix"
          size="small"
          clearable
          maxlength="8"
          placeholder="可选，如 ¥"
        />
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.stat-item-row {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 8px;
  border: 1px solid var(--el-border-color-extra-light);
  border-radius: 6px;
  background: var(--el-bg-color);
}

.stat-item-row__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 12px;
  color: var(--vis-cfg-meta-color, var(--el-text-color-secondary));
}

.stat-item-row__nums {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.stat-item-row__row {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.stat-item-row__label {
  font-size: var(--vis-cfg-label-size, 12px);
  color: var(--vis-cfg-label-color, var(--el-text-color-regular));
}

.stat-item-row__num {
  width: 100%;
}
</style>
