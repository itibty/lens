<script setup lang="ts">
import { menuIconClass } from '@/core/menuIcons'

const props = withDefaults(defineProps<{
  icon?: string
  className?: string
}>(), {
  icon: '',
  className: '',
})

const iconClass = computed(() => menuIconClass(props.icon))
</script>

<template>
  <span v-if="iconClass" class="menu-icon" :class="[iconClass, className]" />
</template>

<style scoped lang="scss">
.menu-icon {
  display: inline-block;
  width: 1em;
  height: 1em;
  flex-shrink: 0;
}
</style>
