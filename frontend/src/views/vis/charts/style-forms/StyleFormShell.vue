<!--
 * @Description: 功能设置折叠壳
-->
<script setup lang="ts">
const openSections = defineModel<(string | number)[]>({ required: true })
</script>

<template>
  <el-collapse
    v-model="openSections"
    class="vis-style-form"
  >
    <slot />
  </el-collapse>
</template>

<style lang="scss">
@use './vis-style-form.scss';
</style>
