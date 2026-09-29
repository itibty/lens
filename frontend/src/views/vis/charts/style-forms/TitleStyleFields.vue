<!--
 * @Description: 标题 / 备注各自开关；标题不填跟卡片名称，备注不填跟卡片描述
-->
<script setup lang="ts">
import type { VisVisualConfig } from '@/views/vis/shared/types'
import { CARD_INPUT_PLACEHOLDERS } from '@/views/vis/charts/chartHelp'
import { needsDataset } from '@/views/vis/shared/types'
import { useVisualTitle } from './composables/useVisualTitle'
import StyleFormLabel from './StyleFormLabel.vue'

const visual = defineModel<VisVisualConfig>('visual', { required: true })
const { showTitle, title, showDescription, description } = useVisualTitle(visual)
const showDataFeatures = computed(() => needsDataset(visual.value.chartType))
const allowDownload = computed({
  get: () => !!visual.value.allowDownload,
  set: (value: boolean) => {
    if (value)
      visual.value.allowDownload = true
    else
      delete visual.value.allowDownload
  },
})
</script>

<template>
  <div class="vis-style-form__row">
    <StyleFormLabel>
      标题
    </StyleFormLabel>
    <el-switch v-model="showTitle" size="small" />
  </div>
  <div
    v-if="showTitle"
    class="vis-style-form__row is-block is-child"
  >
    <el-input
      v-model="title"
      size="small"
      maxlength="40"
      clearable
      :placeholder="CARD_INPUT_PLACEHOLDERS.title"
    />
  </div>

  <div class="vis-style-form__row">
    <StyleFormLabel>
      备注
    </StyleFormLabel>
    <el-switch v-model="showDescription" size="small" />
  </div>
  <div
    v-if="showDescription"
    class="vis-style-form__row is-block is-child"
  >
    <el-input
      v-model="description"
      type="textarea"
      size="small"
      :rows="2"
      maxlength="120"
      show-word-limit
      resize="vertical"
      :placeholder="CARD_INPUT_PLACEHOLDERS.note"
    />
  </div>

  <div
    v-if="showDataFeatures"
    class="vis-style-form__row"
  >
    <StyleFormLabel>
      数据下载
    </StyleFormLabel>
    <el-switch v-model="allowDownload" size="small" />
  </div>
</template>
