<!--
 * @Author: Chuang
 * @Date: 2022-12-12 13:26:13
 * @LastEditTime: 2025-07-23 21:39:46
 * @LastEditors: Chuang
 * @Description: 首页
-->
<script setup lang="ts" name="HomeIndex">
// --  home index --
</script>

<template>
  <PageCard
    :show-header="false"
  >
    <div class="index-wrapper flex-xy">
      <SvgIcon icon="index" class-name="index-img" />
    </div>
  </PageCard>
</template>

<style lang="scss" scoped>
.index-wrapper {
  min-height: 100%;
  background-color: var(--el-bg-color);

  .index-img {
    width: 400px;
    height: 400px;
  }
}
</style>
