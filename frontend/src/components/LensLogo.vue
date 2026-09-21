<script setup lang="ts">
withDefaults(defineProps<{
  label?: string
  surface?: 'dark' | 'light'
}>(), {
  label: 'Lens',
  surface: 'light',
})
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
    <circle class="lens-logo__orbit" cx="50" cy="50" r="37" pathLength="100" transform="rotate(55 50 50)" />
    <circle class="lens-logo__focus" cx="50" cy="50" r="16" />
  </svg>
</template>

<style scoped>
.lens-logo {
  --lens-logo-primary: var(--na-color-primary);

  display: block;
  overflow: visible;
}

.lens-logo--on-dark {
  --lens-logo-primary: var(--na-brand-on-dark);
}

.lens-logo__orbit {
  fill: none;
  stroke-linecap: round;
  stroke: var(--lens-logo-primary);
  stroke-width: 9;
  stroke-dasharray: 88 12;
}

.lens-logo__focus {
  fill: var(--lens-logo-primary);
}
</style>
