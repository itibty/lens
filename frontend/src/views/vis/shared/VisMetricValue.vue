<!-- 数字、单位和趋势符号共用一条文字基线；父组件只决定字号和颜色。 -->
<script setup lang="ts">
withDefaults(defineProps<{
  body: string
  prefix?: string
  compactSuffix?: string
  suffix?: string
  size?: 'hero' | 'aux' | 'inherit'
  direction?: 'up' | 'down' | 'flat'
}>(), { size: 'hero' })
</script>

<template>
  <span
    class="vis-metric-value"
    :class="`is-${size}`"
    :title="`${prefix || ''}${body}${compactSuffix || ''}${suffix || ''}`"
  >
    <span
      v-if="direction && direction !== 'flat'"
      class="vis-metric-value__direction"
      aria-hidden="true"
    >
      <svg viewBox="0 0 12 16" :class="`is-${direction}`">
        <path
          d="M 6 14 V 2 M 2 6 L 6 2 L 10 6"
          fill="none"
          stroke="currentColor"
          stroke-width="1.75"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    </span>
    <span v-if="prefix" class="vis-metric-value__affix">{{ prefix }}</span>
    <span class="vis-metric-value__body">{{ body }}</span>
    <span v-if="compactSuffix || suffix" class="vis-metric-value__affix">{{ compactSuffix }}{{ suffix }}</span>
  </span>
</template>

<style scoped lang="scss">
.vis-metric-value {
  display: inline-flex;
  align-items: baseline;
  gap: 0.12em;
  min-width: 0;
  max-width: 100%;
  line-height: 1.2;
  font-weight: 600;
  font-variant-numeric: tabular-nums lining-nums;
  white-space: nowrap;

  &.is-hero {
    font-size: var(--vis-number-value, 36px);
    font-weight: 650;
    letter-spacing: -0.025em;
  }

  &.is-aux {
    font-size: var(--vis-number-aux, 15px);
  }

  &.is-inherit {
    font-weight: inherit;
  }

  &__body {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  &__affix {
    flex: 0 0 auto;
    font-size: 0.8em;
    font-weight: 500;
    letter-spacing: 0;
  }

  &:is(.is-hero, .is-inherit) &__affix {
    font-size: 0.46em;
    opacity: 0.72;
  }

  &__direction {
    flex: 0 0 auto;
    line-height: inherit;

    svg {
      width: 0.75em;
      height: 1em;
      vertical-align: -0.08em;
    }

    .is-down {
      transform: rotate(180deg);
    }
  }
}
</style>
