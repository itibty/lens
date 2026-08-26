<!--
 * @Description: vis 容器全屏（对齐 FullWrap：Teleport 到指定容器，非浏览器原生全屏）
-->
<script setup lang="ts">
import type { Ref } from 'vue'
import { useEventListener } from '@vueuse/core'
import { DASH_VIEWER_ID } from '@/views/vis/dashboards/config'

export interface VisFullWrapInstance {
  isFull: Ref<boolean>
  toggle: () => Promise<boolean>
}

const props = withDefaults(defineProps<{
  /** 全屏挂载点；预览页默认 #vis-dash-viewer */
  teleportTo?: string
  enabled?: boolean
}>(), {
  teleportTo: `#${DASH_VIEWER_ID}`,
  enabled: true,
})

const emit = defineEmits<{
  toggleFull: [full: boolean]
}>()

const isFull = ref(false)
const ready = ref(false)
const rootRef = ref<HTMLElement>()
const target = ref<string | HTMLElement>()

function resolveTarget() {
  const sel = props.teleportTo
  try {
    const local = rootRef.value?.closest(`#${DASH_VIEWER_ID}, .viewer`)
    if (sel === `#${DASH_VIEWER_ID}` && local) {
      target.value = local as HTMLElement
      return
    }
    if (sel && document.querySelector(sel)) {
      target.value = sel
      return
    }
    if (local) {
      target.value = local as HTMLElement
      return
    }
  }
  catch {
    // keep fallback
  }
  target.value = rootRef.value
}

async function toggle() {
  if (!props.enabled)
    return false
  const next = !isFull.value
  if (next)
    resolveTarget()
  isFull.value = next
  await nextTick()
  emit('toggleFull', isFull.value)
  return isFull.value
}

useEventListener(window, 'keydown', (event: KeyboardEvent) => {
  if (event.key === 'Escape' && isFull.value)
    void toggle()
})

watch(
  () => props.enabled,
  (ok) => {
    if (!ok && isFull.value)
      isFull.value = false
  },
)

onMounted(() => {
  void nextTick().then(() => {
    ready.value = true
  })
})

defineExpose<VisFullWrapInstance>({
  isFull,
  toggle,
})
</script>

<template>
  <div ref="rootRef" class="vis-full-wrap">
    <Teleport v-if="ready && enabled && isFull && target" :to="target">
      <div class="vis-full-wrap__layer">
        <div class="vis-full-wrap__stage">
          <slot :is-full="isFull" :toggle="toggle" />
        </div>
      </div>
    </Teleport>
    <template v-else>
      <slot :is-full="isFull" :toggle="toggle" />
    </template>
  </div>
</template>

<style scoped lang="scss">
.vis-full-wrap {
  width: 100%;
  height: 100%;
  min-height: 0;
}

.vis-full-wrap__layer {
  position: absolute;
  inset: 0;
  z-index: 99;
  display: flex;
  padding: var(--dash-page-y, 16px) var(--dash-page-x, 24px);
  box-sizing: border-box;
  background: var(--dash-canvas-bg, var(--el-fill-color-lighter));
}

.vis-full-wrap__stage {
  flex: 1;
  min-width: 0;
  min-height: 0;
  display: flex;

  :deep(.dash-tile) {
    flex: 1;
  }
}
</style>
