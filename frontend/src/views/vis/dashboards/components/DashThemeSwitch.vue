<script setup lang="ts">
import type { DashThemeId } from '../dashTheme'
import VisActionButton from '@/views/vis/shared/VisActionButton.vue'
import { DASH_THEME_PRESETS, dashOverlayVars } from '../dashTheme'

const theme = defineModel<DashThemeId>({ required: true })
</script>

<template>
  <div class="dash-theme-switch" data-dashboard-screenshot-ignore>
    <el-dropdown
      trigger="click"
      placement="top-end"
      :show-arrow="false"
      :popper-style="dashOverlayVars(theme)"
      popper-class="dash-theme-menu"
      @command="theme = $event"
    >
      <VisActionButton class="dash-theme-switch__button" label="切换看板主题" title="切换看板主题">
        <span :class="theme === 'dark' ? 'i-mingcute-moon-line' : 'i-mingcute-sun-line'" />
      </VisActionButton>
      <template #dropdown>
        <el-dropdown-menu>
          <el-dropdown-item
            v-for="item in DASH_THEME_PRESETS"
            :key="item.id"
            :command="item.id"
            role="menuitemradio"
            :aria-checked="theme === item.id"
          >
            <span class="dash-theme-menu__icon" :class="item.id === 'dark' ? 'i-mingcute-moon-line' : 'i-mingcute-sun-line'" />
            <span>{{ item.name }}</span>
            <span class="dash-theme-menu__check" :class="{ 'i-mingcute-check-line': theme === item.id }" />
          </el-dropdown-item>
        </el-dropdown-menu>
      </template>
    </el-dropdown>
  </div>
</template>

<style scoped lang="scss">
.dash-theme-switch {
  position: absolute;
  right: max(16px, env(safe-area-inset-right, 0px));
  bottom: max(16px, env(safe-area-inset-bottom, 0px));
  z-index: 100;
}

.dash-theme-switch__button {
  width: 36px;
  height: 36px;
  border: 1px solid var(--el-border-color-light);
  border-radius: 50%;
  background: var(--el-bg-color);
  color: var(--el-text-color-regular);
  box-shadow: var(--dash-card-shadow);
}
</style>

<style lang="scss">
.dash-theme-menu {
  .el-dropdown-menu__item {
    gap: 8px;
    min-height: 36px;

    &[aria-checked='true'] {
      color: var(--el-color-primary);
    }
  }

  .dash-theme-menu__icon,
  .dash-theme-menu__check {
    width: 16px;
    height: 16px;
  }

  .dash-theme-menu__check {
    margin-left: 16px;
  }

  @media (hover: none), (pointer: coarse) {
    .el-dropdown-menu__item {
      min-height: 44px;
    }
  }
}
</style>
