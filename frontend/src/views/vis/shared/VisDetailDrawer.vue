<!--
 * @Description: 卡片构成行（CustomDrawer；设计器可挂到预览容器）
-->
<script setup lang="ts">
import type { VisVisualConfig } from '@/views/vis/shared/types'
import { useMediaQuery } from '@vueuse/core'
import VisDataTable from '@/views/vis/shared/VisDataTable.vue'

const props = withDefaults(defineProps<{
  title?: string
  tags?: string[]
  loading?: boolean
  error?: string
  data?: VIS.QueryDataResponse
  /** 设计器预览传入容器选择器；不传则全页弹出 */
  appendTo?: string
}>(), {
  title: '明细',
  tags: () => [],
  loading: false,
  error: '',
})

const open = defineModel<boolean>('open', { default: false })

const contained = computed(() => !!props.appendTo)
const mobileDrawer = useMediaQuery('(max-width: 767px), (pointer: coarse) and (max-width: 1024px)')
const drawerSize = computed(() => contained.value ? '52%' : mobileDrawer.value ? '86dvh' : '46%')
const tableVisual: VisVisualConfig = { chartType: 'table', table: { showFilter: true } }
const tableQuery: VIS.QueryConfig = { datasetId: '', metrics: [] }
const emptyData: VIS.QueryDataResponse = { columns: [], rows: [], total: 0, truncated: false }
const tableData = computed(() => props.data ?? emptyData)
const truncate = computed(() => !!tableData.value.truncated)
</script>

<template>
  <CustomDrawer
    v-if="open"
    v-model:visible="open"
    class="vis-detail-drawer-host"
    :class="{ 'is-contained': contained }"
    :title="title"
    direction="btt"
    :show-footer="false"
    header-border
    header-compact
    :modal="true"
    :lock-scroll="!contained"
    :append-to-body="!contained"
    :append-to="appendTo || undefined"
    :size-num="drawerSize"
  >
    <template
      v-if="tags.length"
      #custom-drawer-title
    >
      <div class="vis-detail-drawer__title">
        <span>{{ title }}</span>
        <div class="vis-detail-drawer__tags">
          <el-tag
            v-for="tag in tags"
            :key="tag"
            size="small"
            type="info"
          >
            {{ tag }}
          </el-tag>
        </div>
      </div>
    </template>
    <template #custom-drawer-body>
      <div class="vis-detail-drawer">
        <div
          v-if="error"
          class="vis-detail-drawer__error"
        >
          {{ error }}
        </div>
        <VisDataTable
          v-else
          :visual="tableVisual"
          :query="tableQuery"
          :data="tableData"
        />
        <div
          v-if="truncate && !error"
          class="vis-detail-drawer__hint"
        >
          （数据量较大，仅展示部分结果）
        </div>
        <div
          v-show="loading"
          class="vis-detail-drawer__loading"
        >
          <span class="i-svg-spinners-ring-resize" />
        </div>
      </div>
    </template>
  </CustomDrawer>
</template>

<style scoped lang="scss">
.vis-detail-drawer-host {
  :deep(.el-drawer__body) {
    display: flex;
    flex-direction: column;
    min-height: 0;
    overflow: hidden;
  }

  &:not(.is-contained) {
    :deep(.el-drawer__header) {
      padding-right: calc(12px + env(safe-area-inset-right, 0px));
      padding-left: calc(12px + env(safe-area-inset-left, 0px));
    }
  }
}

.vis-detail-drawer {
  position: relative;
  flex: 1 1 0;
  min-height: 0;
  height: 100%;
  display: flex;
  flex-direction: column;
  padding-top: 8px;
  padding-right: calc(12px + env(safe-area-inset-right, 0px));
  padding-bottom: calc(10px + env(safe-area-inset-bottom, 0px));
  padding-left: calc(12px + env(safe-area-inset-left, 0px));
  box-sizing: border-box;

  &__title {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
    font-size: 14px;
    line-height: 1;
    color: var(--el-text-color-regular);
  }

  &__tags {
    display: flex;
    flex: 1;
    min-width: 0;
    flex-wrap: wrap;
    gap: 4px;
  }

  &__error {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 13px;
    color: var(--el-color-warning);
  }

  &__hint {
    flex-shrink: 0;
    padding-top: 4px;
    font-size: 12px;
    color: var(--el-text-color-secondary);
  }

  &__loading {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: color-mix(in srgb, var(--el-bg-color) 48%, transparent);
    font-size: 28px;
    color: var(--el-color-primary);
  }
}

@media (hover: none), (pointer: coarse) {
  .vis-detail-drawer-host:not(.is-contained) {
    :deep(.el-drawer__close-btn) {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 44px;
      height: 44px;
      margin: -10px;
    }
  }
}
</style>
