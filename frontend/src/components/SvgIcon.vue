<!--
 * @Author: Chuang
 * @Date: 2022-12-29 17:56:24
 * @LastEditTime: 2025-10-30 17:21:07
 * @LastEditors: Chuang
 * @Description: svg图标，网络svg 或 本地assets/icons下svg图
-->
<script lang="ts" setup>
export interface SvgIconProps {
  icon: string // svg图片名 或 网络url
  className?: string // 样式
}

const props = withDefaults(defineProps<SvgIconProps>(), {
  className: '',
})
const isOnlineSvg = computed(() => /^https?:/.test(props.icon))
</script>

<template>
  <div
    v-if="isOnlineSvg"
    :style="{ '--svg-icon-url': `url(${icon})` }"
    class="svg-icon svg-icon-online"
    :class="className"
  />
  <svg v-else class="svg-icon" :class="className" aria-hidden="true">
    <use :xlink:href="`#icon-${icon}`" />
  </svg>
</template>

<style scoped lang="scss">
.svg-icon {
  width: 1em;
  height: 1em;
  overflow: hidden;
  fill: currentColor;
}

.svg-icon-online {
  display: inline-block;
  background: var(--svg-icon-url) no-repeat center;
  background-size: 100% 100%;
}
</style>
