<!--
 * @Description: 普通表格（VTable ListTable）
-->
<script setup lang="ts">
import type { MousePointerCellEvent } from '@visactor/vtable'
import type { VisVisualConfig } from '@/views/vis/shared/types'
import { ListTable, TABLE_EVENT_TYPE } from '@visactor/vtable'
import { buildListTableOption, listTableColumns } from '@/views/vis/shared/listTable'
import { asVTableHost } from '@/views/vis/shared/useVTableMount'
import VisVTableHost from '@/views/vis/shared/VisVTableHost.vue'

const props = withDefaults(defineProps<{
  visual: VisVisualConfig
  query: VIS.QueryConfig
  data: VIS.QueryDataResponse
  emptyText?: string
  interactive?: boolean
}>(), {
  emptyText: '暂无数据',
  interactive: false,
})

const emit = defineEmits<{
  cellClick: [payload: { field?: string, record: Record<string, unknown>, clientX: number, clientY: number }]
}>()

const empty = computed(() => !listTableColumns(props.query, props.data, false).length)

function createTable(el: HTMLElement, width: number, height: number) {
  const option = buildListTableOption(props.query, props.data, props.visual)
  if (!option)
    return null
  const table = new ListTable(el, {
    ...option,
    canvasWidth: width,
    canvasHeight: height,
  })
  if (props.interactive) {
    table.on(TABLE_EVENT_TYPE.CLICK_CELL, (args: MousePointerCellEvent) => {
      if (args.cellLocation !== 'body')
        return
      const event = args.event as MouseEvent | undefined
      if (event?.clientX == null || event.clientY == null)
        return
      const record = args.originData
      if (!record || typeof record !== 'object')
        return
      emit('cellClick', {
        field: args.field == null ? undefined : String(args.field),
        record: record as Record<string, unknown>,
        clientX: event.clientX,
        clientY: event.clientY,
      })
    })
  }
  return asVTableHost(table)
}
</script>

<template>
  <VisVTableHost
    :empty="empty"
    :empty-text="emptyText"
    :create="createTable"
    :deps="() => [props.data, props.query, props.visual, props.interactive]"
  />
</template>
