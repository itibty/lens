<!--
 * @Description: 功能表单标签；说明放问号 tooltip，不写在文案里
-->
<script setup lang="ts">
defineProps<{
  tip?: string
}>()
</script>

<template>
  <div class="vis-style-form__label">
    <span class="vis-style-form__label-text">
      <slot />
    </span>
    <el-tooltip
      v-if="tip"
      :content="tip"
      placement="top"
      :show-after="200"
    >
      <span
        class="i-mingcute-information-line vis-style-form__tip-icon"
        tabindex="0"
      />
    </el-tooltip>
  </div>
</template>
