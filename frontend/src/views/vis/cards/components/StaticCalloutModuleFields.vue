<!--
 * @Description: 文本卡提示条模块
-->
<script setup lang="ts">
import type { VisCalloutTone, VisVisualConfig } from '@/views/vis/shared/types'
import { CALLOUT_TONE_OPTIONS, resolveCalloutTone } from '@/views/vis/shared/staticModules'
import VisStaticCallout from '@/views/vis/shared/VisStaticCallout.vue'

const props = defineProps<{
  index: number
}>()

const visual = defineModel<VisVisualConfig>('visual', { required: true })

const mod = computed(() => {
  const item = visual.value.richtext?.modules?.[props.index]
  return item?.type === 'callout' ? item : null
})

const tone = computed({
  get: () => resolveCalloutTone(mod.value?.tone),
  set: (value: VisCalloutTone) => {
    if (!mod.value)
      return
    if (value === 'info')
      delete mod.value.tone
    else
      mod.value.tone = value
  },
})

const title = computed({
  get: () => mod.value?.title ?? '',
  set: (value: string) => {
    if (!mod.value)
      return
    if (value.trim())
      mod.value.title = value
    else
      delete mod.value.title
  },
})

const text = computed({
  get: () => mod.value?.text ?? '',
  set: (value: string) => {
    if (!mod.value)
      return
    if (value.trim())
      mod.value.text = value
    else
      delete mod.value.text
  },
})
</script>

<template>
  <div
    v-if="mod"
    class="static-callout-fields"
  >
    <div class="static-callout-fields__preview">
      <VisStaticCallout
        :tone="tone"
        :title="title"
        :text="text"
      />
    </div>
    <div class="static-callout-fields__row">
      <span class="static-callout-fields__label">类型</span>
      <el-radio-group
        v-model="tone"
        size="small"
      >
        <el-radio-button
          v-for="opt in CALLOUT_TONE_OPTIONS"
          :key="opt.value"
          :value="opt.value"
        >
          {{ opt.label }}
        </el-radio-button>
      </el-radio-group>
    </div>
    <div class="static-callout-fields__row">
      <span class="static-callout-fields__label">标题</span>
      <el-input
        v-model="title"
        size="small"
        clearable
        maxlength="40"
        placeholder="可选"
      />
    </div>
    <div class="static-callout-fields__row">
      <span class="static-callout-fields__label">说明</span>
      <el-input
        v-model="text"
        type="textarea"
        :rows="3"
        maxlength="200"
        show-word-limit
        resize="vertical"
        placeholder="口径、限制或更新说明"
      />
    </div>
  </div>
</template>

<style scoped lang="scss">
.static-callout-fields {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.static-callout-fields__row {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.static-callout-fields__label {
  font-size: var(--vis-cfg-label-size, 12px);
  color: var(--vis-cfg-label-color, var(--el-text-color-regular));
}

.static-callout-fields__preview {
  min-height: 40px;
}
</style>
