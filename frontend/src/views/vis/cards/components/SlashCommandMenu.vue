<!--
 * @Description: 文本卡 slash 菜单（输入 / 插入块）
-->
<script setup lang="ts">
import type { SlashCommandItem } from './slashCommand'

const props = defineProps<{
  items: SlashCommandItem[]
  command: (item: SlashCommandItem) => void
}>()

const selected = ref(0)

const groups = computed(() => {
  const map = new Map<string, SlashCommandItem[]>()
  for (const item of props.items) {
    const list = map.get(item.group) ?? []
    list.push(item)
    map.set(item.group, list)
  }
  return [...map.entries()]
})

watch(() => props.items, () => {
  selected.value = 0
})

function move(step: number) {
  const total = props.items.length
  if (!total)
    return
  selected.value = (selected.value + step + total) % total
}

function pick(item: SlashCommandItem) {
  props.command(item)
}

function onKeyDown({ event }: { event: KeyboardEvent }) {
  if (event.key === 'ArrowUp') {
    move(-1)
    return true
  }
  if (event.key === 'ArrowDown') {
    move(1)
    return true
  }
  if (event.key === 'Enter') {
    const item = props.items[selected.value]
    if (item)
      pick(item)
    return true
  }
  return false
}

defineExpose({ onKeyDown })
</script>

<template>
  <div class="slash-cmd">
    <div
      class="slash-cmd__icons"
      aria-hidden="true"
    >
      <span class="i-mingcute-paragraph-line" />
      <span class="i-tabler-h-1" />
      <span class="i-tabler-h-2" />
      <span class="i-tabler-h-3" />
      <span class="i-tabler-h-4" />
      <span class="i-tabler-h-5" />
      <span class="i-tabler-list" />
      <span class="i-tabler-list-numbers" />
      <span class="i-mingcute-quote-left-line" />
      <span class="i-tabler-separator-horizontal" />
    </div>
    <template
      v-for="[group, groupItems] in groups"
      :key="group"
    >
      <div class="slash-cmd__label">
        {{ group }}
      </div>
      <button
        v-for="item in groupItems"
        :key="item.title"
        type="button"
        class="slash-cmd__item"
        :class="{ 'is-on': items.indexOf(item) === selected }"
        @mousedown.prevent
        @click="pick(item)"
      >
        <span class="slash-cmd__icon">
          <span :class="item.icon" />
        </span>
        <span class="slash-cmd__title">{{ item.title }}</span>
      </button>
    </template>
    <div
      v-if="!items.length"
      class="slash-cmd__empty"
    >
      无匹配
    </div>
  </div>
</template>

<style scoped lang="scss">
.slash-cmd {
  position: relative;
  z-index: 3200;
  min-width: 208px;
  max-height: min(360px, 50vh);
  padding: 4px;
  overflow: auto;
  border: 1px solid var(--el-border-color-extra-light);
  border-radius: 10px;
  background: var(--el-bg-color);
  box-shadow: 0 10px 28px rgb(15 23 42 / 12%);
}

.slash-cmd__icons {
  display: none;
}

.slash-cmd__label,
.slash-cmd__empty {
  padding: 6px 8px 2px;
  font-size: 11px;
  color: var(--el-text-color-secondary);
}

.slash-cmd__label:first-of-type {
  padding-top: 2px;
}

.slash-cmd__item {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 8px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--el-text-color-primary);
  cursor: pointer;
  text-align: left;

  &:hover,
  &.is-on {
    background: var(--el-fill-color);
  }
}

.slash-cmd__icon {
  flex-shrink: 0;
  width: 24px;
  height: 24px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--el-border-color-extra-light);
  border-radius: 6px;
  background: var(--el-fill-color-lighter);
  font-size: 14px;
  color: var(--el-text-color-regular);
}

.slash-cmd__title {
  min-width: 0;
  font-size: 13px;
  line-height: 1.3;
}
</style>
