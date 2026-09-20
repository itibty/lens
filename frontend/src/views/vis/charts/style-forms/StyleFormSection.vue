<!--
 * @Description: 功能设置单个折叠分组
-->
<script setup lang="ts">
withDefaults(defineProps<{
  title: string
  name: string
  collapsible?: boolean
}>(), { collapsible: true })
</script>

<template>
  <el-collapse-item :name="name" :disabled="!collapsible" :class="{ 'is-static': !collapsible }">
    <template #title>
      <div class="vis-style-form__section-head">
        <span>{{ title }}</span>
        <div
          v-if="$slots.extra"
          class="vis-style-form__section-extra"
          aria-disabled="false"
          @click.stop
          @keydown.stop
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
