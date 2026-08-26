<!--
 * @Description: 文本卡提示条
-->
<script setup lang="ts">
import type { VisCalloutTone } from './types'
import { resolveCalloutTone } from './staticModules'

const props = defineProps<{
  tone?: VisCalloutTone
  title?: string
  text?: string
}>()

const kind = computed(() => resolveCalloutTone(props.tone))
const title = computed(() => props.title?.trim() ?? '')
const text = computed(() => props.text?.trim() ?? '')
</script>

<template>
  <div
    class="vis-static-callout"
    :class="`is-${kind}`"
  >
    <div
      v-if="title"
      class="vis-static-callout__title"
    >
      {{ title }}
    </div>
    <div
      v-if="text"
      class="vis-static-callout__text"
    >
      {{ text }}
    </div>
  </div>
</template>

<style scoped lang="scss">
.vis-static-callout {
  min-width: 0;
  padding: 8px 10px 8px 12px;
  border-radius: 8px;
  border: 1px solid transparent;
  border-left-width: 3px;
  font:
    13px / 1.55 system-ui,
    sans-serif;
  color: var(--vis-content-color, var(--el-text-color-primary));

  &.is-info {
    border-color: color-mix(in srgb, var(--el-color-primary) 35%, var(--el-border-color-lighter));
    border-left-color: var(--el-color-primary);
    background: color-mix(in srgb, var(--el-color-primary) 8%, var(--el-bg-color));
  }

  &.is-warning {
    border-color: color-mix(in srgb, var(--el-color-warning) 35%, var(--el-border-color-lighter));
    border-left-color: var(--el-color-warning);
    background: color-mix(in srgb, var(--el-color-warning) 10%, var(--el-bg-color));
  }

  &.is-success {
    border-color: color-mix(in srgb, var(--el-color-success) 35%, var(--el-border-color-lighter));
    border-left-color: var(--el-color-success);
    background: color-mix(in srgb, var(--el-color-success) 10%, var(--el-bg-color));
  }
}

.vis-static-callout__title {
  font-weight: 600;
  line-height: 1.4;
}

.vis-static-callout__text {
  margin-top: 4px;
  white-space: pre-wrap;
  word-break: break-word;
}

.vis-static-callout__title + .vis-static-callout__text {
  margin-top: 4px;
}
</style>
