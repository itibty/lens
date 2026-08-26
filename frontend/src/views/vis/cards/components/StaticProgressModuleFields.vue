<!--
 * @Description: 文本卡进度模块（当前值 / 目标值 / 标签）
-->
<script setup lang="ts">
import type { VisProgressModule, VisVisualConfig } from '@/views/vis/shared/types'
import { staticProgressView, staticProgressVisual } from '@/views/vis/shared/staticModules'
import VisProgressCard from '@/views/vis/shared/VisProgressCard.vue'

const props = defineProps<{
  index: number
}>()

const visual = defineModel<VisVisualConfig>('visual', { required: true })

const mod = computed(() => {
  const item = visual.value.richtext?.modules?.[props.index]
  return item?.type === 'progress' ? item : null
})

function patch(partial: Partial<Pick<VisProgressModule, 'current' | 'target' | 'label'>>) {
  const item = mod.value
  if (!item)
    return
  if (partial.current != null)
    item.current = partial.current
  if (partial.target != null)
    item.target = partial.target
  if ('label' in partial) {
    const next = partial.label?.trim()
    if (next)
      item.label = next
    else
      delete item.label
  }
}

const label = computed({
  get: () => mod.value?.label ?? '',
  set: (value: string) => {
    patch({ label: value })
  },
})

const current = computed({
  get: () => mod.value?.current ?? 0,
  set: (value: number | undefined | null) => {
    patch({ current: value == null || !Number.isFinite(value) ? 0 : value })
  },
})

const target = computed({
  get: () => mod.value?.target ?? 0,
  set: (value: number | undefined | null) => {
    patch({ target: value == null || !Number.isFinite(value) ? 0 : value })
  },
})

const previewVisual = computed(() => staticProgressVisual(visual.value, !!mod.value?.label?.trim()))
const previewView = computed(() => {
  const item = mod.value
  return item ? staticProgressView(item, previewVisual.value) : null
})
</script>

<template>
  <div
    v-if="mod"
    class="static-progress-fields"
  >
    <div class="static-progress-fields__preview">
      <VisProgressCard
        :visual="previewVisual"
        :view="previewView"
      />
    </div>
    <div class="static-progress-fields__row">
      <span class="static-progress-fields__label">标签</span>
      <el-input
        v-model="label"
        size="small"
        clearable
        maxlength="40"
        placeholder="可选，如完成率"
      />
    </div>
    <div class="static-progress-fields__nums">
      <div class="static-progress-fields__row">
        <span class="static-progress-fields__label">当前值</span>
        <el-input-number
          v-model="current"
          size="small"
          class="static-progress-fields__num"
          controls-position="right"
        />
      </div>
      <div class="static-progress-fields__row">
        <span class="static-progress-fields__label">目标值</span>
        <el-input-number
          v-model="target"
          size="small"
          class="static-progress-fields__num"
          :min="0"
          controls-position="right"
        />
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.static-progress-fields {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.static-progress-fields__nums {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.static-progress-fields__row {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.static-progress-fields__label {
  font-size: var(--vis-cfg-label-size, 12px);
  color: var(--vis-cfg-label-color, var(--el-text-color-regular));
}

.static-progress-fields__num {
  width: 100%;
}

.static-progress-fields__preview {
  padding: 8px 10px;
  border: 1px solid var(--el-border-color-extra-light);
  border-radius: 8px;
  background: var(--el-bg-color);
}
</style>
