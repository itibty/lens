<!--
 * @Description: 可视化看板预览（独立全屏，无侧栏顶栏）
-->
<script setup lang="ts">
import DashViewer from './components/DashViewer.vue'

defineOptions({ name: 'VisDashboardView' })
</script>

<template>
  <div class="view-page">
    <DashViewer standalone />
  </div>
</template>

<style scoped lang="scss">
.view-page {
  height: 100vh;
  height: 100dvh;
  overflow: hidden;
  --dash-safe-top: env(safe-area-inset-top, 0px);
  --dash-safe-right: env(safe-area-inset-right, 0px);
  --dash-safe-bottom: env(safe-area-inset-bottom, 0px);
  --dash-safe-left: env(safe-area-inset-left, 0px);

  :deep(.viewer.is-compact) {
    --dash-page-y: 9px;
    --dash-chrome-x: 12px;
    --dash-gutter: 8px;
    --dash-grid-gap: 10px;
  }

  :deep(.viewer.is-medium) {
    --dash-page-y: 10px;
    --dash-chrome-x: 16px;
    --dash-gutter: 10px;
    --dash-grid-gap: 12px;
  }

  :deep(.viewer__chrome) {
    padding-top: calc(var(--dash-page-y) + var(--dash-safe-top));
    padding-right: calc(var(--dash-chrome-x) + var(--dash-safe-right));
    padding-left: calc(var(--dash-chrome-x) + var(--dash-safe-left));
  }

  :deep(.viewer__body) {
    padding-right: calc(max(0px, var(--dash-page-x) - var(--dash-grid-gap)) + var(--dash-safe-right));
    padding-bottom: var(--dash-safe-bottom);
    padding-left: calc(max(0px, var(--dash-page-x) - var(--dash-grid-gap)) + var(--dash-safe-left));
  }

  :deep(.viewer__unavailable) {
    min-height: calc(100dvh - 200px);
  }

  :deep(.filter-dock__preview) {
    display: none;
  }

  :deep(.viewer:is(.is-compact, .is-medium) .viewer__chrome) {
    background: color-mix(in srgb, var(--dash-card-bg, var(--el-bg-color)) 94%, transparent);
    backdrop-filter: blur(14px) saturate(1.06);
    -webkit-backdrop-filter: blur(14px) saturate(1.06);
  }

  :deep(.viewer:is(.is-compact, .is-medium) .el-scrollbar__wrap) {
    overscroll-behavior-y: contain;
  }
}

@media (max-width: 359px) {
  .view-page :deep(.viewer.is-compact) {
    --dash-page-x: 10px;
    --dash-page-y: 8px;
    --dash-chrome-x: 10px;
    --dash-gutter: 7px;
    --dash-grid-gap: 8px;
  }
}
</style>
