<!--
 * @Author: Chuang
 * @Date: 2022-08-05 09:49:20
 * @LastEditTime: 2026-07-02 00:52:25
 * @LastEditors: Chuang
 * @Description: 前端数据表格（可选分页 / 排序 / 条件过滤 / 列显隐 / CSV 导出）
-->
<script lang="ts" setup>
import type { CheckboxValueType } from 'element-plus'
import { onClickOutside } from '@vueuse/core'
import { data2Csv } from '@/utils/converter'

export interface ListTableProps {
  columns?: ColumnInfo[]
  records: any[]
  pageSize?: number
  /** 可选每页条数，默认 5 / 10 / 20 / 50 / 100 */
  pageSizes?: number[]
  border?: boolean
  stripe?: boolean
  maxHeight?: string
  layout?: 'fixed' | 'auto'
  /** 是否展示下载 CSV 按钮（默认关闭） */
  showExport?: boolean
  /** 导出文件名（不含扩展名） */
  exportName?: string
  /** 是否开启单列排序（全表排序后再分页） */
  sortable?: boolean
  /** 是否启用前端分页（默认开启；关闭后展示全部行） */
  pagination?: boolean
  /** 是否展示条件过滤按钮（默认关闭） */
  showFilter?: boolean
  /** 是否展示列显隐按钮（默认关闭） */
  showColumnToggle?: boolean
}

export interface ColumnInfo {
  prop: string
  label?: string
  align?: 'left' | 'right' | 'center'
  fixed?: boolean
  width?: number | string
  minWidth?: number | string
  /** 覆盖表级 sortable */
  sortable?: boolean
}

interface PageInfo {
  pageIndex: number
  total: number
}

type SortOrder = 'ascending' | 'descending' | null
type FilterLogic = 'and' | 'or'

interface SortState {
  prop: string
  order: SortOrder
}

interface FilterRule {
  id: string
  prop: string
  keyword: string
}

interface IState {
  pageRecords: any[]
  page: PageInfo
  pageSize: number
  /** 已生效的过滤条件 */
  filterLogic: FilterLogic
  filterRules: FilterRule[]
  /** 弹层草稿 */
  filterDraftLogic: FilterLogic
  filterDraftRules: FilterRule[]
  filterPopoverVisible: boolean
  /** 被隐藏的列 prop */
  hiddenColumnProps: string[]
  /** 列显隐弹层草稿（可见列） */
  columnDraftVisibleProps: string[]
  columnPopoverVisible: boolean
  sort: SortState
}

const props = withDefaults(defineProps<ListTableProps>(), {
  columns: () => [],
  border: false,
  stripe: false,
  pageSize: 10,
  // 字面量默认值：defineProps 会提升，不能引用 setup 局部变量
  pageSizes: () => [5, 10, 20, 50, 100],
  layout: 'fixed',
  showExport: false,
  exportName: 'data',
  sortable: false,
  pagination: true,
  showFilter: false,
  showColumnToggle: false,
})

/** 前端分页可选每页条数 */
const LIST_TABLE_PAGE_SIZES = [5, 10, 20, 50, 100] as const

/** Popover 手动控制，避免内部下拉点击被当成外部关闭 */
const filterTriggerRef = ref<HTMLElement | null>(null)
const filterPanelRef = ref<HTMLElement | null>(null)
const columnTriggerRef = ref<HTMLElement | null>(null)
const columnPanelRef = ref<HTMLElement | null>(null)
let filterRuleSeq = 0

function createFilterRule(partial?: Partial<Pick<FilterRule, 'prop' | 'keyword'>>): FilterRule {
  filterRuleSeq += 1
  return {
    id: `fr-${filterRuleSeq}`,
    prop: partial?.prop || '',
    keyword: partial?.keyword || '',
  }
}

function cloneFilterRules(rules: FilterRule[]): FilterRule[] {
  return rules.map(rule => createFilterRule({ prop: rule.prop, keyword: rule.keyword }))
}

function normalizeFilterRules(rules: FilterRule[]): FilterRule[] {
  return rules
    .map(rule => ({
      ...rule,
      prop: rule.prop || '',
      keyword: (rule.keyword || '').trim(),
    }))
    .filter(rule => !!rule.prop && !!rule.keyword)
}

