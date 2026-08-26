<!--
 * @Author: Chuang
 * @Date: 2022-12-13 16:58:29
 * @LastEditTime: 2025-07-29 18:14:48
 * @LastEditors: Chuang
 * @Description: 布局
-->
<script setup lang="ts" name="LayoutIndex">
import { useKeepPageStore } from '@/stores/modules/keepPage'
import { useMenuStore } from '@/stores/modules/menu'
import Navbar from './components/Navbar/index.vue'
import Sidebar from './components/Sidebar/index.vue'

const keepPageStore = useKeepPageStore()
const menuStore = useMenuStore()
const route = useRoute()
const router = useRouter()

function isReportShell(path: string) {
  const p = path.length > 1 && path.endsWith('/') ? path.slice(0, -1) : path
  return p === '/vis/report'
}

watch(
  () => route.fullPath,
  async () => {
    const prev = menuStore.activeRootId
    menuStore.syncActiveRootFromRoute(route)
    const entered = menuStore.activeRootId !== prev
    if (entered)
      await menuStore.ensureReportTree()
    if (!isReportShell(route.path))
      return
    if (!entered)
      await menuStore.ensureReportTree()
    const url = menuStore.findFirstLeafUrl(menuStore.activeRootId)
    if (url && url !== route.path && url !== route.fullPath)
      await router.push(url)
  },
)
</script>

<template>
  <el-container class="layout-container">
    <el-header class="header">
      <Navbar />
    </el-header>
    <el-container>
      <el-aside
        class="sidebar"
      >
        <Sidebar />
      </el-aside>
      <el-main id="main-layout" class="base-content-bg main">
        <RouterView v-slot="{ Component }">
          <KeepAlive :max="10" :include="keepPageStore.pages">
            <component :is="Component" />
          </KeepAlive>
        </RouterView>
      </el-main>
    </el-container>
  </el-container>
</template>

<style lang="scss" scoped>
.layout-container {
  height: 100%;
  padding: 0;
}
.header {
  height: $navbar-height;
  box-sizing: border-box;
  padding: 0;
  z-index: 10;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.sidebar {
  position: relative;
  width: auto;
  max-width: 200px;
  box-sizing: border-box;
  z-index: 9;
  border-right: 1px solid var(--el-border-color-lighter);
}

.main {
  position: relative;
  height: calc(100vh - #{$navbar-height});
  max-height: calc(100vh - #{$navbar-height});
  box-sizing: border-box;
  padding: 0;
}
</style>
