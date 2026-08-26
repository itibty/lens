<!--
 * @Author: Chuang
 * @Date: 2022-05-25 13:14:41
 * @LastEditTime: 2025-07-23 21:45:40
 * @LastEditors: Chuang
 * @Description: 全屏卡片
-->
<script lang="ts" setup>
import type { Ref } from 'vue'

export interface FullPanelInstance {
  isFull: Ref<boolean>
  toggle: () => Promise<boolean>
}

export interface FullPanelProps {
  title?: string // 卡片标题
  subTitle?: string // 卡片副标题
  teleportTo?: string // 全屏位置, HTMLElement id

  // 切换icon样式
  iconSize?: number
  iconColor?: string
}

const props = withDefaults(defineProps<FullPanelProps>(), {
  teleportTo: '#pc-content',
  iconSize: 20,
})
const emits = defineEmits<{
  (e: 'toggleFullWidth', full: boolean): void
}>()
const isFull = ref(false)
const delayedTeleport = ref(false)
const rootRef = ref<HTMLElement>()
const teleportTarget = ref<string | HTMLElement>()

function resolveTeleportTarget() {
  try {
    if (props.teleportTo === '#pc-content') {
      const local = rootRef.value?.closest('#pc-content, .page-content')
      if (local) {
        teleportTarget.value = local as HTMLElement
        return
      }
    }
    if (document.querySelector(props.teleportTo)) {
      teleportTarget.value = props.teleportTo
      return
    }
  }
  catch (error) {
    console.error('[FullPanel] Invalid teleport target:', props.teleportTo, error)
  }
  teleportTarget.value = rootRef.value
}

async function toggle() {
  const nextFull = !isFull.value
  if (nextFull)
    resolveTeleportTarget()
  isFull.value = nextFull
  await nextTick()
  emits('toggleFullWidth', isFull.value)
  return isFull.value
}
onMounted(() => {
  nextTick(() => {
    delayedTeleport.value = true
  })
})

defineExpose<FullPanelInstance>({
  isFull,
  toggle,
})
</script>

<template>
  <div ref="rootRef">
    <Teleport v-if="delayedTeleport && isFull && teleportTarget" :to="teleportTarget">
      <div class="abs card">
        <div class="header">
          <slot name="title">
            <div class="title b-line">
              {{ title }}
            </div>
            <div v-if="subTitle" class="sub-title">
              {{ subTitle }}
            </div>
          </slot>
          <span class="clickable full-icon hover-link ml-auto" @click="toggle">
            <el-icon :size="iconSize" :color="iconColor">
              <i-mingcute-fullscreen-exit-line v-if="isFull" />
              <i-mingcute-fullscreen-line v-else />
            </el-icon>
          </span>
        </div>
        <div class="body">
          <slot />
        </div>
      </div>
    </Teleport>
    <div v-else class="card relative">
      <div class="header">
        <slot name="title">
          <div class="title b-line">
            {{ title }}
          </div>
          <div v-if="subTitle" class="sub-title">
            {{ subTitle }}
          </div>
        </slot>
        <span class="hover-link full-icon clickable ml-auto" @click="toggle">
          <el-icon :size="iconSize" :color="iconColor">
            <i-mingcute-fullscreen-exit-line v-if="isFull" />
            <i-mingcute-fullscreen-line v-else />
          </el-icon>
        </span>
      </div>
      <div class="body dft">
        <slot />
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.abs {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 99;
}
$card-header-height: 40px;
.card {
  .header {
    height: $card-header-height;
  }
  .body {
    // flex：1 方案 因为高度传递问题，可能失效
    height: calc(100% - $card-header-height);
    overflow-y: auto;
  }
}
</style>

<style  lang="scss">
.card {
  box-sizing: border-box;
  border-radius: var(--card-radius, 4px);
  background-color: var(--card-bg, #fff);

  .header {
    padding: 8px $base-padding;
    border-bottom: 1px solid var(--card-header-border-color, #ebeef5);
    display: flex;
    align-items: center;
    justify-content: space-between;
    box-sizing: border-box;

    &:hover {
      .full-icon {
        opacity: 1;
      }
    }

    .title {
      position: relative;
      white-space: nowrap;
      color: var(--el-text-color-primary);
      font-size: 16px;
      line-height: 24px;
    }

    .b-line {
      &::after {
        content: '';
        position: absolute;
        left: 0;
        right: 0;
        bottom: 0;
        height: var(--b-line-height, 6px);
        background-color: var(--el-color-primary);
        border-radius: 4px;
        opacity: 0.2;
      }
    }

    .sub-title {
      margin-left: 10px;
      margin-right: auto;
      font-size: 14px;
      line-height: 1;
      white-space: nowrap;
      color: var(--el-text-color-secondary);
    }

    .full-icon {
      opacity: 0;
      transition: 0.2s;
    }
  }

  .body {
    box-sizing: border-box;
    padding: var(--card-body-padding, $base-padding);
    background-color: var(--card-body-bgc, #fff);

    &.dft {
      height: var(--card-body-height, 200px);
      overflow: auto;
    }
  }
}
</style>
