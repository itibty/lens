<!--
 * @Description: 图表说明块；支持一段文案或编号列表
-->
<script setup lang="ts">
const props = withDefaults(defineProps<{
  text?: string
  items?: string[]
  title?: string
}>(), {
  items: () => [],
})

const lines = computed(() =>
  (props.items ?? []).map(item => item.trim()).filter(Boolean),
)

const visible = computed(() =>
  Boolean(props.text?.trim()) || lines.value.length > 0,
)
</script>

<template>
  <div v-if="visible" class="chart-doc">
    <div v-if="title" class="chart-doc__title">
      {{ title }}
    </div>
    <div
      v-if="text?.trim()"
      class="chart-doc__desc"
    >
      {{ text }}
    </div>
    <ol
      v-if="lines.length"
      class="chart-doc__list"
    >
      <li
        v-for="(item, index) in lines"
        :key="`${index}-${item}`"
      >
        {{ item }}
      </li>
    </ol>
  </div>
</template>

<style scoped lang="scss">
.chart-doc {
  margin-bottom: 12px;
  padding: 10px 12px;
  border-radius: 8px;
  background: var(--el-fill-color-light);
  border: 1px solid var(--el-border-color-lighter);

  &__title {
    margin-bottom: 6px;
    font-size: var(--vis-cfg-title-size, 13px);
    font-weight: var(--vis-cfg-title-weight, 500);
    color: var(--vis-cfg-title-color, var(--el-text-color-regular));
  }

  &__desc {
    font-size: var(--vis-cfg-meta-size, 12px);
    font-weight: 400;
    color: var(--vis-cfg-meta-color, var(--el-text-color-secondary));
    line-height: 1.5;
  }

  &__list {
    margin: 0;
    padding-left: 1.35em;
    font-size: var(--vis-cfg-meta-size, 12px);
    font-weight: 400;
    color: var(--vis-cfg-meta-color, var(--el-text-color-secondary));
    line-height: 1.6;

    li + li {
      margin-top: 2px;
    }
  }

  &__desc + &__list {
    margin-top: 6px;
  }
}
</style>
