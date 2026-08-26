<!--
 * @Author: Chuang
 * @Date: 2025-04-17 21:30:22
 * @LastEditTime: 2025-07-23 21:42:32
 * @LastEditors: Chuang
 * @Description: 侧栏切换面板
-->
<script setup  lang="ts">
import { useVModel } from '@vueuse/core'

export interface SideItemOption {
  label: string
  value: string
  icon: string
  width: string
}
export interface SidePanelProps {
  modelValue: string
  itemOptions: SideItemOption[]
  layoutDirection?: 'L' | 'R' // L-按钮在左，R-按钮在右
  headerHeight?: string
}

const props = withDefaults(defineProps<SidePanelProps>(), {
  headerHeight: '32px',
  layoutDirection: 'L',
})
const emits = defineEmits<{
  (e: 'update:modelValue', value: string): void
}>()
const localValue = useVModel(props, 'modelValue', emits)
const inactiveOption: SideItemOption = {
  label: '',
  icon: '',
  width: '0px',
  value: '',
}

const activeOption = computed<SideItemOption>(() => {
  return localValue.value
    ? props.itemOptions.find(x => x.value === localValue.value) || inactiveOption
    : inactiveOption
})

function updateLocalValue(val: string) {
  localValue.value = localValue.value === val ? '' : val
}
</script>

<template>
  <div class="component-wrap" :class="{ 'layout-R': layoutDirection === 'R' }">
    <div class="items-wrap">
      <div
        v-for="item in itemOptions" :key="item.value" class="clickable item"
        :class="{ active: item.value === localValue }"
        :title="item.label"
        @click="updateLocalValue(item.value)"
      >
        <span :class="item.icon" class="inline-block" />
      </div>
    </div>
    <div :style="{ width: activeOption.width, overflow: 'hidden' }" class="base-transition panel-wrap">
      <div v-if="headerHeight" class="panel-header" :style="{ height: headerHeight }">
        {{ activeOption.label }}
        <div class="minus-btn" @click="updateLocalValue('')">
          <i-mingcute-minimize-line />
        </div>
      </div>
      <div :style="headerHeight ? `height: calc(100% - ${headerHeight});` : 'height:100%'">
        <slot :info="{ localValue }" />
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
$borderColor: var(--el-border-color-lighter);
$itemBg: var(--sp-item-bg, #f5f7fa);

.component-wrap {
  display: flex;
  height: 100%;
  border-right: 1px solid $borderColor;
  box-sizing: border-box;

  &.layout-R {
    flex-direction: row-reverse;

    .items-wrap {
      border-right: none;
      border-left: 1px solid $borderColor;
    }
  }
}

.items-wrap {
  width: var(--sp-items-width, 40px);
  height: 100%;
  overflow-y: auto;
  flex-shrink: 0;
  background-color: $itemBg;
  box-sizing: border-box;
  border-right: 1px solid $borderColor;
}

.item {
  height: var(--sp-item-height, 40px);
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: var(--sp-item-font-size, 20px);
  color: var(--sp-item-color, #606266);

  &:hover {
    color: var(--sp-item-hover-color, #303133);
    background-color: var(--sp-item-hover-bg, #ebedf0);
  }

  &.active {
    color: var(--sp-item-active-color, #fff);
    background-color: var(--el-color-primary);
  }
}

.panel-wrap {
  .panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 5px 0 10px;
    background-color: $itemBg;
    border-bottom: 1px solid $borderColor;
    box-sizing: border-box;
    color: #303133;
  }
}

.minus-btn {
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  box-sizing: border-box;
  transition: 0.1s;
  border: 1px solid transparent;
  border-radius: 4px;
  color: #797a7b;

  &:hover {
    background-color: #dddee1;
  }
}
</style>
