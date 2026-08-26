<!--
 * @Description: 样式风格分区（卡片 / 配色 / 尺寸）
-->
<script setup lang="ts">
defineProps<{
  title: string
  hint?: string
}>()
</script>

<template>
  <section class="style-block">
    <header class="style-block__head">
      <div class="style-block__title">
        {{ title }}
      </div>
      <div
        v-if="hint"
        class="style-block__hint"
      >
        {{ hint }}
      </div>
    </header>
    <slot />
  </section>
</template>
