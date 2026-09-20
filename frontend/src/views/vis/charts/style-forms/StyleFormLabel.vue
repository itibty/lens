<!--
 * @Description: 功能表单标签；补充说明放 info tooltip
-->
<script setup lang="ts">
import InfoTooltip from '@/components/InfoTooltip.vue'

defineProps<{
  tip?: string
}>()
</script>

<template>
  <div class="vis-style-form__label">
    <span class="vis-style-form__label-text">
      <slot />
    </span>
    <InfoTooltip
      v-if="tip"
      :content="tip"
    >
      <span
        class="vis-style-form__tip-icon i-mingcute-information-line"
        tabindex="0"
      />
    </InfoTooltip>
  </div>
</template>
