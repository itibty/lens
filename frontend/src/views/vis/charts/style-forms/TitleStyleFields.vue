<!--
 * @Description: 标题 / 备注各自开关；标题不填跟卡片名称，备注不填跟卡片描述
-->
<script setup lang="ts">
import type { VisVisualConfig } from '@/views/vis/shared/types'
import {
  AUTO_REFRESH_OPTIONS,
  DEFAULT_AUTO_REFRESH_SEC,
  sanitizeAutoRefreshSec,
} from '@/views/vis/shared/cardRefresh'
import { needsDataset } from '@/views/vis/shared/types'
import { useVisualTitle } from './composables/useVisualTitle'
import StyleFormLabel from './StyleFormLabel.vue'

const visual = defineModel<VisVisualConfig>('visual', { required: true })
const { showTitle, title, showDescription, description } = useVisualTitle(visual)
const showDetailSwitch = computed(() => needsDataset(visual.value.chartType))
const autoRefresh = computed({
  get: () => sanitizeAutoRefreshSec(visual.value.autoRefreshSec) != null,
  set: (value: boolean) => {
    if (value)
      visual.value.autoRefreshSec = DEFAULT_AUTO_REFRESH_SEC
    else
      delete visual.value.autoRefreshSec
  },
})
const autoRefreshSec = computed({
  get: () => sanitizeAutoRefreshSec(visual.value.autoRefreshSec) ?? DEFAULT_AUTO_REFRESH_SEC,
  set: (value: number) => {
    const sec = sanitizeAutoRefreshSec(value)
    if (sec)
      visual.value.autoRefreshSec = sec
    else
      delete visual.value.autoRefreshSec
  },
})
const allowDetail = computed({
  get: () => !!visual.value.allowDetail,
  set: (value: boolean) => {
    if (value)
      visual.value.allowDetail = true
    else
      delete visual.value.allowDetail
  },
})
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
    <StyleFormLabel tip="显示在卡片左上角">
      标题
    </StyleFormLabel>
    <el-switch v-model="showTitle" size="small" />
  </div>
  <div
    v-if="showTitle"
    class="vis-style-form__row is-block"
  >
    <el-input
      v-model="title"
      size="small"
      maxlength="40"
      clearable
      placeholder="不填则跟随卡片名称"
    />
  </div>

  <div class="vis-style-form__row">
    <StyleFormLabel tip="显示在标题旁；不填则跟随卡片描述">
      备注
    </StyleFormLabel>
    <el-switch v-model="showDescription" size="small" />
  </div>
  <div
    v-if="showDescription"
    class="vis-style-form__row is-block"
  >
    <el-input
      v-model="description"
      type="textarea"
      size="small"
      :rows="2"
      maxlength="120"
      show-word-limit
      resize="vertical"
      placeholder="不填则跟随卡片描述"
    />
  </div>

  <div
    v-if="showDetailSwitch"
    class="vis-style-form__row"
  >
    <StyleFormLabel tip="点数据打开菜单查看构成行；卡片图标查看全部明细">
      查看明细
    </StyleFormLabel>
    <el-switch v-model="allowDetail" size="small" />
  </div>

  <div
    v-if="showDetailSwitch"
    class="vis-style-form__row"
  >
    <StyleFormLabel tip="开启下载 Excel 按钮">
      数据下载
    </StyleFormLabel>
    <el-switch v-model="allowDownload" size="small" />
  </div>

  <div
    v-if="showDetailSwitch"
    class="vis-style-form__row"
  >
    <StyleFormLabel tip="看板预览时按间隔重新查数">
      自动刷新
    </StyleFormLabel>
    <el-switch v-model="autoRefresh" size="small" />
  </div>
  <div
    v-if="showDetailSwitch && autoRefresh"
    class="vis-style-form__row"
  >
    <StyleFormLabel>
      刷新频率
    </StyleFormLabel>
    <el-select
      v-model="autoRefreshSec"
      size="small"
      class="vis-style-form__control"
    >
      <el-option
        v-for="item in AUTO_REFRESH_OPTIONS"
        :key="item.value"
        :label="item.label"
        :value="item.value"
      />
    </el-select>
  </div>
</template>
