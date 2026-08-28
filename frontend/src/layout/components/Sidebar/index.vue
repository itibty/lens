<!--
 * @Author: Chuang
 * @Date: 2022-12-12 13:26:13
 * @LastEditTime: 2025-12-16 10:03:26
 * @LastEditors: Chuang
 * @Description: 侧栏菜单
-->
<script setup lang="ts" name="LayoutSidebar">
import { UIConfig } from '@/core/config'
import MenuFilter from '@/layout/components/MenuFilter/index.vue'
import { useAppStore } from '@/stores/modules/app'
import { useMenuStore } from '@/stores/modules/menu'
import MenuItem from './MenuItem.vue'

const appStore = useAppStore()
const menuStore = useMenuStore()
const { appSetting } = storeToRefs(appStore)
const { menus, filterKeyword, activeRootId } = storeToRefs(menuStore)
const route = useRoute()

const activeMenu = computed<string>(() => {
  const meta = route.matched.at(-1)?.meta || {} // 当前路由meta
  const hasPathParams = Object.values(route.params).some(value =>
    Array.isArray(value) ? value.length > 0 : !!value,
  )
  // 有 menuId 或 path 参数（/vis/report/:id）用 path；仅靠 query 区分的多菜单仍用 fullPath
  const realPath = (meta.menuId || hasPathParams) ? route.path : route.fullPath
  const menuIdRoute = menuStore.getAllMenuIdRoute()
  if (meta.rootMenuId && menuIdRoute[meta.rootMenuId as string]) {
    const matchedRoute = menuIdRoute[meta.rootMenuId as string]
    if (matchedRoute)
      return matchedRoute.path
    else
      return realPath
  }
  return realPath
})

const showSidebarFilter = computed<boolean>(() => {
  return UIConfig.sidebarFilter && !appSetting.value.sidebarFold
})

function collectOpenIndexes(items: typeof menus.value): string[] {
  const keys: string[] = []
  for (const item of items) {
    if (item.hidden || !item.children?.length)
      continue
    keys.push(item.url || item.id)
    keys.push(...collectOpenIndexes(item.children))
  }
  return keys
}

const openedIndexes = computed(() => {
  if (!filterKeyword.value)
    return []
  return collectOpenIndexes(menus.value)
})
</script>

<template>
  <div class="sidebar-wrapper">
    <div v-if="showSidebarFilter" class="filter-wrap">
      <MenuFilter />
    </div>
    <div class="menu-wrap">
      <el-scrollbar>
        <el-menu
          :key="filterKeyword || activeRootId"
          class="sidebar"
          :class="{ fold: appSetting.sidebarFold }"
          :collapse="appSetting.sidebarFold"
          :default-active="activeMenu"
          :default-openeds="openedIndexes"
          :collapse-transition="false"
          :unique-opened="!filterKeyword && UIConfig.sidebarUniqueOpened"
          router
        >
          <template v-for="item in menus" :key="item.id">
            <MenuItem v-if="!item.hidden" :menu="item" />
          </template>
        </el-menu>
      </el-scrollbar>
    </div>

    <div
      class="clickable icon-btn collapse-btn flex-xy text-12px"
      :title="appSetting.sidebarFold ? '展开菜单' : '收起菜单'"
      @click="appStore.toggleSidebarFold(true)"
    >
      <i-ep-expand v-if="appSetting.sidebarFold" />
      <i-ep-fold v-else />
    </div>
  </div>
</template>

<style lang="scss" scoped>
.sidebar-wrapper {
  height: calc(100vh - #{$navbar-height});
  position: relative;
  display: flex;
  flex-direction: column;
  //background-color: red;

  :deep(.sidebar) {
    border-right: none !important;

    .el-menu-item,
    .el-sub-menu__title {
      min-width: 0;
    }

    .title-text {
      display: block;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      line-height: 1.3;
    }

    .icon {
      width: 20px;
      height: 20px;
    }

    .icon-font {
      font-size: 16px;
    }
  }
}

.filter-wrap {
  display: flex;
  align-items: center;
  height: $page-header-height;
  padding: 0 10px;
  box-sizing: border-box;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.menu-wrap {
  position: relative;
  flex: 1;
  overflow-y: hidden;
}

.collapse-btn {
  position: absolute;
  width: 24px;
  height: 24px;
  right: 10px;
  bottom: 10px;
  border-radius: var(--el-border-radius-base);
}

.empty-wrap {
  padding: 20px 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--el-text-color-secondary);
}
</style>
