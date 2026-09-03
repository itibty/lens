<!--
 * @Description: 透视表（VTable PivotTable；数据来自 /pivot）
-->
<script setup lang="ts">
import type { MousePointerCellEvent } from '@visactor/vtable'
import type { PivotPathMember } from '@/views/vis/shared/cardDetail'
import type { PivotHeaderSortState } from '@/views/vis/shared/pivotTable'
import type { VisQueryConfig, VisVisualConfig } from '@/views/vis/shared/types'
import { PIVOT_TABLE_EVENT_TYPE, PivotTable, TABLE_EVENT_TYPE } from '@visactor/vtable'
import { TableExportPlugin } from '@visactor/vtable-plugins'
import { animateMetricProgressBars } from '@/views/vis/shared/metricCell'
import { buildPivotTableOption, nextPivotSortOrder, PIVOT_SUBTOTAL_TOKEN, PIVOT_TOTAL_TOKEN, resolveIndicatorSortKey, resolvePivotSchema } from '@/views/vis/shared/pivotTable'
import { resolveTableStyle } from '@/views/vis/shared/tableStyle'
import { asVTableHost } from '@/views/vis/shared/useVTableMount'
import VisVTableHost from '@/views/vis/shared/VisVTableHost.vue'

const props = withDefaults(defineProps<{
  data: VIS.PivotQueryResponse
  query?: VisQueryConfig
  visual?: VisVisualConfig
  emptyText?: string
  interactive?: boolean
  dark?: boolean
}>(), {
  emptyText: '暂无数据',
  interactive: false,
  dark: false,
})

const emit = defineEmits<{
  cellClick: [payload: {
    location: 'body' | 'rowHeader' | 'columnHeader'
    rowPaths: PivotPathMember[]
    colPaths: PivotPathMember[]
    clientX: number
    clientY: number
  }]
}>()

const empty = computed(() => !resolvePivotSchema(props.data, props.query).metrics.length)
const hostRef = ref<{ exportExcel: (fileName: string) => Promise<void> }>()
const sortState = ref<PivotHeaderSortState | null>(null)

watch(() => props.data, () => {
  sortState.value = null
})

watch(() => resolveTableStyle(props.visual).sortColumn, (on) => {
  if (!on)
    sortState.value = null
})

function isSortIconClick(args: MousePointerCellEvent) {
  return args.targetIcon?.funcType === 'sort'
}

function createTable(el: HTMLElement, width: number, height: number) {
  const option = buildPivotTableOption(props.data, props.visual, props.query, sortState.value, props.dark)
  if (!option)
    return null
  const excelOptions = {
    downloadFile: true,
    fileName: 'export',
    ignoreIcon: true,
    exportAllData: true,
    formatExportOutput: (cellInfo: { cellType?: string, cellValue?: unknown }) => {
      if (cellInfo.cellValue === PIVOT_SUBTOTAL_TOKEN)
        return '小计'
      if (cellInfo.cellValue === PIVOT_TOTAL_TOKEN)
        return '总计'
      // 进度单元格默认会作为图片导出；返回上层格式化文字，保持 Excel 可检索。
      if (cellInfo.cellType === 'progressbar')
        return cellInfo.cellValue == null ? '' : String(cellInfo.cellValue)
      return undefined
    },
  }
  const table = new PivotTable(el, {
    ...option,
    plugins: [new TableExportPlugin({ exportExcelOptions: excelOptions })],
    canvasWidth: width,
    canvasHeight: height,
  })
  animateMetricProgressBars(table)
  table.on(PIVOT_TABLE_EVENT_TYPE.PIVOT_SORT_CLICK, (args: {
    order?: string
    dimensionInfo?: PivotHeaderSortState['paths']
  }) => {
    const paths = args.dimensionInfo ?? []
    const metrics = resolvePivotSchema(props.data, props.query).metrics
    if (!resolveIndicatorSortKey(paths, metrics))
      return
    const next = nextPivotSortOrder(args.order)
    sortState.value = next
      ? { order: next, paths }
      : null
  })
  if (props.interactive) {
    table.on(TABLE_EVENT_TYPE.CLICK_CELL, (args: MousePointerCellEvent) => {
      if (isSortIconClick(args))
        return
      const location = args.cellLocation
      if (location !== 'body' && location !== 'rowHeader' && location !== 'columnHeader')
        return
      const event = args.event as MouseEvent | undefined
      if (event?.clientX == null || event.clientY == null)
        return
      const paths = args.cellHeaderPaths as { rowHeaderPaths?: PivotPathMember[], colHeaderPaths?: PivotPathMember[] } | undefined
      emit('cellClick', {
        location,
        rowPaths: paths?.rowHeaderPaths ?? [],
        colPaths: paths?.colHeaderPaths ?? [],
        clientX: event.clientX,
        clientY: event.clientY,
      })
    })
  }
  return asVTableHost(table, {
    exportExcel: async (fileName: string) => {
      excelOptions.fileName = fileName
      const run = (table as { exportToExcel?: () => Promise<unknown> }).exportToExcel
      if (!run)
        throw new Error('表格未就绪')
      await run()
    },
  })
}

defineExpose({
  exportExcel(fileName: string) {
    return hostRef.value?.exportExcel(fileName) ?? Promise.reject(new Error('表格未就绪'))
  },
})
</script>

<template>
  <VisVTableHost
    ref="hostRef"
    :empty="empty"
    :empty-text="emptyText"
    :create="createTable"
    :deps="() => [props.data, props.query, props.visual, props.interactive, props.dark, sortState]"
  />
</template>
