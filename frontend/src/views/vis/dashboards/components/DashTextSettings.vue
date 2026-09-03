<!--
 * @Description: 标注卡片的轻量外观设置；由卡片工具栏 Popover 承载。
-->
<script setup lang="ts">
import type {
  DashTextAppearance,
  DashTextPadding,
  DashTextVerticalAlign,
} from '../dashLayout'

const props = defineProps<{
  appearance: DashTextAppearance
}>()

const emit = defineEmits<{
  'update:appearance': [appearance: DashTextAppearance]
}>()

function patchAppearance(patch: Partial<DashTextAppearance>) {
  emit('update:appearance', {
    ...props.appearance,
    surface: 'card',
    ...patch,
  })
}

function updateBackground(value: string | null) {
  patchAppearance({ bg: value || undefined })
}

function updateColor(value: string | null) {
  patchAppearance({ color: value || undefined })
}
</script>

<template>
  <div class="dash-text-settings" @click.stop>
    <div class="dash-text-settings__row">
      <span class="dash-text-settings__label">卡片颜色</span>
      <div class="dash-text-settings__control">
        <el-color-picker
          :model-value="appearance.bg"
          size="small"
          @update:model-value="updateBackground"
        />
        <el-button
          v-if="appearance.bg"
          link
          size="small"
          @click="updateBackground(null)"
        >
          恢复默认
        </el-button>
        <span v-else class="dash-text-settings__hint">跟随看板</span>
      </div>
    </div>

    <div class="dash-text-settings__row">
      <span class="dash-text-settings__label">文字颜色</span>
      <div class="dash-text-settings__control">
        <el-color-picker
          :model-value="appearance.color"
          size="small"
          @update:model-value="updateColor"
        />
        <el-button
          v-if="appearance.color"
          link
          size="small"
          @click="updateColor(null)"
        >
          恢复默认
        </el-button>
        <span v-else class="dash-text-settings__hint">跟随看板</span>
      </div>
    </div>

    <div class="dash-text-settings__field">
      <span class="dash-text-settings__label">内边距</span>
      <el-segmented
        :model-value="appearance.padding"
        :options="[
          { label: '紧凑', value: 'sm' },
          { label: '适中', value: 'md' },
          { label: '宽松', value: 'lg' },
        ]"
        size="small"
        @update:model-value="patchAppearance({ padding: $event as DashTextPadding })"
      />
    </div>

    <div class="dash-text-settings__field">
      <span class="dash-text-settings__label">垂直对齐</span>
      <el-segmented
        :model-value="appearance.verticalAlign"
        :options="[
          { label: '顶部', value: 'start' },
          { label: '居中', value: 'center' },
          { label: '底部', value: 'end' },
        ]"
        size="small"
        @update:model-value="patchAppearance({ verticalAlign: $event as DashTextVerticalAlign })"
      />
    </div>
  </div>
</template>

<style scoped lang="scss">
.dash-text-settings {
  display: grid;
  gap: 14px;
  width: 248px;
  padding: 2px;
}

.dash-text-settings__row,
.dash-text-settings__field {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.dash-text-settings__field {
  align-items: stretch;
  flex-direction: column;
  gap: 7px;
}

.dash-text-settings__label {
  flex: none;
  color: var(--el-text-color-regular);
  font-size: 12px;
  line-height: 24px;
}

.dash-text-settings__control {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  min-width: 0;
  gap: 7px;
}

.dash-text-settings__hint {
  color: var(--el-text-color-placeholder);
  font-size: 12px;
}

.dash-text-settings :deep(.el-segmented) {
  width: 100%;
}

.dash-text-settings :deep(.el-segmented__item) {
  flex: 1;
  min-width: 0;
}
</style>
