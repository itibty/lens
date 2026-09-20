<!-- 主 / 辅指标共用的期限说明，无期限时不创建 Tooltip。 -->
<script setup lang="ts">
import type { MetricTooltipPeriod } from './metricTooltip'
import { ElTooltip } from 'element-plus'
import { computed, inject } from 'vue'
import { LENS_THEME_KEY } from '@/theme/context'
import { themeCssVars } from '@/theme/cssVars'

defineProps<{
  periods?: MetricTooltipPeriod[]
}>()

// Tooltip teleport 到 body 后仍沿用当前看板主题。
const theme = inject(LENS_THEME_KEY, null)
const popperStyle = computed(() => theme?.value ? themeCssVars(theme.value) : undefined)
</script>

<template>
  <ElTooltip
    v-if="periods?.length"
    effect="light"
    placement="top"
    popper-class="vis-metric-tooltip-popper"
    :popper-style="popperStyle"
    :popper-options="{ modifiers: [{ name: 'preventOverflow', options: { padding: 16 } }] }"
    :show-after="200"
    :hide-after="120"
    :enterable="true"
  >
    <template #content>
      <div class="vis-metric-tooltip">
        <dl class="vis-metric-tooltip__periods">
          <template v-for="period in periods" :key="period.label">
            <dt>{{ period.label }}</dt>
            <dd>{{ period.range }}</dd>
          </template>
        </dl>
      </div>
    </template>
    <slot />
  </ElTooltip>
  <slot v-else />
</template>

<style scoped lang="scss">
:global(.el-popper.vis-metric-tooltip-popper) {
  box-sizing: border-box;
  max-width: min(320px, calc(100vw - 32px));
  padding: 10px 12px;
}

.vis-metric-tooltip {
  max-height: min(320px, 50vh);
  overflow-y: auto;
  overscroll-behavior: contain;
  font-size: 12px;
  line-height: 1.6;
  text-align: left;
  white-space: normal;
  overflow-wrap: anywhere;
  color: var(--el-text-color-primary);

  &__periods {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    gap: 4px 12px;
    margin: 0;

    dt {
      color: var(--el-text-color-secondary);
      white-space: nowrap;
    }

    dd {
      margin: 0;
      font-variant-numeric: tabular-nums;
    }
  }
}
</style>
