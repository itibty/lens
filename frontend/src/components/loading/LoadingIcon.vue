<script setup lang="ts">
import type { LoadingStyle } from '@/core/config'
import { BRAND_LOADING_SVG, resolveLoadingStyle } from './loading'

const props = withDefaults(defineProps<{
  variant?: LoadingStyle
  size?: number | string
  color?: string
}>(), {
  size: 36,
})

const variant = computed(() => resolveLoadingStyle(props.variant))
const iconSize = computed(() => typeof props.size === 'number' ? `${props.size}px` : props.size)
</script>

<template>
  <span
    class="lens-loading-icon"
    :style="{ width: iconSize, height: iconSize, fontSize: iconSize, color }"
    aria-hidden="true"
  >
    <svg v-if="variant === 'brand'" viewBox="0 0 100 100" focusable="false" v-html="BRAND_LOADING_SVG" />
    <span v-else class="i-svg-spinners-ring-resize" />
  </span>
</template>

<style scoped>
.lens-loading-icon {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  vertical-align: middle;
  color: var(--el-color-primary);
  pointer-events: none;
}

.lens-loading-icon > svg {
  display: block;
  width: 100%;
  height: 100%;
}
</style>