const states = reactive<IState>({
  pageRecords: [],
  page: {
    pageIndex: 1,
    total: 0,
  },
  pageSize: props.pageSize,
  filterLogic: 'and',
  filterRules: [],
  filterDraftLogic: 'and',
  filterDraftRules: [],
  filterPopoverVisible: false,
  hiddenColumnProps: [],
  columnDraftVisibleProps: [],
  columnPopoverVisible: false,
  sort: {
    prop: '',
    order: null,
  },
})

const pageSizeOptions = computed(() => {
  const sizes = new Set(props.pageSizes.length ? props.pageSizes : [...LIST_TABLE_PAGE_SIZES])
  sizes.add(states.pageSize)
  return [...sizes].sort((a, b) => a - b)
})

// ---------- 列 ----------

const resolvedColumns = computed<ColumnInfo[]>(() => {
  if (props.columns.length)
    return props.columns
  const first = props.records[0]
  if (!first || typeof first !== 'object')
    return []
  return Object.keys(first).map(key => ({ prop: key, label: key }))
})

const columnOptions = computed(() =>
  resolvedColumns.value.map(col => ({
    value: col.prop,
    label: col.label || col.prop,
  })),
)

/** 应用列显隐后的展示列（至少保留一列） */
const displayColumns = computed(() => {
  const cols = resolvedColumns.value
  if (!props.showColumnToggle || !states.hiddenColumnProps.length)
    return cols
  const hidden = new Set(states.hiddenColumnProps)
  const shown = cols.filter(col => !hidden.has(col.prop))
  return shown.length ? shown : cols
})

const hasHiddenColumns = computed(() => {
  if (!props.showColumnToggle || !states.hiddenColumnProps.length)
    return false
  const hidden = new Set(states.hiddenColumnProps)
  return resolvedColumns.value.some(col => hidden.has(col.prop))
})

function getVisibleColumnPropsFromHidden() {
  const hidden = new Set(states.hiddenColumnProps)
  return resolvedColumns.value
    .map(col => col.prop)
    .filter(prop => !hidden.has(prop))
}

function isColumnSortable(col: ColumnInfo) {
  if (typeof col.sortable === 'boolean')
    return col.sortable
  return props.sortable
}

function cellText(value: unknown): string {
  if (value == null)
    return ''
  if (typeof value === 'object')
    return JSON.stringify(value)
  return String(value)
}

function compareValues(a: unknown, b: unknown): number {
  if (a == null && b == null)
    return 0
  if (a == null)
    return 1
  if (b == null)
    return -1

  const na = Number(a)
  const nb = Number(b)
  if (!Number.isNaN(na) && !Number.isNaN(nb) && String(a).trim() !== '' && String(b).trim() !== '')
    return na - nb

  return cellText(a).localeCompare(cellText(b), undefined, { numeric: true, sensitivity: 'base' })
}

// ---------- 过滤 / 排序 / 分页 ----------

const activeFilterRules = computed(() => normalizeFilterRules(states.filterRules))
const hasActiveFilters = computed(() => activeFilterRules.value.length > 0)

function matchRule(row: any, rule: FilterRule) {
  const kw = rule.keyword.trim().toLowerCase()
  if (!rule.prop || !kw)
    return true
  return cellText(row?.[rule.prop]).toLowerCase().includes(kw)
}

/** 过滤 + 排序后的全量数据（再切片分页） */
const processedRecords = computed(() => {
  let list = props.records.slice()
  const rules = activeFilterRules.value

  if (rules.length) {
    list = list.filter((row) => {
      if (states.filterLogic === 'or')
        return rules.some(rule => matchRule(row, rule))
      return rules.every(rule => matchRule(row, rule))
    })
  }

  const { prop, order } = states.sort
  if (prop && order) {
    const dir = order === 'ascending' ? 1 : -1
    list.sort((ra, rb) => compareValues(ra?.[prop], rb?.[prop]) * dir)
  }

  return list
})

const showTools = computed(() =>
  props.showFilter || props.showColumnToggle || props.showExport,
)

/** 有数据且（开启分页或有工具按钮）时展示底栏 */
const showFooter = computed(() =>
  props.records.length > 0 && (props.pagination || showTools.value),
)

function columnMinWidth(col: ColumnInfo) {
  if (col.width)
    return undefined
  if (col.minWidth != null)
    return col.minWidth
  return undefined
}

