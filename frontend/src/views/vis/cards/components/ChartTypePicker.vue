<!--
 * @Description: 图表类型选择（按用途：指标 / 对比 / 趋势 / 构成 / 关系 / 表格 / 其他）
-->
<script setup lang="ts">
import type { ChartType } from '@/views/vis/shared/types'
import { CHART_PICKER_GROUPS, listPublishedChartDefinitions } from '@/views/vis/charts'
import { chartTypeIconUrl } from '@/views/vis/charts/chartIcons'

const props = defineProps<{
  chartType: ChartType
}>()

const emit = defineEmits<{
  pick: [value: ChartType]
}>()

const POPOVER_WIDTH = 400

const popoverVisible = ref(false)
const keyword = ref('')
const searchRef = ref<{ focus?: () => void }>()

const covers = listPublishedChartDefinitions().map(def => ({
  value: def.type,
  label: def.label,
  group: def.group,
  summary: def.summary,
  iconUrl: chartTypeIconUrl(def.type),
}))

const matchedCovers = computed(() => {
  const q = keyword.value.trim()
  if (!q)
    return covers
  return covers.filter(item => item.label.includes(q))
})

const groups = computed(() =>
  CHART_PICKER_GROUPS.map(group => ({
    ...group,
    items: matchedCovers.value.filter(item => item.group === group.id),
  })).filter(group => group.items.length),
)

const current = computed(() =>
  covers.find(item => item.value === props.chartType),
)

watch(popoverVisible, (open) => {
  if (!open) {
    keyword.value = ''
    return
  }
  nextTick(() => searchRef.value?.focus?.())
})

function selectType(value: ChartType) {
  popoverVisible.value = false
  if (value === props.chartType)
    return
  emit('pick', value)
}
</script>

<template>
  <div class="chart-type-picker">
    <el-popover
      v-model:visible="popoverVisible"
      placement="bottom-start"
      :width="POPOVER_WIDTH"
      trigger="click"
      :show-arrow="true"
      popper-class="chart-type-picker-popper"
    >
      <template #reference>
        <button
          type="button"
          class="chart-type-picker__trigger"
          :class="{ 'is-open': popoverVisible }"
        >
          <span class="chart-type-picker__trigger-main">
            <img
              v-if="current?.iconUrl"
              class="chart-type-picker__trigger-icon"
              :src="current.iconUrl"
              alt=""
            >
            <span class="chart-type-picker__trigger-label">
              {{ current?.label || '选择组件' }}
            </span>
          </span>
          <span class="chart-type-picker__trigger-caret i-mingcute-down-line" />
        </button>
      </template>

      <div class="chart-type-picker__panel">
        <el-input
          ref="searchRef"
          v-model="keyword"
          class="chart-type-picker__search"
          clearable
          placeholder="搜索组件"
          @keydown.enter.prevent
        >
          <template #prefix>
            <span class="i-mingcute-search-line" />
          </template>
        </el-input>
        <el-empty
          v-if="!groups.length"
          class="chart-type-picker__empty"
          description="暂无相关图表"
          :image-size="56"
        />
        <section
          v-for="group in groups"
          :key="group.id"
          class="chart-type-picker__group"
        >
          <div class="chart-type-picker__group-title">
            {{ group.label }}
          </div>
          <div class="chart-type-picker__grid">
            <button
              v-for="item in group.items"
              :key="item.value"
              type="button"
              class="chart-cover"
              :class="{ 'is-active': props.chartType === item.value }"
              @click="selectType(item.value)"
            >
              <img
                v-if="item.iconUrl"
                class="chart-cover__icon"
                :src="item.iconUrl"
                alt=""
              >
              <span class="chart-cover__label">{{ item.label }}</span>
            </button>
          </div>
        </section>
      </div>
    </el-popover>
    <p
      v-if="current?.summary"
      class="chart-type-picker__summary"
    >
      <span class="chart-type-picker__summary-text">{{ current.summary }}</span>
    </p>
  </div>
</template>

<style scoped lang="scss">
.chart-type-picker {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 2fr);
  align-items: stretch;
  padding: 0;
  border-bottom: 1px solid var(--el-border-color-lighter);

  :deep(.el-tooltip__trigger) {
    display: flex !important;
    width: 100%;
    min-width: 0;
    align-self: stretch;
    box-sizing: border-box;
  }

  &__trigger {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: flex-start;
    width: 100%;
    min-width: 0;
    min-height: 40px;
    height: 100%;
    padding: 0 28px 0 12px;
    box-sizing: border-box;
    border: none;
    border-radius: 0;
    background: var(--vis-select-bg, #e6f0fa);
    color: var(--vis-select-fg, #124a78);
    cursor: pointer;
    transition: background 0.15s ease;

    &:hover,
    &.is-open {
      background: var(--el-color-primary-light-8);

      .chart-type-picker__trigger-caret {
        color: var(--vis-select-fg, #124a78);
      }
    }
  }

  &__trigger-main {
    display: inline-flex;
    align-items: center;
    justify-content: flex-start;
    gap: 6px;
    min-width: 0;
    max-width: 100%;
  }

  &__trigger-icon {
    display: block;
    width: 22px;
    height: 22px;
    flex-shrink: 0;
    object-fit: contain;
  }

  &__trigger-label {
    font-size: 13px;
    font-weight: 600;
    line-height: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__trigger-caret {
    position: absolute;
    top: 50%;
    right: 8px;
    transform: translateY(-50%);
    font-size: 14px;
    color: var(--vis-select-fg, #124a78);
    pointer-events: none;
  }

  &__summary {
    display: flex;
    align-items: center;
    min-width: 0;
    margin: 0;
    padding: 8px 12px;
    box-sizing: border-box;
    background: var(--vis-muted-bar, #e8eef5);
  }

  &__summary-text {
    min-width: 0;
    font-size: 12px;
    font-weight: 400;
    line-height: 1.45;
    color: var(--el-text-color-secondary);
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    overflow: hidden;
  }

  &__panel {
    max-height: min(70vh, 560px);
    overflow: auto;
  }

  &__search {
    position: sticky;
    top: 0;
    z-index: 1;
    margin-bottom: 10px;
    background: var(--el-bg-color);
  }

  &__empty {
    padding: 12px 0 4px;
  }

  &__group + &__group {
    margin-top: 12px;
  }

  &__group-title {
    margin-bottom: 8px;
    font-size: 12px;
    font-weight: 500;
    color: var(--el-text-color-regular);
  }

  &__grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 8px;
  }
}

.chart-cover {
  width: 100%;
  min-height: 72px;
  padding: 6px 4px 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  border-radius: 8px;
  border: 1px solid var(--el-border-color);
  background: #fff;
  color: var(--el-text-color-regular);
  cursor: pointer;
  box-sizing: border-box;
  transition:
    border-color 0.15s ease,
    background 0.15s ease,
    color 0.15s ease,
    box-shadow 0.15s ease;

  &__icon {
    display: block;
    width: 42px;
    height: 42px;
    flex-shrink: 0;
    object-fit: contain;
  }

  &__label {
    max-width: 100%;
    padding: 0 2px;
    font-size: 11px;
    line-height: 1.2;
    text-align: center;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &:hover {
    border-color: var(--vis-select-border, #1f6fad);
    color: var(--vis-select-fg, #124a78);
    background: var(--vis-select-bg, #e6f0fa);
  }

  &.is-active {
    border-color: var(--vis-select-border, #1f6fad);
    color: var(--vis-select-fg, #124a78);
    background: var(--vis-select-bg, #e6f0fa);
  }
}
</style>
