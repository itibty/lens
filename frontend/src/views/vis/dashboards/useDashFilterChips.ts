import type { ModelRef } from 'vue'
import type { DashFilterValue, DashFilterValues, VisDashFilterDef } from './dashApi'
import { onClickOutside } from '@vueuse/core'
import {
  dashFilterChipText,
  dashFilterOpText,
  filterValueReady,
  filterValueSig,
  isBlankFilterValue,
  resolveFilterOp,
  snapshotFilterValue,
} from './dashApi'

/** 点外关闭 / 页面滚动关闭时，这些浮层里的操作不算「页面」 */
export const DASH_POPPER_IGNORE = [
  '.dash-filter-chip-popper',
  '.dash-theme-popper',
  '.el-select__popper',
  '.el-picker__popper',
  '.el-select-dropdown',
  '.el-picker-panel',
  '.el-scrollbar__bar',
]

export function isDashPopperTarget(target: EventTarget | null) {
  return target instanceof Element && !!target.closest(DASH_POPPER_IGNORE.join(', '))
}

/** 筛选 tag：弹层改草稿，确认才写回并触发查询；点外面或再点同一 tag 只关不写。 */
export function useDashFilterChips(values: ModelRef<DashFilterValues>) {
  const openUid = ref('')
  const tagsRef = ref<HTMLElement | null>(null)
  const draft = ref<DashFilterValues>({})

  function workingOf(uid: string) {
    if (openUid.value === uid && uid in draft.value)
      return snapshotFilterValue(draft.value[uid])
    return snapshotFilterValue(values.value[uid])
  }

  function writeValue(uid: string, item: DashFilterValue) {
    if (isBlankFilterValue(item)) {
      if (!(uid in values.value))
        return
      const next = { ...values.value }
      delete next[uid]
      values.value = next
      return
    }
    if (filterValueSig(values.value[uid]) === filterValueSig(item))
      return
    values.value = { ...values.value, [uid]: item }
  }

  function discardChip() {
    openUid.value = ''
    draft.value = {}
  }

  function toggleChip(uid: string) {
    if (openUid.value === uid) {
      discardChip()
      return
    }
    openUid.value = uid
    draft.value = { [uid]: snapshotFilterValue(values.value[uid]) }
  }

  function confirmChip() {
    const uid = openUid.value
    if (uid && uid in draft.value)
      writeValue(uid, snapshotFilterValue(draft.value[uid]))
    discardChip()
  }

  function resetChip() {
    const uid = openUid.value
    if (!uid)
      return
    discardChip()
    writeValue(uid, { value: [] })
  }

  function clearFilter(uid: string) {
    if (openUid.value === uid)
      discardChip()
    writeValue(uid, { value: [] })
  }

  function patch(uid: string, next: DashFilterValue) {
    const merged = { ...workingOf(uid), ...next }
    if (openUid.value === uid) {
      draft.value = { ...draft.value, [uid]: merged }
      return
    }
    writeValue(uid, merged)
  }

  onClickOutside(tagsRef, () => {
    if (openUid.value)
      discardChip()
  }, { ignore: DASH_POPPER_IGNORE })

  return {
    openUid,
    tagsRef,
    workingOf,
    toggleChip,
    discardChip,
    confirmChip,
    resetChip,
    clearFilter,
    patch,
    isFilled: (def: VisDashFilterDef) => filterValueReady(def, values.value[def.uid]),
    opLabel: dashFilterOpText,
    chipLabel: (def: VisDashFilterDef) => def.label?.trim() || def.field,
    chipOp: (def: VisDashFilterDef) => {
      return filterValueReady(def, values.value[def.uid]) ? dashFilterOpText(def) : ''
    },
    displayText: (def: VisDashFilterDef, labels?: Record<string, string>) => {
      return dashFilterChipText(def, values.value[def.uid], labels)
    },
    popperWidth: (def: VisDashFilterDef) => {
      if (def.formType === 'dateExp' || def.formType === 'select' || def.formType === 'multiSelect')
        return 320
      if (def.formType === 'datetime' || def.formType === 'datetimeRange')
        return 280
      if (def.formType === 'numberRange' || resolveFilterOp(def) === 'between')
        return 280
      return 240
    },
  }
}
