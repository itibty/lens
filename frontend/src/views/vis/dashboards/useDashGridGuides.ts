import type { Layout } from 'grid-layout-plus'
import type { InjectionKey, Ref } from 'vue'
import { useEventListener } from '@vueuse/core'

interface GuideContext {
  enabled: Readonly<Ref<boolean>>
  activeScope: Ref<symbol | null>
}

const GRID_GUIDES_KEY: InjectionKey<GuideContext> = Symbol('dash-grid-guides')

export function provideDashGridGuides(enabled: Readonly<Ref<boolean>>) {
  provide(GRID_GUIDES_KEY, { enabled, activeScope: ref(null) })
}

/** 根栅格和组内栅格只负责接入事件；辅助层不写入布局或看板配置。 */
export function useDashGridGuides(options: {
  layout: Ref<Layout>
  resizingId: Ref<string>
  editable: () => boolean
  staticPresentation: () => boolean
}) {
  const context = inject(GRID_GUIDES_KEY, null)
  const scope = Symbol('grid-scope')
  const pointerHeld = ref(false)
  const drag = ref<{ id: string, x: number, y: number } | null>(null)
  const enabled = computed(() => !!context?.enabled.value && options.editable() && !options.staticPresentation())
  const visible = computed(() => enabled.value && (!context?.activeScope.value || context.activeScope.value === scope))
  const activeItem = computed(() => {
    const id = options.resizingId.value || drag.value?.id
    const item = options.layout.value.find(item => String(item.i) === id)
    if (!item)
      return undefined
    return drag.value && !options.resizingId.value
      ? { ...item, x: drag.value.x, y: drag.value.y }
      : item
  })

  function releaseScope() {
    if (context?.activeScope.value === scope)
      context.activeScope.value = null
  }

  function onMoveEnd() {
    pointerHeld.value = false
    drag.value = null
    if (!options.resizingId.value)
      releaseScope()
  }

  function onPointerDown(event: PointerEvent) {
    if (!enabled.value || event.button !== 0 || !(event.target instanceof Element))
      return
    const handle = event.target.closest('.dash-tile__handle, .dash-group__handle')
    // 嵌套事件也会经过外层，只有当前栅格拥有的手柄能激活这一层。
    if (!handle || handle.closest('.dash-grid, .dash-inner') !== event.currentTarget)
      return
    const id = handle.closest<HTMLElement>('[data-dash-guide-id]')?.dataset.dashGuideId
    const item = options.layout.value.find(item => String(item.i) === id)
    if (!item)
      return
    pointerHeld.value = true
    drag.value = { id: String(item.i), x: item.x, y: item.y }
    context!.activeScope.value = scope
  }

  function onMove(id: string | number, x: number, y: number) {
    if (!enabled.value || !pointerHeld.value)
      return
    drag.value = { id: String(id), x, y }
  }

  watch([options.resizingId, enabled], ([id, on]) => {
    if (!on) {
      onMoveEnd()
      releaseScope()
    }
    else if (id) {
      context!.activeScope.value = scope
    }
    else if (!drag.value) {
      releaseScope()
    }
  }, { flush: 'sync' })

  if (context) {
    // moved 只在位置变化时触发；原地松手、取消拖动也要收起辅助提示。
    useEventListener(window, ['pointerup', 'pointercancel', 'blur'], onMoveEnd)
    onBeforeUnmount(releaseScope)
  }

  return { visible, activeItem, onPointerDown, onMove, onMoveEnd }
}
