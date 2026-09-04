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
}
</style>
