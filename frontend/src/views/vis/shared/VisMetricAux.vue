<!-- 指标卡和趋势卡共用的辅指标网格；标签靠左、数值靠右，窄卡自动换行。 -->
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
  <div class="vis-metric-aux" :class="{ 'is-values-only': !showLabel }">
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
.vis-metric-aux {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 132px), 1fr));
  align-items: baseline;
  align-content: start;
  gap: 6px 20px;
  min-width: 0;
  min-height: 0;
  overflow-y: auto;
  scrollbar-width: thin;

  &.is-values-only {
    display: flex;
    flex-wrap: wrap;
  }

  &__item {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    justify-content: space-between;
    gap: 2px 8px;
    min-width: 0;
    max-width: 100%;
    color: var(--vis-content-color, var(--el-text-color-regular));

    &.is-up {
      color: var(--el-color-success);
    }

    &.is-down {
      color: var(--el-color-danger);
    }

    &.is-flat {
      color: var(--vis-muted-color, var(--el-text-color-secondary));
    }
  }

  &__label {
    flex: 1 1 3em;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: var(--vis-number-aux-label, 12px);
    line-height: 1.5;
    color: var(--vis-muted-color, var(--el-text-color-secondary));
  }

  &__value {
    flex: 0 1 auto;
    margin-left: auto;
  }
}
</style>
