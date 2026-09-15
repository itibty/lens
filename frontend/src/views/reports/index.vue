<!--
 * @Description: 报表中心。多菜单共用本路由，靠 /vis/report/:id 区分看板。
-->
<script setup lang="ts">
import DashViewer from '@/views/vis/dashboards/components/DashViewer.vue'
import PersonalReports from './PersonalReports.vue'

defineOptions({ name: 'ReportView' })

const route = useRoute()
</script>

<template>
  <div class="report-page">
    <DashViewer v-if="route.params.id" />
    <PersonalReports v-else />
  </div>
</template>

<style scoped lang="scss">
.report-page {
  height: 100%;
  overflow: auto;
}
</style>
