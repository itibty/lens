import type { Ref } from 'vue'
import { useResizeObserver } from '@vueuse/core'

export interface VTableSize {
  width: number
  height: number
}

export interface VTableHost {
  release: () => void
  resize: (width?: number, height?: number) => VTableSize | null
  exportExcel?: (fileName: string) => Promise<void>
}

export function asVTableHost(
  table: {
    release: () => void
    resize: () => void
    setCanvasSize: (canvasWidth: number, canvasHeight: number) => void
    recordsCount?: number
  },
  extras?: Pick<VTableHost, 'exportExcel'>,
): VTableHost {
  return {
    resize: (width, height) => {
      const next = resolveVTableCanvasSize(width, height)
      if (next) {
        table.setCanvasSize(next.width, next.height)
        return next
      }
      table.resize()
      return null
    },
    release: () => table.release(),
    exportExcel: extras?.exportExcel,
  }
}

/**
 * 画布始终跟卡片可用高度走（含空表），高度一变才能内部滚。
 * 有数据时短表不收成行高（会把画布锁死）；边框靠 containerFit.height: false 只包内容。
 * 空表则 containerFit.height: true，外框跟着卡片走。
 */
function resolveVTableCanvasSize(
  width?: number,
  height?: number,
): VTableSize | null {
  if (width == null || height == null || width < 1 || height < 1)
    return null
  return { width, height }
}

function paddingBox(el: HTMLElement | null | undefined) {
  if (!el)
    return { width: 0, height: 0 }
  const style = getComputedStyle(el)
  return {
    width: el.clientWidth
      - (Number.parseFloat(style.paddingLeft) || 0)
      - (Number.parseFloat(style.paddingRight) || 0),
    height: el.clientHeight
      - (Number.parseFloat(style.paddingTop) || 0)
      - (Number.parseFloat(style.paddingBottom) || 0),
  }
}

function wrapSize(
  wrap: HTMLElement | null | undefined,
  host: HTMLElement | null | undefined,
) {
  const slot = paddingBox(host?.parentElement)
  const width = wrap?.clientWidth || host?.clientWidth || slot.width
  const height = slot.height || host?.clientHeight || wrap?.clientHeight || 0
  if (width < 1 || height < 1)
    return null
  return { width, height }
}

/** 容器尺寸变化时 resize；配置变化时重建 */
export function useVTableMount(
  containerRef: Ref<HTMLElement | null | undefined>,
  tableWrapRef: Ref<HTMLElement | null | undefined>,
  empty: Ref<boolean>,
  createTable: (el: HTMLElement, width: number, height: number) => VTableHost | null,
  deps: () => unknown,
) {
  let table: VTableHost | null = null
  let resizeRaf = 0
  const slotRef = computed(() => containerRef.value?.parentElement ?? null)

  function destroyTable() {
    if (!table)
      return
    const current = table
    table = null
    try {
      current.release()
    }
    catch {
      // FilterPlugin.release 非幂等；table.release 已会卸插件
    }
    tableWrapRef.value?.replaceChildren()
    applyHostSize(null, 0)
  }

  function syncTable() {
    if (empty.value) {
      destroyTable()
      return
    }
    const el = tableWrapRef.value
    const size = wrapSize(el, containerRef.value)
    if (!el || !size)
      return

    destroyTable()
    table = createTable(el, size.width, size.height)
    if (table)
      applyHostSize(table.resize(size.width, size.height), size.height)
  }

  onMounted(() => {
    nextTick(syncTable)
  })

  watch(deps, () => {
    nextTick(syncTable)
  }, { deep: true })

  function fitTableToWrap() {
    if (empty.value)
      return
    const size = wrapSize(tableWrapRef.value, containerRef.value)
    if (!size)
      return
    if (!table) {
      syncTable()
      return
    }
    applyHostSize(table.resize(size.width, size.height), size.height)
  }

  function applyHostSize(fitted: VTableSize | null, wrapHeight: number) {
    const host = containerRef.value
    const wrap = tableWrapRef.value
    const compact = !!fitted && fitted.height < wrapHeight
    const heightPx = compact && fitted ? `${fitted.height}px` : ''
    if (host) {
      host.style.height = heightPx
      host.style.flex = compact ? '0 0 auto' : ''
    }
    if (wrap)
      wrap.style.height = heightPx
  }

  function scheduleFit() {
    if (resizeRaf)
      cancelAnimationFrame(resizeRaf)
    resizeRaf = requestAnimationFrame(() => {
      resizeRaf = 0
      fitTableToWrap()
    })
  }

  useResizeObserver(tableWrapRef, scheduleFit)
  useResizeObserver(containerRef, scheduleFit)
  useResizeObserver(slotRef, scheduleFit)

  onUnmounted(() => {
    if (resizeRaf)
      cancelAnimationFrame(resizeRaf)
    destroyTable()
  })

  function getHost() {
    return table
  }

  return { syncTable, destroyTable, getHost }
}
