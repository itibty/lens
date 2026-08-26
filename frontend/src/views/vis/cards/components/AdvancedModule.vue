<!--
 * @Description: 高级设置分块（标题 / 内容 / 说明）
-->
<script setup lang="ts">
defineProps<{
  title: string
  tip?: string
  hint?: string
  invalid?: boolean
}>()
</script>

<template>
  <div class="adv-mod" :class="{ 'is-invalid': invalid }">
    <div class="adv-mod__head">
      <div class="adv-mod__title">
        {{ title }}
      </div>
      <div class="adv-mod__aside">
        <div
          v-if="$slots.extra"
          class="adv-mod__extra"
        >
          <slot name="extra" />
        </div>
        <el-tooltip
          v-if="tip"
          :content="tip"
          placement="top"
          :show-after="200"
        >
          <span
            class="i-mingcute-information-line adv-mod__tip"
            tabindex="0"
          />
        </el-tooltip>
      </div>
    </div>
    <slot />
    <div
      v-if="hint"
      class="adv-mod__hint"
    >
      {{ hint }}
    </div>
  </div>
</template>

<style scoped lang="scss">
.adv-mod {
  padding: 8px 10px;
  border: 1px solid var(--el-border-color-extra-light);
  border-radius: 8px;
  background: var(--el-fill-color-lighter);

  &.is-invalid {
    border-color: var(--el-color-danger-light-5);
  }

  &__head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    min-height: 22px;
    margin-bottom: 8px;
  }

  &__title {
    min-width: 0;
    font-size: var(--vis-cfg-group-size, 12px);
    font-weight: var(--vis-cfg-group-weight, 500);
    color: var(--vis-cfg-group-color, var(--el-text-color-regular));
    line-height: 1.3;
  }

  &__aside {
    display: flex;
    align-items: center;
    gap: 6px;
    min-width: 0;
    flex-shrink: 0;
    margin-left: auto;
  }

  &__tip {
    flex-shrink: 0;
    font-size: 14px;
    color: var(--vis-cfg-hint-color, var(--el-text-color-placeholder));
    cursor: help;

    &:hover,
    &:focus-visible {
      color: var(--vis-cfg-meta-color, var(--el-text-color-secondary));
    }
  }

  &__extra {
    display: flex;
    align-items: center;
    gap: 4px;
    min-width: 0;
    flex-shrink: 0;
  }

  &__hint {
    margin-top: 6px;
    font-size: var(--vis-cfg-hint-size, 12px);
    color: var(--vis-cfg-hint-color, var(--el-text-color-placeholder));
    line-height: 1.4;
  }
}
</style>
