<!--
 * @Description: 看板配置 · 通用。只改草稿。
-->
<script setup lang="ts">
import {
  AUTO_REFRESH_OPTIONS,
  DEFAULT_AUTO_REFRESH_SEC,
  sanitizeAutoRefreshSec,
} from '@/views/vis/shared/cardRefresh'

const autoRefreshSec = defineModel<number | undefined>('autoRefreshSec')

const autoRefreshOn = computed({
  get: () => sanitizeAutoRefreshSec(autoRefreshSec.value) != null,
  set: (on: boolean) => {
    autoRefreshSec.value = on ? DEFAULT_AUTO_REFRESH_SEC : undefined
  },
})
const autoRefreshSecValue = computed({
  get: () => sanitizeAutoRefreshSec(autoRefreshSec.value) ?? DEFAULT_AUTO_REFRESH_SEC,
  set: (value: number) => {
    autoRefreshSec.value = sanitizeAutoRefreshSec(value)
  },
})
</script>

<template>
  <div class="style-settings">
    <section class="style-settings__group">
      <h3 class="style-settings__title">
        自动刷新
      </h3>
      <div class="style-settings__row">
        <span class="style-settings__label">
          开启
        </span>
        <div class="style-settings__control">
          <el-switch v-model="autoRefreshOn" />
          <span class="style-settings__hint">
            仅预览页生效
          </span>
        </div>
      </div>
      <div
        v-if="autoRefreshOn"
        class="style-settings__row"
      >
        <span class="style-settings__label">
          频率
        </span>
        <el-select
          v-model="autoRefreshSecValue"
          class="style-settings__select"
        >
          <el-option
            v-for="item in AUTO_REFRESH_OPTIONS"
            :key="item.value"
            :label="item.label"
            :value="item.value"
          />
        </el-select>
      </div>
    </section>
  </div>
</template>

<style scoped lang="scss">
.style-settings {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 12px;
  min-height: 0;
  padding: 16px;
  overflow: auto;
}

.style-settings__group {
  min-width: 0;
  padding: 14px 16px 16px;
  border-radius: 8px;
  background: var(--el-fill-color-lighter);
}

.style-settings__title {
  margin: 0 0 12px;
  font-size: 13px;
  font-weight: 600;
  line-height: 1.3;
  color: var(--el-text-color-primary);
}

.style-settings__row {
  display: flex;
  align-items: center;
  gap: 16px;
  min-height: 32px;

  + .style-settings__row {
    margin-top: 12px;
  }
}

.style-settings__label {
  flex-shrink: 0;
  width: 48px;
  font-size: 13px;
  line-height: 1.3;
  color: var(--el-text-color-regular);
}

.style-settings__control {
  display: flex;
  align-items: center;
  min-width: 0;
}

.style-settings__hint {
  margin-left: 8px;
  font-size: 12px;
  color: var(--el-text-color-placeholder);
}

.style-settings__select {
  width: 160px;
}
</style>
