<!-- 当前值 / 目标值保持为同一行，分隔符也沿文字基线对齐。 -->
<script setup lang="ts">
defineProps<{ current: string, target: string }>()
</script>

<template>
  <span class="vis-metric-ratio" :title="`${current} / ${target}`">
    <span class="vis-metric-ratio__current">{{ current }}</span>
    <span class="vis-metric-ratio__separator">/</span>
    <span class="vis-metric-ratio__target">{{ target }}</span>
  </span>
</template>

<style scoped lang="scss">
.vis-metric-ratio {
  display: inline-flex;
  align-items: baseline;
  gap: 0.45em;
  min-width: 0;
  max-width: 100%;
  line-height: 1.5;
  font-variant-numeric: tabular-nums lining-nums;
  white-space: nowrap;

  &__current,
  &__target {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  &__current {
    font-weight: 600;
    color: var(--vis-content-color, var(--el-text-color-primary));
  }

  &__separator,
  &__target {
    font-weight: 400;
    color: var(--vis-muted-color, var(--el-text-color-secondary));
  }

  &__separator {
    flex: 0 0 auto;
  }
}
</style>