function applyPage(pageIndex = states.page.pageIndex) {
  const total = processedRecords.value.length
  states.page.total = total
  if (!props.pagination) {
    states.page.pageIndex = 1
    states.pageRecords = processedRecords.value
    return
  }
  const maxPageIndex = Math.max(1, Math.ceil(total / states.pageSize) || 1)
  const nextIndex = Math.min(Math.max(1, pageIndex), maxPageIndex)
  states.page.pageIndex = nextIndex
  const start = (nextIndex - 1) * states.pageSize
  states.pageRecords = processedRecords.value.slice(start, start + states.pageSize)
}

function handlePageIndexChange(pageIndex: number) {
  applyPage(pageIndex)
}

function handlePageSizeChange(pageSize: number) {
  states.pageSize = pageSize
  applyPage(1)
}

function handleSortChange(payload: { prop: string | null, order: SortOrder }) {
  states.sort.prop = payload.order && payload.prop ? payload.prop : ''
  states.sort.order = payload.order
  applyPage(1)
}

// ---------- 条件过滤 Popover（手动显隐，忽略 select 下拉误关） ----------

function syncFilterDrafts() {
  states.filterDraftLogic = states.filterLogic
  const rules = cloneFilterRules(states.filterRules)
  states.filterDraftRules = rules.length ? rules : [createFilterRule()]
}

function openFilterPopover() {
  closeColumnPopover()
  syncFilterDrafts()
  states.filterPopoverVisible = true
}

function closeFilterPopover() {
  states.filterPopoverVisible = false
}

function toggleFilterPopover() {
  if (states.filterPopoverVisible)
    closeFilterPopover()
  else
    openFilterPopover()
}

onClickOutside(
  filterPanelRef,
  () => {
    if (states.filterPopoverVisible)
      closeFilterPopover()
  },
  {
    ignore: [filterTriggerRef, '.el-select__popper'],
  },
)

// ---------- 列显隐 Popover ----------

function openColumnPopover() {
  closeFilterPopover()
  states.columnDraftVisibleProps = getVisibleColumnPropsFromHidden()
  states.columnPopoverVisible = true
}

function closeColumnPopover() {
  states.columnPopoverVisible = false
}

function toggleColumnPopover() {
  if (states.columnPopoverVisible)
    closeColumnPopover()
  else
    openColumnPopover()
}

onClickOutside(
  columnPanelRef,
  () => {
    if (states.columnPopoverVisible)
      closeColumnPopover()
  },
  {
    ignore: [columnTriggerRef],
  },
)

function handleColumnDraftChange(propsList: CheckboxValueType[]) {
  const next = propsList.map(String).filter(Boolean)
  if (!next.length)
    return
  states.columnDraftVisibleProps = next
}

function applyColumns() {
  if (!states.columnDraftVisibleProps.length)
    return
  const visible = new Set(states.columnDraftVisibleProps)
  states.hiddenColumnProps = resolvedColumns.value
    .map(col => col.prop)
    .filter(prop => !visible.has(prop))
  closeColumnPopover()
}

function resetColumns() {
  states.columnDraftVisibleProps = resolvedColumns.value.map(col => col.prop)
  states.hiddenColumnProps = []
  closeColumnPopover()
}

function addFilterDraftRule() {
  states.filterDraftRules.push(createFilterRule())
}

function removeFilterDraftRule(id: string) {
  if (states.filterDraftRules.length <= 1) {
    states.filterDraftRules = [createFilterRule()]
    return
  }
  states.filterDraftRules = states.filterDraftRules.filter(rule => rule.id !== id)
}

function applyFilters() {
  states.filterLogic = states.filterDraftLogic
  states.filterRules = normalizeFilterRules(states.filterDraftRules).map(rule =>
    createFilterRule({ prop: rule.prop, keyword: rule.keyword }),
  )
  closeFilterPopover()
  applyPage(1)
}

function resetFilters() {
  states.filterLogic = 'and'
  states.filterRules = []
  states.filterDraftLogic = 'and'
  states.filterDraftRules = [createFilterRule()]
  closeFilterPopover()
  applyPage(1)
}

function resetViewState() {
  states.filterLogic = 'and'
  states.filterRules = []
  states.filterDraftLogic = 'and'
  states.filterDraftRules = []
  closeFilterPopover()
  states.hiddenColumnProps = []
  states.columnDraftVisibleProps = []
  closeColumnPopover()
  states.sort = { prop: '', order: null }
  states.pageSize = props.pageSize
}

