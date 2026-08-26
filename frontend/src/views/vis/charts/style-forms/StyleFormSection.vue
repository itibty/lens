<!--
 * @Description: 功能设置单个折叠分组
-->
<script setup lang="ts">
defineProps<{
  title: string
  name: string
}>()
</script>

<template>
  <el-collapse-item :name="name">
    <template #title>
      <div class="vis-style-form__section-head">
        <span>{{ title }}</span>
        <div
          v-if="$slots.extra"
          class="vis-style-form__section-extra"
          @click.stop
        >
          <slot name="extra" />
        </div>
      </div>
    </template>
    <div class="vis-style-form__body">
      <slot />
    </div>
  </el-collapse-item>
</template>
