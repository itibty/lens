<!--
 * @Description: 指标卡 / 进度条共用数值格式（小数位 / 前缀 / 千分位 / 紧凑）
-->
<script setup lang="ts">
import type { VisNumberDecimals } from '@/views/vis/shared/types'
import StyleFormLabel from './StyleFormLabel.vue'

const decimals = defineModel<VisNumberDecimals>('decimals', { required: true })
const prefix = defineModel<string | undefined>('prefix')
const separator = defineModel<boolean>('separator', { required: true })
const compact = defineModel<boolean>('compact', { required: true })
</script>

<template>
  <div class="vis-style-form__row">
    <StyleFormLabel>小数位</StyleFormLabel>
    <el-radio-group
      v-model="decimals"
      size="small"
      class="vis-style-form__segmented"
    >
      <el-radio-button value="auto">
        自动
      </el-radio-button>
      <el-radio-button :value="0">
        0
      </el-radio-button>
      <el-radio-button :value="1">
        1
      </el-radio-button>
      <el-radio-button :value="2">
        2
      </el-radio-button>
    </el-radio-group>
  </div>

  <div class="vis-style-form__row">
    <StyleFormLabel>前缀</StyleFormLabel>
    <el-input
      v-model="prefix"
      size="small"
      class="vis-style-form__control"
      maxlength="8"
      clearable
      placeholder="如 ¥、约"
    />
  </div>

  <div class="vis-style-form__row">
    <StyleFormLabel>千分位</StyleFormLabel>
    <el-switch
      v-model="separator"
      size="small"
      :disabled="compact"
    />
  </div>

  <div class="vis-style-form__row">
    <StyleFormLabel tip="达到万 / 亿时缩写">
      紧凑数量级
    </StyleFormLabel>
    <el-switch v-model="compact" size="small" />
  </div>
</template>
