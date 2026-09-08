<!-- 指标卡和趋势卡共用的辅指标组；中性浅底统一标签与数值，空间不足时整组换行。 -->
<script setup lang="ts">
import VisMetricValue from './VisMetricValue.vue'

defineProps<{
  items: Array<{
    key: string
    label: string
    text: string
    title?: string
    kind?: 'metric' | 'contrast'
    direction?: 'up' | 'down' | 'flat'
  }>
  showLabel: boolean
}>()
</script>

<template>
  <div class="vis-metric-aux">
    <div
      v-for="item in items"
      :key="item.key"
      class="vis-metric-aux__item"
      :class="item.kind === 'contrast' ? `is-${item.direction}` : undefined"
      :title="[`${item.label}：${item.text}`, item.title].filter(Boolean).join('\n')"
    >
      <span v-if="showLabel" class="vis-metric-aux__label">{{ item.label }}</span>
      <VisMetricValue
        class="vis-metric-aux__value"
        size="aux"
        :body="item.text"
        :direction="item.kind === 'contrast' ? item.direction : undefined"
      />
    </div>
  </div>
</template>

<style scoped lang="scss">
@use '@/theme/presentation.scss' as ui;

.vis-metric-aux {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  align-content: start;
  gap: 6px 8px;
  min-width: 0;
  min-height: 0;
  overflow-y: auto;
  scrollbar-width: thin;

  &__item {
    display: inline-flex;
    flex: 0 1 auto;
    align-items: baseline;
    gap: 6px;
    min-width: 0;
    max-width: 100%;
    @include ui.badge;
    color: var(--na-text-regular);

    &.is-up {
      color: var(--el-color-success);
    }

    &.is-down {
      color: var(--el-color-danger);
    }

    &.is-flat {
      color: var(--na-text-muted);
    }
  }

  &__label {
    flex: 0 1 auto;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: var(--vis-number-aux-label, 12px);
    line-height: 1.5;
    color: var(--na-text-muted);
  }

  &__value {
    flex: 0 1 auto;
  }
}
</style>
