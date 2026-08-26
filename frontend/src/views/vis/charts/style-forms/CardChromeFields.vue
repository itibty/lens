<!--
 * @Description: 卡片背景 / 内容色；空 = 跟随默认
-->
<script setup lang="ts">
import type { VisVisualConfig } from '@/views/vis/shared/types'

const visual = defineModel<VisVisualConfig>('visual', { required: true })

function colorField(key: 'cardBg' | 'cardColor') {
  return computed({
    get: () => visual.value[key] || undefined,
    set: (value: string | null | undefined) => {
      const next = value?.trim()
      if (next)
        visual.value[key] = next
      else
        delete visual.value[key]
    },
  })
}

const cardBg = colorField('cardBg')
const cardColor = colorField('cardColor')
</script>

<template>
  <div class="vis-style-form__row">
    <div class="vis-style-form__label">
      背景色
    </div>
    <div class="chrome-color">
      <el-color-picker
        v-model="cardBg"
        size="small"
      />
      <button
        v-if="cardBg"
        type="button"
        class="chrome-color__clear"
        title="恢复默认"
        @click="cardBg = undefined"
      >
        默认
      </button>
    </div>
  </div>
  <div class="vis-style-form__row">
    <div class="vis-style-form__label">
      内容色
    </div>
    <div class="chrome-color">
      <el-color-picker
        v-model="cardColor"
        size="small"
      />
      <button
        v-if="cardColor"
        type="button"
        class="chrome-color__clear"
        title="恢复默认"
        @click="cardColor = undefined"
      >
        默认
      </button>
    </div>
  </div>
</template>

<style scoped lang="scss">
.chrome-color {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.chrome-color__clear {
  padding: 0;
  border: none;
  background: transparent;
  font-size: 12px;
  line-height: 1;
  color: var(--vis-cfg-hint-color, var(--el-text-color-placeholder));
  cursor: pointer;

  &:hover {
    color: var(--vis-cfg-meta-color, var(--el-text-color-secondary));
  }
}
</style>
