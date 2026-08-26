<!--
 * @Description: 高级设置单项标签；说明图标在文字右侧
-->
<script setup lang="ts">
defineProps<{
  tip?: string
}>()
</script>

<template>
  <div class="adv-field__label">
    <span>
      <slot />
    </span>
    <el-tooltip
      v-if="tip"
      :content="tip"
      placement="top"
      :show-after="200"
    >
      <span
        class="i-mingcute-information-line adv-field__tip"
        tabindex="0"
      />
    </el-tooltip>
  </div>
</template>

<style scoped lang="scss">
.adv-field__label {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  min-width: 0;
  flex: 1 1 auto;
  font-size: var(--vis-cfg-label-size);
  font-weight: var(--vis-cfg-label-weight);
  color: var(--vis-cfg-label-color);
  line-height: 1.3;
}

.adv-field__tip {
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
