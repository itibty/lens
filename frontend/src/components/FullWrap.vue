<!--
 * @Author: Chuang
 * @Date: 2022-05-25 13:14:41
 * @LastEditTime: 2025-07-23 19:46:39
 * @LastEditors: Chuang
 * @Description: 组件在某容器全屏
-->
<script lang="ts" setup>
import type { Ref } from 'vue'

export interface FullWrapInstance {
  isFull: Ref<boolean> | boolean
  toggle: () => Promise<boolean>
}

export interface FullWrapProps {
  teleportTo?: string // 全宽位置,  document element id
}

const props = withDefaults(defineProps<FullWrapProps>(), {
  teleportTo: '#pc-content',
})
const emits = defineEmits<{
  (e: 'toggleFull', full: boolean): void
}>()
const isFull = ref(false)
const delayedTeleport = ref(false)
const fullRef = ref<HTMLElement>()
const teleportTarget = ref<string | HTMLElement>()

function resolveTeleportTarget() {
  try {
    // KeepAlive 下可能存在多个 #pc-content：优先取当前组件所在的页面容器
    if (props.teleportTo === '#pc-content') {
      const local = fullRef.value?.closest('#pc-content, .page-content')
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
    console.error('[FullWrap] Invalid teleport target:', props.teleportTo, error)
  }

  console.error('[FullWrap] Teleport target not found, fallback to current container:', props.teleportTo)
  teleportTarget.value = fullRef.value
}

async function toggle() {
  const nextFull = !isFull.value
  if (nextFull) {
    resolveTeleportTarget()
  }
  isFull.value = nextFull
  await nextTick()
  emits('toggleFull', isFull.value)
  return isFull.value
}

onMounted(() => {
  nextTick(() => {
    delayedTeleport.value = true
  })
})

defineExpose<FullWrapInstance>({
  isFull,
  toggle,
})
</script>

<template>
  <div ref="fullRef" class="full">
    <Teleport v-if="delayedTeleport && isFull && teleportTarget" :to="teleportTarget">
      <div class="abs">
        <slot :info="{ isFull, toggle }" />
      </div>
    </Teleport>
    <template v-else>
      <slot :info="{ isFull, toggle }" />
    </template>
  </div>
</template>

<style scoped lang="scss">
.full {
  position: relative;
}

.abs {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 99;
}
</style>
