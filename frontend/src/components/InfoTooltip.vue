<!-- 信息提示统一布局；保留调用方的图标、颜色和交互。 -->
<script setup lang="ts">
defineProps<{
  /** 使用换行分段，不解析 HTML。 */
  content?: string
}>()
</script>

<template>
  <el-tooltip
    placement="top"
    popper-class="info-tooltip-popper"
    :popper-options="{
      modifiers: [{ name: 'preventOverflow', options: { padding: 16 } }],
    }"
    :show-after="200"
    :hide-after="120"
    :enterable="true"
  >
    <template #content>
      <div class="info-tooltip__content">
        {{ content }}
      </div>
    </template>
    <slot />
  </el-tooltip>
</template>

<style scoped lang="scss">
// Tooltip 默认 teleport 到 body，外壳用专属类，避免影响其他浮层。
:global(.el-popper.info-tooltip-popper) {
  box-sizing: border-box;
  max-width: min(280px, calc(100vw - 32px));
  padding: 10px 12px;
}

.info-tooltip__content {
  max-height: min(320px, 50vh);
  overflow-y: auto;
  overscroll-behavior: contain;
  font-size: 12px;
  line-height: 1.65;
  text-align: left;
  white-space: pre-line;
  overflow-wrap: anywhere;
}
</style>
