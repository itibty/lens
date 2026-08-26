<!--
 * @Author: Chuang
 * @Date: 2022-12-12 13:26:13
 * @LastEditTime: 2025-08-05 19:52:03
 * @LastEditors: Chuang
 * @Description: 顶栏
-->
<script setup lang="ts" name="LayoutNavbar">
import type { MenuInfo } from '@/core/data'
import MenuIcon from '@/components/MenuIcon.vue'
import { menuIconClass } from '@/core/menuIcons'
import LayoutNotice from '@/layout/components/Notice/index.vue'
import { useAccountStore } from '@/stores/modules/account'
import { useAppStore } from '@/stores/modules/app'
import { useMenuStore } from '@/stores/modules/menu'

const accountStore = useAccountStore()
const menuStore = useMenuStore()
const { userInfo } = storeToRefs(accountStore)
const { rootMenus, activeRootId } = storeToRefs(menuStore)
const { appSetting } = storeToRefs(useAppStore())
const router = useRouter()
const route = useRoute()
const rootPopoverVisible = ref(false)

const activeRootName = computed(() =>
  rootMenus.value.find(item => item.id === activeRootId.value)?.name || '',
)

async function handleLogout() {
  await accountStore.logout()
  router.push({
    path: '/login',
  })
}
function handleProfile() {
  router.push({
    path: '/account',
  })
}
function goHome() {
  router.push({ path: '/' })
}

function switchRoot(root: MenuInfo) {
  rootPopoverVisible.value = false
  const sameModule = activeRootId.value === root.id
  menuStore.activateRoot(root.id)
  if (sameModule)
    return
  const url = menuStore.findFirstLeafUrl(root.id)
  if (url && url !== route.fullPath)
    router.push(url)
}
</script>

<template>
  <div class="dark header-wrapper">
    <div class="h-100% flex-xy">
      <div
        class="clickable logo-wrapper h-100% flex items-center pl-10px"
        :class="{ fold: appSetting.sidebarFold }"
        @click="goHome"
      >
        <img class="w-24px" src="@/assets/icons/logo.svg" alt="logo">
        <div class="logo-txt">
          Lens
        </div>
      </div>
      <el-popover
        v-model:visible="rootPopoverVisible"
        trigger="click"
        placement="bottom-start"
        :width="248"
        :show-arrow="false"
        popper-class="root-menu-popover"
      >
        <template #reference>
          <button
            type="button"
            class="root-nav-trigger clickable"
            :class="{ open: rootPopoverVisible }"
            title="切换工作区"
          >
            <span class="i-mingcute-grid-2-line root-nav-trigger__icon" />
            <span v-if="activeRootName" class="root-nav-trigger__name">{{ activeRootName }}</span>
          </button>
        </template>
        <div class="root-menu-grid">
          <button
            v-for="item in rootMenus"
            :key="item.id"
            type="button"
            class="root-menu-tile"
            :class="{ active: item.id === activeRootId }"
            @click="switchRoot(item)"
          >
            <MenuIcon
              v-if="menuIconClass(item.icon)"
              :icon="item.icon"
              class-name="root-menu-tile__icon"
            />
            <span class="root-menu-tile__name">{{ item.name }}</span>
          </button>
        </div>
      </el-popover>
    </div>
    <div class="h-100% flex-xy pr-10px">
      <div v-if="false" class="nav-link mr-10px flex-xy">
        <LayoutNotice />
      </div>
      <el-popover :width="210" popper-class="avatar-popover">
        <template #reference>
          <el-avatar :size="24" :src="userInfo.avatar" class="clickable">
            <img src="@/assets/images/empty-avatar.png" alt="">
          </el-avatar>
        </template>
        <template #default>
          <div
            class="base-border-bottom item-line flex items-center justify-between text-12px"
          >
            <div>
              {{ userInfo.realName || userInfo.username }}
            </div>
            <div class="clickable hover-link" @click="handleLogout">
              退出
            </div>
          </div>
          <div class="item-line flex items-center justify-between text-12px">
            <div class="hover-link clickable" @click="handleProfile">
              个人中心
            </div>
          </div>
        </template>
      </el-popover>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.header-wrapper {
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-sizing: border-box;
  height: 100%;
  border-bottom: 1px solid transparent;

  &.dark {
    background: var(--na-navbar-bg); //$navbar-deep-bg;
    border-bottom-color: var(--na-navbar-border-color);

    .logo-txt {
      color: var(--na-navbar-title-color);
    }

    .root-nav-trigger {
      color: var(--na-navbar-text-color);

      &:hover,
      &.open {
        color: var(--na-navbar-hover-text-color);
        background-color: var(--na-navbar-hover-bg);
      }
    }
  }

  &.light {
    background-color: var(--el-bg-color);

    .logo-txt {
      color: #2e2e2e;
    }

    .root-nav-trigger {
      color: #707070;

      &:hover,
      &.open {
        color: #2e2e2e;
        background-color: rgba(112, 112, 112, 0.2);
      }
    }
  }

  &.blue {
    background: $prussian-blue;

    // background: linear-gradient(270deg, #f8d900, #fff544);

    .logo-txt {
      color: #fff;
    }

    .root-nav-trigger {
      color: #c8d7e6;

      &:hover,
      &.open {
        color: #fff;
        background-color: rgba(200, 215, 230, 0.2);
      }
    }
  }
}

.logo-wrapper {
  box-sizing: border-box;
  width: 200px; //200

  &.fold {
    width: 42px !important; //42

    > .logo-txt {
      display: none;
    }
  }

  .logo-txt {
    font-weight: bolder;
    margin-left: 10px;
    height: 100%;
    display: flex;
    align-items: center;
  }
}

.root-nav-trigger {
  display: flex;
  align-items: center;
  gap: 6px;
  height: 28px;
  padding: 0 8px;
  border: 0;
  border-radius: var(--el-border-radius-base);
  background: transparent;
  font: inherit;
  color: inherit;
  cursor: pointer;

  &__icon {
    font-size: 16px;
  }

  &__name {
    font-size: 13px;
    max-width: 72px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}
</style>

<style lang="scss">
.avatar-popover {
  padding: 0 !important;

  .item-line {
    padding: 12px 16px;
    color: hsl(0deg 0% 0% / 85%);
    line-height: 1.5;
  }
}

.root-menu-popover {
  padding: 10px !important;

  .root-menu-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
  }

  .root-menu-tile {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    min-height: 84px;
    padding: 12px 8px 10px;
    border: 1px solid transparent;
    border-radius: 8px;
    background: var(--el-fill-color-lighter);
    color: var(--el-text-color-primary);
    cursor: pointer;

    &:hover {
      background: var(--el-fill-color);
    }

    &.active {
      border-color: var(--el-color-primary);
      background: var(--el-color-primary-light-9);
      color: var(--el-color-primary);
    }

    &__icon {
      font-size: 22px;
    }

    &__name {
      font-size: 12px;
      line-height: 1.2;
      text-align: center;
      word-break: break-all;
    }
  }
}
</style>
