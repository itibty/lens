<!--
 * @Description: 可视化看板预览（独立全屏，无侧栏顶栏）
-->
<script setup lang="ts">
import DashViewer from './components/DashViewer.vue'

defineOptions({ name: 'VisDashboardView' })
</script>

<template>
  <div class="view-page">
    <DashViewer />
  </div>
</template>

<style scoped lang="scss">
.view-page {
  height: 100vh;
  overflow: hidden;
}
</style>
