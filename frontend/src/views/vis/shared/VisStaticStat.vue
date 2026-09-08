<!--
 * @Description: 文本卡静态数字 / 数字组
-->
<script setup lang="ts">
import type { VisStatItem } from './types'
import { formatStaticStat } from './staticModules'
import VisMetricValue from './VisMetricValue.vue'

const props = defineProps<{
  items: VisStatItem[]
}>()

const views = computed(() => props.items.map(formatStaticStat))
const many = computed(() => views.value.length > 1)
</script>

<template>
  <div
    class="vis-static-stat"
    :class="{ 'is-group': many }"
  >
    <div
      v-for="(item, index) in views"
      :key="index"
      class="vis-static-stat__item"
    >
      <div
        v-if="item.label"
        class="vis-static-stat__label"
      >
        {{ item.label }}
      </div>
      <div class="vis-static-stat__value">
        <VisMetricValue :body="item.body" :prefix="item.prefix" :suffix="item.suffix" size="inherit" />
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.vis-static-stat {
  display: flex;
  flex-direction: column;
  min-width: 0;

  &.is-group {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(88px, 1fr));
    gap: 10px 16px;
  }
}

.vis-static-stat__item {
  min-width: 0;
}

.vis-static-stat__label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-bottom: 2px;
  font-size: var(--vis-number-name, 13px);
  font-weight: 500;
  line-height: 1.3;
  color: var(--vis-muted-color, var(--el-text-color-secondary));
}

.vis-static-stat__value {
  display: flex;
  min-width: 0;
  font-size: var(--vis-number-value, 28px);
  font-weight: 650;
  color: var(--vis-content-color, var(--el-text-color-primary));
}
</style>
