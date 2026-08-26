<!--
 * @Description: VTable 共用挂载壳（画布 + 空态 + 尺寸跟随）
-->
<script setup lang="ts">
import type { VTableHost } from '@/views/vis/shared/useVTableMount'
import { useVTableMount } from '@/views/vis/shared/useVTableMount'

const props = defineProps<{
  empty: boolean
  emptyText: string
  create: (el: HTMLElement, width: number, height: number) => VTableHost | null
  deps: () => unknown
}>()

const containerRef = ref<HTMLDivElement>()
const tableWrapRef = ref<HTMLDivElement>()

const { getHost } = useVTableMount(
  containerRef,
  tableWrapRef,
  toRef(props, 'empty'),
  (el, width, height) => props.create(el, width, height),
  () => props.deps(),
)

defineExpose({
  exportExcel(fileName: string) {
    const run = getHost()?.exportExcel
    if (!run)
      return Promise.reject(new Error('表格未就绪'))
    return run(fileName)
  },
})
</script>

<template>
  <div ref="containerRef" class="vis-vtable">
    <div
      v-show="!empty"
      ref="tableWrapRef"
      class="vis-vtable__canvas"
    />
    <div
      v-if="empty"
      class="vis-vtable__empty"
    >
      {{ emptyText }}
    </div>
  </div>
</template>

<style scoped lang="scss">
.vis-vtable {
  display: flex;
  flex-direction: column;
  flex: 1 1 0;
  width: 100%;
  height: 0;
  min-width: 0;
  min-height: 0;
  overflow: hidden;

  &__canvas {
    position: relative;
    flex: 1 1 0;
    min-width: 0;
    min-height: 0;
    width: 100%;
    height: 0;
    overflow: hidden;
  }

  &__empty {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 13px;
    color: var(--vis-content-color, var(--el-text-color-secondary));
  }
}
</style>
