<!--
 * @Author: Chuang
 * @Date: 2022-12-30 13:55:40
 * @LastEditTime: 2026-05-20 21:19:38
 * @LastEditors: Chuang
 * @Description: 菜单递归组件
-->
<script lang="ts" setup name="MenuItem">
import type { MenuInfo } from '@/core/data'
import MenuIcon from '@/components/MenuIcon.vue'
import { menuIconClass } from '@/core/menuIcons'

import MenuItem from './MenuItem.vue' // 组件递归

const props = defineProps<{
  menu: MenuInfo
}>()

const menuIndex = computed(() => props.menu.url || props.menu.id)
</script>

<template>
  <el-sub-menu
    v-if="menu.children && menu.children.length > 0"
    :index="menuIndex"
  >
    <template #title>
      <el-icon v-if="menuIconClass(menu.icon)" :size="22">
        <MenuIcon :icon="menu.icon" class-name="icon" />
      </el-icon>
      <span class="title-text" :title="menu.name">{{ menu.name }}</span>
    </template>
    <template v-for="item in menu.children" :key="item.id">
      <MenuItem v-if="!item.hidden" :menu="item" />
    </template>
  </el-sub-menu>
  <el-menu-item v-else :index="menuIndex">
    <el-icon v-if="menuIconClass(menu.icon)" :size="22">
      <MenuIcon :icon="menu.icon" class-name="icon" />
    </el-icon>
    <template #title>
      <span class="title-text" :title="menu.name">{{ menu.name }}</span>
      <el-tag
        v-if="menu.tag"
        class="absolute right-10px"
        :type="menu.tag!.type || 'danger'"
        :effect="menu.tag!.effect || 'dark'"
        size="small"
        :round="menu.tag!.round || true"
      >
        {{ menu.tag!.text }}
      </el-tag>
    </template>
  </el-menu-item>
</template>

<style lang="scss" scoped></style>
