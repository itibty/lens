<script setup lang="ts">
import MenuIcon from '@/components/MenuIcon.vue'
import {
  findMenuIcon,
  isPresetMenuIcon,
  MENU_ICON_GROUPS,
  MENU_ICONS,
  normalizeMenuIconName,
} from '@/core/menuIcons'

const icon = defineModel<string>({ default: '' })

const popoverVisible = ref(false)
const keyword = ref('')

const displayName = computed(() => normalizeMenuIconName(icon.value))
const current = computed(() => findMenuIcon(icon.value))
const inPreset = computed(() => isPresetMenuIcon(icon.value))

const matched = computed(() => {
  const q = keyword.value.trim().toLowerCase()
  if (!q)
    return MENU_ICONS
  return MENU_ICONS.filter(item =>
    item.name.includes(q) || item.label.includes(q),
  )
})

const groups = computed(() =>
  MENU_ICON_GROUPS
    .map(group => ({
      ...group,
      items: matched.value.filter(item => item.group === group.id),
    }))
    .filter(group => group.items.length),
)

watch(popoverVisible, (open) => {
  if (!open)
    keyword.value = ''
})

function pick(name: string) {
  icon.value = name
  popoverVisible.value = false
}

function onInput(value: string) {
  icon.value = normalizeMenuIconName(value)
}
</script>

<template>
  <div class="menu-icon-picker">
    <el-popover
      v-model:visible="popoverVisible"
      trigger="click"
      placement="bottom-start"
      :width="360"
      :show-arrow="false"
      :z-index="4000"
      popper-class="menu-icon-picker-popper"
    >
      <template #reference>
        <button
          type="button"
          class="menu-icon-picker__preview"
          :title="inPreset ? `${current?.label} · ${displayName}` : '从预设中选择'"
        >
          <MenuIcon v-if="displayName" :icon="displayName" class-name="menu-icon-picker__glyph" />
          <span v-else class="menu-icon-picker__empty">选</span>
        </button>
      </template>
      <div class="menu-icon-picker__panel">
        <el-input
          v-model="keyword"
          clearable
          placeholder="输入后过滤"
        />
        <div class="menu-icon-picker__scroll">
          <div v-for="group in groups" :key="group.id" class="menu-icon-picker__group">
            <div class="menu-icon-picker__group-title">{{ group.label }}</div>
            <div class="menu-icon-picker__grid">
              <button
                v-for="item in group.items"
                :key="item.name"
                type="button"
                class="menu-icon-picker__tile"
                :class="{ active: displayName === item.name }"
                :title="`${item.label} · ${item.name}`"
                @click="pick(item.name)"
              >
                <MenuIcon :icon="item.name" class-name="menu-icon-picker__tile-icon" />
                <span class="menu-icon-picker__tile-name">{{ item.label }}</span>
              </button>
            </div>
          </div>
          <div v-if="!groups.length" class="menu-icon-picker__miss">无匹配图标</div>
        </div>
      </div>
    </el-popover>
    <el-input
      :model-value="displayName"
      clearable
      placeholder="如 chart-bar-line"
      @update:model-value="onInput"
    />
  </div>
</template>

<style lang="scss" scoped>
.menu-icon-picker {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;

  &__preview {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    flex-shrink: 0;
    border: 1px solid var(--el-border-color);
    border-radius: var(--el-border-radius-base);
    background: var(--el-fill-color-blank);
    color: var(--el-text-color-primary);
    cursor: pointer;
  }

  &__empty {
    font-size: 12px;
    color: var(--el-text-color-placeholder);
  }
}
</style>

<style lang="scss">
.menu-icon-picker-popper {
  padding: 10px !important;
}

.menu-icon-picker__panel {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.menu-icon-picker__scroll {
  max-height: 280px;
  overflow: auto;
}

.menu-icon-picker__group + .menu-icon-picker__group {
  margin-top: 10px;
}

.menu-icon-picker__group-title {
  margin-bottom: 6px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.menu-icon-picker__grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 6px;
}

.menu-icon-picker__tile {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  min-height: 58px;
  padding: 6px 4px;
  border: 1px solid transparent;
  border-radius: 6px;
  background: var(--el-fill-color-lighter);
  color: var(--el-text-color-primary);
  cursor: pointer;

  &:hover {
    background: var(--el-fill-color);
  }

  &.active {
    border-color: var(--el-color-primary);
    background: var(--el-color-primary-light-9);
    color: var(--el-color-primary);
  }
}

.menu-icon-picker__tile-icon {
  font-size: 18px;
}

.menu-icon-picker__tile-name {
  font-size: 11px;
  line-height: 1.2;
  text-align: center;
}

.menu-icon-picker__miss {
  padding: 16px 0;
  text-align: center;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.menu-icon-picker__glyph {
  font-size: 16px;
}
</style>
