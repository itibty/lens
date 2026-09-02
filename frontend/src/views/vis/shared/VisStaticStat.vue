<!--
 * @Description: 文本卡静态数字 / 数字组
-->
<script setup lang="ts">
import type { VisStatItem } from './types'
import { formatStaticStat } from './staticModules'

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
        <span
          v-if="item.prefix"
          class="vis-static-stat__affix"
        >{{ item.prefix }}</span>
        <span class="vis-static-stat__body">{{ item.body }}</span>
        <span
          v-if="item.suffix"
          class="vis-static-stat__affix"
        >{{ item.suffix }}</span>
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
  color: var(--vis-content-color, var(--el-text-color-secondary));
  opacity: 0.88;
}

.vis-static-stat__value {
  display: flex;
  align-items: baseline;
  min-width: 0;
  overflow: hidden;
  font-size: var(--vis-number-value, 28px);
  font-weight: 650;
  letter-spacing: -0.025em;
  line-height: 1.05;
  color: var(--vis-content-color, var(--el-text-color-primary));
  font-variant-numeric: tabular-nums lining-nums;
  white-space: nowrap;
}

.vis-static-stat__affix {
  flex-shrink: 0;
  margin-right: 0.08em;
  font-size: 0.48em;
  font-weight: 500;
  opacity: 0.42;
}

.vis-static-stat__body {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
