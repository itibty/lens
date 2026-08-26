<!--
 * @Description: 文本卡数字模块
-->
<script setup lang="ts">
import type { VisStatModule, VisVisualConfig } from '@/views/vis/shared/types'
import VisStaticStat from '@/views/vis/shared/VisStaticStat.vue'

const props = defineProps<{
  index: number
}>()

const visual = defineModel<VisVisualConfig>('visual', { required: true })

const mod = computed(() => {
  const item = visual.value.richtext?.modules?.[props.index]
  return item?.type === 'stat' ? item : null
})

function patch(partial: Partial<Pick<VisStatModule, 'value' | 'label' | 'prefix'>>) {
  const item = mod.value
  if (!item)
    return
  if (partial.value != null)
    item.value = partial.value
  if ('label' in partial) {
    const next = partial.label?.trim()
    if (next)
      item.label = next
    else
      delete item.label
  }
  if ('prefix' in partial) {
    const next = partial.prefix?.trim()
    if (next)
      item.prefix = next
    else
      delete item.prefix
  }
}

const label = computed({
  get: () => mod.value?.label ?? '',
  set: (value: string) => {
    patch({ label: value })
  },
})

const prefix = computed({
  get: () => mod.value?.prefix ?? '',
  set: (value: string) => {
    patch({ prefix: value })
  },
})

const value = computed({
  get: () => mod.value?.value ?? 0,
  set: (next: number | undefined | null) => {
    patch({ value: next == null || !Number.isFinite(next) ? 0 : next })
  },
})
</script>

<template>
  <div
    v-if="mod"
    class="static-stat-fields"
  >
    <div class="static-stat-fields__preview">
      <VisStaticStat :items="[mod]" />
    </div>
    <div class="static-stat-fields__row">
      <span class="static-stat-fields__label">标签</span>
      <el-input
        v-model="label"
        size="small"
        clearable
        maxlength="40"
        placeholder="可选，如本月签约"
      />
    </div>
    <div class="static-stat-fields__nums">
      <div class="static-stat-fields__row">
        <span class="static-stat-fields__label">数值</span>
        <el-input-number
          v-model="value"
          size="small"
          class="static-stat-fields__num"
          controls-position="right"
        />
      </div>
      <div class="static-stat-fields__row">
        <span class="static-stat-fields__label">前缀</span>
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
.static-stat-fields {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.static-stat-fields__nums {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.static-stat-fields__row {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.static-stat-fields__label {
  font-size: var(--vis-cfg-label-size, 12px);
  color: var(--vis-cfg-label-color, var(--el-text-color-regular));
}

.static-stat-fields__num {
  width: 100%;
}

.static-stat-fields__preview {
  padding: 8px 10px;
  border: 1px solid var(--el-border-color-extra-light);
  border-radius: 8px;
  background: var(--el-bg-color);
}
</style>
