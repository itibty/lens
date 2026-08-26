<!--
 * @Description: 纯前端卡片正文（文本模块 / 网址），挂在数据模型
-->
<script setup lang="ts">
import type { QueryIssue } from '../cardApi'
import type { VisVisualConfig } from '@/views/vis/shared/types'
import { useVisualBranch } from '@/views/vis/charts/style-forms/composables/useVisualBranch'
import { shelfMessage } from '../cardApi'
import StaticModuleList from './StaticModuleList.vue'

const props = defineProps<{
  issues?: QueryIssue[]
}>()

const visual = defineModel<VisVisualConfig>('visual', { required: true })
const contentError = computed(() => shelfMessage(props.issues, 'content'))
const isHtml = computed(() => visual.value.chartType === 'richtext')
const pageUrl = useVisualBranch(visual, 'web').optionalStringField('url')
</script>

<template>
  <div
    class="static-content"
    :class="{ 'is-invalid': !!contentError }"
  >
    <StaticModuleList
      v-if="isHtml"
      v-model:visual="visual"
    />
    <template v-else>
      <div class="static-content__label">
        网页地址
      </div>
      <el-input
        v-model="pageUrl"
        class="static-content__control"
        clearable
        placeholder="https://example.com"
      />
    </template>
    <div
      v-if="contentError"
      class="static-content__error"
    >
      {{ contentError }}
    </div>
  </div>
</template>

<style scoped lang="scss">
.static-content {
  margin-bottom: 12px;

  &.is-invalid .static-content__control {
    :deep(.el-input__wrapper) {
      box-shadow: 0 0 0 1px var(--el-color-danger-light-5) inset;
    }
  }

  &__label {
    margin-bottom: 6px;
    font-size: var(--vis-cfg-label-size, 12px);
    color: var(--vis-cfg-label-color, var(--el-text-color-regular));
  }

  &__error {
    margin-top: 6px;
    font-size: 12px;
    line-height: 1.4;
    color: var(--el-color-danger);
  }
}
</style>
