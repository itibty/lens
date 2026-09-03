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
    <g class="lens-logo__mark">
      <circle class="lens-logo__orbit" cx="50" cy="50" r="36" pathLength="100" />
      <path class="lens-logo__bar lens-logo__bar--short" d="M31 63V55" />
      <path class="lens-logo__bar lens-logo__bar--medium" d="M50 63V44" />
      <path class="lens-logo__bar lens-logo__bar--tall" d="M69 63V33" />
    </g>
  </svg>
</template>

<style scoped>
.lens-logo {
  --lens-logo-primary: #0b5fd7;
  --lens-logo-medium: #347fe5;
  --lens-logo-light: #72a9f2;

  display: block;
  overflow: visible;
}

.lens-logo--on-dark {
  --lens-logo-primary: #6da8ff;
  --lens-logo-medium: #4389ed;
  --lens-logo-light: #9bc5ff;
}

.lens-logo__orbit,
.lens-logo__bar {
  fill: none;
  stroke-linecap: round;
}

.lens-logo__orbit {
  stroke: var(--lens-logo-primary);
  stroke-width: 11;
  stroke-dasharray: 82 18;
}

.lens-logo__bar {
  stroke-width: 9;
}

.lens-logo__bar--short {
  stroke: var(--lens-logo-light);
}

.lens-logo__bar--medium {
  stroke: var(--lens-logo-medium);
}

.lens-logo__bar--tall {
  stroke: var(--lens-logo-primary);
}
</style>
