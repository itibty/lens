<!--
 * @Author: Chuang
 * @Date: 2022-12-12 13:26:13
 * @LastEditTime: 2025-06-04 23:22:28
 * @LastEditors: Chuang
 * @Description: 菜单过滤input
-->
<script setup lang="ts" name="LayoutMenuFilter">
import { Search } from '@element-plus/icons-vue'
import { useMenuStore } from '@/stores/modules/menu'

const menuStore = useMenuStore()
const filterText = ref('')

watch(
  () => menuStore.activeRootId,
  () => {
    filterText.value = ''
  },
)

function onFilterMenu() {
  menuStore.filterMenus(filterText.value)
}
</script>

<template>
  <el-input
    v-model="filterText"
    :prefix-icon="Search"
    class="filter-input"
    placeholder="输入检索"
    clearable
    @keyup.enter="onFilterMenu"
  />
</template>

<style lang="scss" scoped>
.filter-input {
  // --el-input-border-radius: 15px;
}
</style>