function escapeCsvCell(value: unknown): string {
  const text = cellText(value)
  if (/[",\r\n]/.test(text))
    return `"${text.replace(/"/g, '""')}"`
  return text
}

function buildCsvContent(): string {
  const cols = resolvedColumns.value
  const header = cols.map(col => escapeCsvCell(col.label || col.prop)).join(',')
  const rows = processedRecords.value.map(row =>
    cols.map(col => escapeCsvCell(row?.[col.prop])).join(','),
  )
  return [header, ...rows].join('\n')
}

function handleExportCsv() {
  if (!processedRecords.value.length)
    return
  data2Csv(buildCsvContent(), props.exportName || 'data')
}

watch(
  () => props.records,
  () => {
    resetViewState()
    applyPage(1)
  },
  { deep: true },
)

watch(
  () => resolvedColumns.value.map(col => col.prop).join('\0'),
  () => {
    const propSet = new Set(resolvedColumns.value.map(col => col.prop))
    states.hiddenColumnProps = states.hiddenColumnProps.filter(prop => propSet.has(prop))
  },
)

watch(
  () => props.pageSize,
  (pageSize) => {
    states.pageSize = pageSize
    applyPage(1)
  },
)

watch(
  () => props.pagination,
  () => {
    applyPage(1)
  },
)

watch(
  [() => states.pageSize, () => props.columns, processedRecords],
  () => {
    applyPage(states.page.pageIndex)
  },
  { immediate: true, deep: true },
)
</script>

<template>
  <div class="full">
    <template v-if="records.length > 0">
      <el-table
        class="list-table"
        :data="states.pageRecords"
        :border="border"
        :stripe="stripe"
        :max-height="maxHeight"
        empty-text="暂无数据"
        :table-layout="layout"
        @sort-change="handleSortChange"
      >
        <el-table-column
          v-for="item in displayColumns"
          :key="item.prop"
          :prop="item.prop"
          :label="item.label || item.prop"
          :align="item.align"
          :fixed="item.fixed"
          :width="item.width"
          :min-width="columnMinWidth(item)"
          :sortable="isColumnSortable(item) ? 'custom' : false"
          show-overflow-tooltip
        />
        <slot name="columns" />
      </el-table>

      <div v-if="showFooter" class="list-table-footer">
        <div class="list-table-tools">
          <el-popover
            v-if="showFilter"
            :visible="states.filterPopoverVisible"
            placement="top-start"
            :width="420"
            :persistent="true"
            :show-arrow="true"
          >
            <template #reference>
              <span ref="filterTriggerRef" class="list-table-tool-trigger">
                <el-button
                  text
                  bg
                  size="small"
                  :type="hasActiveFilters ? 'primary' : undefined"
                  :title="hasActiveFilters ? `已设置 ${activeFilterRules.length} 条过滤条件` : '条件过滤'"
                  @click.stop="toggleFilterPopover"
                >
                  <span class="i-mingcute-filter-line text-14px" />
                  <span v-if="hasActiveFilters" class="list-table-tool-count">{{ activeFilterRules.length }}</span>
                </el-button>
              </span>
            </template>

            <div
              ref="filterPanelRef"
              class="list-table-filter"
              @keydown.enter.prevent="applyFilters"
            >
              <div class="list-table-filter__logic">
                <span class="list-table-filter__logic-label">匹配方式</span>
                <el-radio-group v-model="states.filterDraftLogic" size="small">
                  <el-radio-button value="and">
                    满足全部
                  </el-radio-button>
                  <el-radio-button value="or">
                    满足任一
                  </el-radio-button>
                </el-radio-group>
              </div>

              <el-scrollbar max-height="260px">
                <div class="list-table-filter__list">
                  <div
                    v-for="rule in states.filterDraftRules"
                    :key="rule.id"
                    class="list-table-filter__row"
                  >
                    <el-select
                      v-model="rule.prop"
                      size="small"
                      filterable
                      clearable
                      placeholder="字段"
                      class="list-table-filter__field"
                    >
                      <el-option
                        v-for="opt in columnOptions"
                        :key="opt.value"
                        :label="opt.label"
                        :value="opt.value"
                      />
                    </el-select>
                    <el-input
                      v-model="rule.keyword"
                      size="small"
                      clearable
                      placeholder="包含关键字"
                      class="list-table-filter__keyword"
                    />
                    <el-button
                      text
                      size="small"
                      class="list-table-filter__remove"
                      title="删除条件"
                      @click="removeFilterDraftRule(rule.id)"
                    >
                      <span class="i-mingcute-close-line text-14px" />
                    </el-button>
                  </div>
                </div>
              </el-scrollbar>

              <div class="list-table-filter__toolbar">
                <el-button size="small" text bg @click="addFilterDraftRule">
                  <span class="i-mingcute-add-line mr-4px text-14px" />
                  添加条件
                </el-button>
                <div class="list-table-filter__actions">
                  <el-button size="small" text @click="resetFilters">
                    重置
                  </el-button>
                  <el-button size="small" type="primary" @click="applyFilters">
                    确认
                  </el-button>
                </div>
              </div>
            </div>
          </el-popover>

          <el-popover
            v-if="showColumnToggle"
            :visible="states.columnPopoverVisible"
            placement="top-start"
            :width="260"
            :persistent="true"
            :show-arrow="true"
          >
            <template #reference>
              <span ref="columnTriggerRef" class="list-table-tool-trigger">
                <el-button
                  text
                  bg
                  size="small"
                  :type="hasHiddenColumns ? 'primary' : undefined"
                  :title="hasHiddenColumns ? '部分列已隐藏' : '列显示'"
                  @click.stop="toggleColumnPopover"
                >
                  <span class="i-mingcute-layout-line text-14px" />
                </el-button>
              </span>
            </template>

            <div ref="columnPanelRef" class="list-table-columns">
              <div class="list-table-columns__hint">
                选择展示的列，确认后生效
              </div>
              <el-scrollbar max-height="280px">
                <el-checkbox-group
                  :model-value="states.columnDraftVisibleProps"
                  class="list-table-columns__list"
                  @change="handleColumnDraftChange"
                >
                  <el-checkbox
                    v-for="col in resolvedColumns"
                    :key="col.prop"
                    :value="col.prop"
                    class="list-table-columns__item"
                  >
                    {{ col.label || col.prop }}
                  </el-checkbox>
                </el-checkbox-group>
              </el-scrollbar>
              <div class="list-table-columns__actions">
                <el-button size="small" text @click="resetColumns">
                  重置
                </el-button>
                <el-button size="small" type="primary" @click="applyColumns">
                  确认
                </el-button>
              </div>
            </div>
          </el-popover>

          <el-button
            v-if="showExport"
            text
            bg
            size="small"
            title="下载 CSV"
            :disabled="!processedRecords.length"
            @click="handleExportCsv"
          >
            <span class="i-mingcute-download-2-line text-14px" />
          </el-button>
        </div>

        <el-pagination
          v-if="pagination"
          class="list-table-pagination"
          layout="total, sizes, prev, pager, next"
          :pager-count="5"
          :page-sizes="pageSizeOptions"
          :page-size="states.pageSize"
          :current-page="states.page.pageIndex"
          :total="states.page.total"
          @size-change="handlePageSizeChange"
          @current-change="handlePageIndexChange"
        />
      </div>
    </template>
    <div v-else class="common-empty h-200px h-full">
      暂无数据
    </div>
  </div>
</template>

<style lang="scss" scoped>
.list-table-tools {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.list-table-tool-trigger {
  display: inline-flex;
}

.list-table-tool-count {
  margin-left: 4px;
  font-size: 12px;
  line-height: 1;
}

.list-table-footer {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 6px;
  min-height: 32px;
}

.list-table-pagination {
  margin-left: auto;
  justify-content: flex-end;
}

.list-table-columns__hint {
  margin-bottom: 8px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
  line-height: 1.4;
}

.list-table-columns__list {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding-right: 2px;
}

.list-table-columns__item {
  margin-right: 0;
  height: 28px;
}

.list-table-columns__actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 12px;
}

.list-table-filter__logic {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 10px;
}

.list-table-filter__logic-label {
  flex-shrink: 0;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.list-table-filter__list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-right: 2px;
}

.list-table-filter__row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.list-table-filter__field {
  width: 120px;
  flex-shrink: 0;
}

.list-table-filter__keyword {
  flex: 1;
  min-width: 0;
}

.list-table-filter__remove {
  flex-shrink: 0;
  padding: 4px;
}

.list-table-filter__toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-top: 12px;
}

.list-table-filter__actions {
  display: flex;
  gap: 8px;
}
</style>
