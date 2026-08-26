<!--
 * @Description: 报表中心。多菜单共用本路由，靠 /vis/report/:id 区分看板。
-->
<script setup lang="ts">
import DashViewer from '@/views/vis/dashboards/components/DashViewer.vue'

defineOptions({ name: 'ReportView' })
</script>

<template>
  <div class="report-page">
    <DashViewer />
  </div>
</template>

<style scoped lang="scss">
.report-page {
  height: 100%;
  overflow: hidden;
}
</style>
