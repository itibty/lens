<script setup lang="ts">
withDefaults(defineProps<{
  label?: string
  surface?: 'dark' | 'light'
}>(), {
  label: 'Lens',
  surface: 'light',
})

const axes = [
  { x: 4, y: 44.5, width: 92, height: 11, radius: 5.5, rotation: 0 },
  { x: 6, y: 44, width: 88, height: 12, radius: 6, rotation: 36 },
  { x: 4.5, y: 45, width: 91, height: 10, radius: 5, rotation: 72 },
  { x: 7, y: 44.25, width: 86, height: 11.5, radius: 5.75, rotation: 108 },
  { x: 5, y: 45, width: 90, height: 10, radius: 5, rotation: 144 },
] as const
</script>

<template>
  <svg
    class="lens-logo"
    :class="`lens-logo--on-${surface}`"
    viewBox="0 0 100 100"
    fill="none"
    role="img"
    :aria-label="label"
  >
    <g class="lens-logo__mark">
      <rect
        v-for="axis in axes"
        :key="axis.rotation"
        :x="axis.x"
        :y="axis.y"
        :width="axis.width"
        :height="axis.height"
        :rx="axis.radius"
        :transform="`rotate(${axis.rotation} 50 50)`"
      />
    </g>
  </svg>
</template>

<style scoped>
.lens-logo {
  --lens-logo-color: #292824;

  display: block;
  overflow: visible;
}

.lens-logo--on-dark {
  --lens-logo-color: #ebe9e2;
}

.lens-logo__mark {
  fill: var(--lens-logo-color);
}
</style>
