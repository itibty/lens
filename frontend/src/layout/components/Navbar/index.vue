<!--
 * @Author: Chuang
 * @Date: 2022-12-12 13:26:13
 * @LastEditTime: 2025-08-05 19:52:03
 * @LastEditors: Chuang
 * @Description: 顶栏
-->
<script setup lang="ts" name="LayoutNavbar">
import type { MenuInfo } from '@/core/data'
import type { ModifyAccountPwdDialogInstance } from '@/views/account/components/ModifyAccountPwdDialog.vue'
import LensLogo from '@/components/LensLogo.vue'
import MenuIcon from '@/components/MenuIcon.vue'
import { menuIconClass } from '@/core/menuIcons'
import LayoutNotice from '@/layout/components/Notice/index.vue'
import { useAccountStore } from '@/stores/modules/account'
import { useAppStore } from '@/stores/modules/app'
import { useMenuStore } from '@/stores/modules/menu'
import ModifyAccountPwdDialog from '@/views/account/components/ModifyAccountPwdDialog.vue'

const SLOGANS = [
  '让数据更清晰',
  '看见数据价值',
  '聚焦数据洞见',
  '数据驱动决策',
] as const

const accountStore = useAccountStore()
const menuStore = useMenuStore()
const { userInfo } = storeToRefs(accountStore)
const { rootMenus, activeRootId } = storeToRefs(menuStore)
const { appSetting } = storeToRefs(useAppStore())
const router = useRouter()
const route = useRoute()
const rootPopoverVisible = ref(false)
const accountPopoverVisible = ref(false)
const modifyPwdDialogRef = ref<ModifyAccountPwdDialogInstance>()
const slogan = SLOGANS[Math.floor(Math.random() * SLOGANS.length)]

const activeRootName = computed(() =>
  rootMenus.value.find(item => item.id === activeRootId.value)?.name || '',
)

const displayName = computed(() => userInfo.value.username || '')

async function handleLogout() {
  accountPopoverVisible.value = false
  await accountStore.logout()
  router.push({
    path: '/login',
  })
}

function handleModifyPassword() {
  accountPopoverVisible.value = false
  modifyPwdDialogRef.value?.showDialog()
}
function goHome() {
  const url = menuStore.resolveHomeUrl()
  router.push(url || { path: '/index' })
}

function switchRoot(root: MenuInfo) {
  rootPopoverVisible.value = false
  const wasSame = activeRootId.value === root.id
  menuStore.activateRoot(root.id)
  const url = menuStore.findFirstLeafUrl(root.id)
  if (!url || url === route.fullPath || url === route.path)
    return
  if (root.id !== '90' && wasSame && menuStore.routeBelongsToRoot(route, root.id))
    return
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
        <LensLogo class="nav-logo" surface="dark" />
        <div class="logo-txt">
          <span class="logo-title">Lens</span>
          <span class="logo-divider" />
          <span class="logo-slogan">{{ slogan }}</span>
        </div>
      </div>
      <el-popover
        v-model:visible="rootPopoverVisible"
        trigger="click"
        placement="bottom-start"
        :width="268"
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
            <span class="root-nav-trigger__icon i-mingcute-grid-2-line" />
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
      <el-popover
        v-model:visible="accountPopoverVisible"
        :width="220"
        popper-class="account-popover"
      >
        <template #reference>
          <button
            type="button"
            class="account-trigger clickable"
            :title="displayName"
          >
            {{ displayName }}
          </button>
        </template>
        <template #default>
          <div class="account-popover__profile">
            <div class="account-popover__avatar">
              <span class="i-mingcute-user-3-fill" />
            </div>
            <div class="account-popover__identity">
              <strong>{{ userInfo.realName || userInfo.username }}</strong>
              <span>{{ userInfo.username }}</span>
            </div>
          </div>
          <button
            type="button"
            class="account-popover__action"
            @click="handleModifyPassword"
          >
            <span class="i-mingcute-key-2-line" />
            修改密码
          </button>
          <button
            type="button"
            class="account-popover__action"
            @click="handleLogout"
          >
            <span class="i-mingcute-exit-line" />
            退出登录
          </button>
        </template>
      </el-popover>
    </div>
  </div>
  <ModifyAccountPwdDialog ref="modifyPwdDialogRef" />
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

    .root-nav-trigger,
    .account-trigger {
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

    .root-nav-trigger,
    .account-trigger {
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

    .root-nav-trigger,
    .account-trigger {
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

  .nav-logo {
    flex: 0 0 24px;
    width: 24px;
    height: 24px;
  }

  &.fold {
    width: 42px !important; //42

    > .logo-txt {
      display: none;
    }
  }

  .logo-txt {
    display: flex;
    height: auto;
    align-items: flex-end;
    margin-left: 10px;
    white-space: nowrap;
  }

  .logo-title {
    font-weight: 700;
  }

  .logo-divider {
    width: 1px;
    height: 12px;
    margin: 0 7px;
    background: currentColor;
    opacity: 0.28;
  }

  .logo-slogan {
    font-size: 11px;
    font-weight: 400;
    opacity: 0.68;
  }
}

.account-trigger {
  height: 28px;
  padding: 0 8px;
  border: 0;
  border-radius: var(--el-border-radius-base);
  background: transparent;
  font: inherit;
  font-size: 13px;
  line-height: 28px;
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: inherit;
  cursor: pointer;
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
.account-popover {
  padding: 0 !important;
  overflow: hidden;

  &__profile {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 14px;
    border-bottom: 1px solid var(--el-border-color-lighter);
  }

  &__avatar {
    display: flex;
    flex: 0 0 36px;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background: var(--el-color-primary-light-9);
    color: var(--el-color-primary);
    font-size: 20px;
  }

  &__identity {
    display: flex;
    min-width: 0;
    flex-direction: column;
    gap: 3px;

    strong,
    span {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    strong {
      color: var(--el-text-color-primary);
      font-size: 13px;
      font-weight: 600;
    }

    span {
      color: var(--el-text-color-secondary);
      font-size: 12px;
    }
  }

  &__action {
    display: flex;
    align-items: center;
    gap: 9px;
    width: 100%;
    height: 38px;
    padding: 0 14px;
    border: 0;
    background: transparent;
    color: var(--el-text-color-regular);
    font: inherit;
    font-size: 13px;
    text-align: left;
    cursor: pointer;

    > span {
      font-size: 16px;
    }

    &:hover {
      background: var(--el-fill-color-light);
      color: var(--el-color-primary);
    }
  }
}

.root-menu-popover {
  padding: 12px !important;

  .root-menu-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
  }

  .root-menu-tile {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 10px;
    min-height: 104px;
    padding: 16px 12px;
    border: 1px solid transparent;
    border-radius: 10px;
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

    &__icon.menu-icon,
    &__icon {
      width: 24px;
      height: 24px;
      font-size: 24px;
      font-weight: 400;
    }

    &__name {
      font-size: 13px;
      line-height: 1.2;
      text-align: center;
      max-width: 100%;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }
}
</style>
