<script setup lang="ts">
import { LENS_LOGO_SVG } from './brand/lensLogo'

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
    v-html="LENS_LOGO_SVG"
  />
</template>

<style scoped>
.lens-logo {
  --lens-logo-primary: var(--na-color-primary);

  display: block;
  overflow: visible;
  color: var(--lens-logo-primary);
}

.lens-logo--on-dark {
  --lens-logo-primary: var(--na-brand-on-dark);
}
</style>
