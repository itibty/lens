import type { Layout } from 'grid-layout-plus'
import type { Ref } from 'vue'
import type { DashLayoutRect } from './dashLayout'
import { DASH_COL_NUM, DASH_MARGIN, DASH_ROW_HEIGHT } from './config'
import { sameRect } from './dashLayout'

export type ResizeCorner = 'nw' | 'ne' | 'sw' | 'se'

interface ResizeSession {
  id: string
  corner: ResizeCorner
  startX: number
  startY: number
  startW: number
  startH: number
  pointerX: number
  pointerY: number
  unitW: number
  unitH: number
  pointerId: number
  handle: HTMLElement
  minW: number
  minH: number
}

export function layoutMatches(a: Layout, b: Layout) {
  if (a.length !== b.length)
    return false
  const byId = new Map(b.map(item => [String(item.i), item]))
  return a.every((item) => {
    const other = byId.get(String(item.i))
    return !!other && sameRect(item, other) && item.static === other.static
  })
}

export function stackLayout(
  items: Array<{ i: string } & DashLayoutRect & { minW: number, minH: number }>,
  colNum = DASH_COL_NUM,
): Layout {
  let y = 0
  return [...items]
    .sort((a, b) => a.y - b.y || a.x - b.x)
    .map((item) => {
      const row = {
        i: item.i,
        x: 0,
        y,
        w: colNum,
        h: item.h,
        minW: item.minW,
        minH: item.minH,
        static: true,
      }
      y += item.h
      return row
    })
}

export function useDashGridInteract(options: {
  layout: Ref<Layout>
  editable: () => boolean
  stacked: () => boolean
  minSizeOf: (id: string) => { minW: number, minH: number }
  applyRect: (id: string, rect: DashLayoutRect) => void
  commit: () => void
}) {
  const resizingId = ref('')
  let session: ResizeSession | null = null

  function clamp(n: number, min: number, max: number) {
    return Math.min(max, Math.max(min, n))
  }

  function patchLayout(id: string, rect: DashLayoutRect) {
    let changed = false
    const next = options.layout.value.map((item) => {
      if (String(item.i) !== id || sameRect(item, rect))
        return item
      changed = true
      return { ...item, ...rect }
    })
    if (changed)
      options.layout.value = next
    options.applyRect(id, rect)
  }

  function bindResizeListeners(handle: HTMLElement) {
    handle.addEventListener('pointermove', onResizeMove)
    handle.addEventListener('pointerup', onResizeEnd)
    handle.addEventListener('pointercancel', onResizeEnd)
    handle.addEventListener('lostpointercapture', onResizeEnd)
  }

  function unbindResizeListeners(handle?: HTMLElement | null) {
    handle?.removeEventListener('pointermove', onResizeMove)
    handle?.removeEventListener('pointerup', onResizeEnd)
    handle?.removeEventListener('pointercancel', onResizeEnd)
    handle?.removeEventListener('lostpointercapture', onResizeEnd)
    window.removeEventListener('pointermove', onResizeMove)
    window.removeEventListener('pointerup', onResizeEnd)
    window.removeEventListener('pointercancel', onResizeEnd)
  }

  function onResizeStart(id: string, corner: ResizeCorner, event: PointerEvent) {
    if (!options.editable())
      return
    const item = options.layout.value.find(entry => String(entry.i) === id)
    const handle = event.currentTarget as HTMLElement | null
    const el = handle?.closest('.vgl-item') as HTMLElement | null
    if (!item || !handle || !el)
      return
    const rect = el.getBoundingClientRect()
    const [mx, my] = DASH_MARGIN
    const unitW = item.w > 0 ? (rect.width + mx) / item.w : 1
    const unitH = item.h > 0 ? (rect.height + my) / item.h : DASH_ROW_HEIGHT + my
    const min = options.minSizeOf(id)
    session = {
      id,
      corner,
      startX: item.x,
      startY: item.y,
      startW: item.w,
      startH: item.h,
      pointerX: event.clientX,
      pointerY: event.clientY,
      unitW: Number.isFinite(unitW) && unitW > 0 ? unitW : 1,
      unitH: Number.isFinite(unitH) && unitH > 0 ? unitH : DASH_ROW_HEIGHT + my,
      pointerId: event.pointerId,
      handle,
      minW: min.minW,
      minH: min.minH,
    }
    resizingId.value = id
    window.getSelection()?.removeAllRanges()
    bindResizeListeners(handle)
    try {
      handle.setPointerCapture(event.pointerId)
    }
    catch {
      window.addEventListener('pointermove', onResizeMove)
      window.addEventListener('pointerup', onResizeEnd)
      window.addEventListener('pointercancel', onResizeEnd)
    }
  }

  function onResizeMove(event: PointerEvent) {
    if (!session)
      return
    event.preventDefault()
    const dx = Math.round((event.clientX - session.pointerX) / session.unitW)
    const dy = Math.round((event.clientY - session.pointerY) / session.unitH)
    const fromEast = session.corner === 'ne' || session.corner === 'se'
    const fromSouth = session.corner === 'sw' || session.corner === 'se'
    const w = fromEast
      ? clamp(session.startW + dx, session.minW, DASH_COL_NUM - session.startX)
      : clamp(session.startW - dx, session.minW, session.startX + session.startW)
    const h = fromSouth
      ? clamp(session.startH + dy, session.minH, Number.POSITIVE_INFINITY)
      : clamp(session.startH - dy, session.minH, session.startY + session.startH)
    patchLayout(session.id, {
      x: fromEast ? session.startX : session.startX + session.startW - w,
      y: fromSouth ? session.startY : session.startY + session.startH - h,
      w,
      h,
    })
  }

  function onResizeEnd() {
    const current = session
    unbindResizeListeners(current?.handle)
    if (!current)
      return
    session = null
    resizingId.value = ''
    try {
      if (current.handle.hasPointerCapture(current.pointerId))
        current.handle.releasePointerCapture(current.pointerId)
    }
    catch {
      // already released
    }
    window.getSelection()?.removeAllRanges()
    void nextTick().then(() => {
      options.commit()
    })
  }

  function cleanup() {
    unbindResizeListeners(session?.handle)
    session = null
    resizingId.value = ''
  }

  function busy() {
    return !!session
  }

  return {
    resizingId,
    onResizeStart,
    cleanup,
    busy,
  }
}
