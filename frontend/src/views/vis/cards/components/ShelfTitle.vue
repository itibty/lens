<!--
 * @Description: 投放区标题；说明放 info tooltip，不写在文案里
-->
<script setup lang="ts">
defineProps<{
  tip?: string
}>()
</script>

<template>
  <span class="shelf-title">
    <span class="shelf-title__text">
      <slot />
    </span>
    <el-tooltip
      v-if="tip"
      :content="tip"
      placement="top"
      :show-after="200"
    >
      <span
        class="shelf-title__tip i-mingcute-information-line"
        tabindex="0"
      />
    </el-tooltip>
  </span>
</template>

<style scoped lang="scss">
.shelf-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  width: 100%;
  min-width: 0;
}

.shelf-title__text {
  min-width: 0;
}

.shelf-title__tip {
  flex-shrink: 0;
  font-size: 14px;
  color: var(--vis-cfg-hint-color, var(--el-text-color-placeholder));
  cursor: help;

  &:hover,
  &:focus-visible {
    color: var(--vis-cfg-meta-color, var(--el-text-color-secondary));
  }
}
</style>
