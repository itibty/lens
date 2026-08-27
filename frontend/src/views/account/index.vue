<!--
 * @Author: Chuang
 * @Date: 2022-12-12 13:26:13
 * @LastEditTime: 2026-05-30 23:41:38
 * @LastEditors: Chuang
 * @Description:
-->
<script setup lang="ts">
import ModifyAccountPwd from './components/ModifyAccountPwd.vue'
</script>

<template>
  <PageCard container-style="width: 980px;margin:0 auto">
    <el-tabs tab-position="top">
      <el-tab-pane label="个人信息">
        <div class="base-padding">
          <el-alert
            title="个人信息暂不支持修改"
            type="info"
            show-icon
            :closable="false"
          />
        </div>
      </el-tab-pane>
      <el-tab-pane label="修改密码">
        <div class="base-padding flex justify-center">
          <ModifyAccountPwd class="w-500px" />
        </div>
      </el-tab-pane>
    </el-tabs>
  </PageCard>
</template>
