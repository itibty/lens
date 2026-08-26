<!--
 * @Description: 看板配置 · 通用。只改草稿。
-->
<script setup lang="ts">
import type { DashCardRadiusId, DashThemeId } from '../dashTheme'
import {
  AUTO_REFRESH_OPTIONS,
  DEFAULT_AUTO_REFRESH_SEC,
  sanitizeAutoRefreshSec,
} from '@/views/vis/shared/cardRefresh'
import { DASH_CARD_RADIUS_PRESETS, DASH_THEME_PRESETS, dashThemeSwatchRadius } from '../dashTheme'

const theme = defineModel<DashThemeId>('theme', { required: true })
const cardRadius = defineModel<DashCardRadiusId>('cardRadius', { required: true })
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
    <section class="style-settings__group">
      <h3 class="style-settings__title">
        看板主题
      </h3>
      <div class="style-settings__grid">
        <button
          v-for="item in DASH_THEME_PRESETS"
          :key="item.id"
          type="button"
          class="style-settings__item"
          :class="{ 'is-active': theme === item.id }"
          :title="item.name"
          @click="theme = item.id"
        >
          <span
            class="style-settings__swatch"
            :style="{ background: item.tokens.canvas }"
          >
            <span
              class="style-settings__card"
              :style="{
                background: item.tokens.card,
                borderRadius: `${dashThemeSwatchRadius(item.tokens.radius)}px`,
              }"
            >
              <i
                class="style-settings__accent"
                :style="{ background: item.tokens.accent }"
              />
            </span>
          </span>
          <span class="style-settings__name">
            {{ item.name }}
          </span>
        </button>
      </div>
    </section>
    <section class="style-settings__group">
      <h3 class="style-settings__title">
        卡片圆角
      </h3>
      <div class="style-settings__grid">
        <button
          v-for="item in DASH_CARD_RADIUS_PRESETS"
          :key="item.id"
          type="button"
          class="style-settings__item"
          :class="{ 'is-active': cardRadius === item.id }"
          :title="item.name"
          @click="cardRadius = item.id"
        >
          <span class="style-settings__swatch is-radius">
            <span
              class="style-settings__tile"
              :style="{ borderRadius: `${item.value}px` }"
            />
          </span>
          <span class="style-settings__name">
            {{ item.name }}
          </span>
        </button>
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

.style-settings__grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 10px;
}

.style-settings__item {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
  padding: 0;
  border: none;
  background: transparent;
  cursor: pointer;
  text-align: center;
}

.style-settings__swatch {
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  box-sizing: border-box;
  height: 72px;
  padding: 10px 8px 0;
  overflow: hidden;
  border: 2px solid transparent;
  border-radius: 10px;
  transition: border-color 0.15s ease;

  &.is-radius {
    align-items: center;
    justify-content: center;
    padding: 0;
    background: var(--el-fill-color);
  }

  .style-settings__item:hover & {
    border-color: var(--el-border-color);
  }

  .style-settings__item.is-active & {
    border-color: var(--el-color-primary);
  }
}

.style-settings__card {
  display: block;
  height: 38px;
  overflow: hidden;
  border: 1px solid rgb(15 23 42 / 8%);
  box-shadow: 0 1px 2px rgb(15 23 42 / 4%);
}

.style-settings__accent {
  display: block;
  width: 18px;
  height: 3px;
  margin: 8px 0 0 8px;
  border-radius: 99px;
}

.style-settings__tile {
  box-sizing: border-box;
  width: 44px;
  height: 32px;
  border: 1px solid rgb(15 23 42 / 10%);
  background: var(--el-bg-color);
  box-shadow: 0 1px 2px rgb(15 23 42 / 4%);
}

.style-settings__name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 12px;
  line-height: 1.3;
  color: var(--el-text-color-regular);

  .style-settings__item.is-active & {
    color: var(--el-color-primary);
    font-weight: 600;
  }
}
</style>
