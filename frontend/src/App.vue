<!--
 * @Author: Chuang
 * @Date: 2022-12-12 13:26:13
 * @LastEditTime: 2026-07-01 23:06:45
 * @LastEditors: Chuang
 * @Description: App页
-->
<script setup lang="ts">
import zhCn from 'element-plus/dist/locale/zh-cn.mjs'
import { useResourceUpdateChecker } from '@/hooks/checker'
// import { AppConfig } from './core/config'

// 启用资源检查更新
if (__IS_BUILD__) {
  useResourceUpdateChecker('/version.json', 60 * 1000)
}
</script>

<template>
  <el-config-provider size="default" :locale="zhCn">
    <div id="lens">
      <RouterView />
    </div>
  </el-config-provider>
</template>

<style scoped lang="scss">
#lens {
  width: 100%;
  height: 100%;
}
</style>
