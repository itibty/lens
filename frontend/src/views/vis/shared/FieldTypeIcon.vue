<!--
 * @Description: 按字段类型编码展示图标
-->
<script setup lang="ts">
import { dataTypeLabel } from './types'

defineProps<{
  dataType?: string
}>()
</script>

<template>
  <span
    class="field-type-icon"
    :title="dataTypeLabel(dataType)"
  >
    <span
      v-if="dataType === 'string'"
      class="i-mingcute-font-size-line"
    />
    <span
      v-else-if="dataType === 'number'"
      class="i-mingcute-hashtag-line"
    />
    <span
      v-else-if="dataType === 'date'"
      class="i-mingcute-calendar-line"
    />
    <span
      v-else-if="dataType === 'datetime'"
      class="i-mingcute-time-line"
    />
    <span
      v-else-if="dataType === 'timestamp'"
      class="i-mingcute-stopwatch-line"
    />
    <span
      v-else
      class="i-mingcute-question-line"
    />
  </span>
</template>

<style scoped lang="scss">
.field-type-icon {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  color: var(--el-text-color-placeholder);

  > span {
    width: 14px;
    height: 14px;
  }
}
</style>
