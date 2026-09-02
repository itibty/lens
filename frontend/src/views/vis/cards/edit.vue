<!--
 * @Description: 可视化卡片设计器
-->
<script setup name="VisCardEdit" lang="ts">
import type { FormInstance, FormRules } from 'element-plus'
import type { QueryIssue } from './cardApi'
import type {
  DimensionPill,
  FilterPill,
  HavingPill,
  MetricPill,
  OrderPill,
  ParamPill,
} from '@/views/vis/shared/dnd'
import type { ChartType, DatasetField, VisCard } from '@/views/vis/shared/types'
import vis from '@/apis/vis/index'
import { markListStale } from '@/hooks/layout'
import { useLeaveConfirm } from '@/hooks/leaveConfirm'
import { useSwipeBackGuard } from '@/hooks/swipeBack'
import { useAccountStore } from '@/stores/modules/account'
import { showConfirm, showToast } from '@/utils/index'
import { ChartDocBlock } from '@/views/vis/charts'
import { createDragUid } from '@/views/vis/shared/dnd'
import { createEmptyCard, hidesQueryDimensions, isPivotChart, isStaticChart, needsDataset } from '@/views/vis/shared/types'
import { allowContrastForChart, apiErrorMessage, collectQueryIssues, fromVisCardInfo, hasQueryModelContent, hasQueryShelves, listChartConstraints, normalizeQueryForRequest, orderSourceDimensions, reconcileQueryDependents, resetQueryForDataset, resetQueryShelves, toVisCardSaveRequest } from './cardApi'
import AdvancedModule from './components/AdvancedModule.vue'
import AdvFieldLabel from './components/AdvFieldLabel.vue'
import CardPreview from './components/CardPreview.vue'
import ChartFormHost from './components/ChartFormHost.vue'
import ChartTypePicker from './components/ChartTypePicker.vue'
import DimensionShelf from './components/DimensionShelf.vue'
import FieldPanel from './components/FieldPanel.vue'
import FilterBuilder from './components/FilterBuilder.vue'
import HavingShelf from './components/HavingShelf.vue'
import MetricShelf from './components/MetricShelf.vue'
import OrderShelf from './components/OrderShelf.vue'
import ParamShelf from './components/ParamShelf.vue'
import StaticContentFields from './components/StaticContentFields.vue'
import { FUNCTION_CARD_CONF } from './config'

defineOptions({ name: 'VisCardEdit' })

const { hasFunction } = useAccountStore()
const canWrite = hasFunction(FUNCTION_CARD_CONF)

const LEFT_WIDTH_KEY = 'NA:vis-card-left-width:v3'
const CENTER_WIDTH_KEY = 'NA:vis-card-center-width'
const LEFT_WIDTH_DEFAULT = 192
const LEFT_WIDTH_MIN = 160
const LEFT_WIDTH_MAX = 280
const CENTER_WIDTH_DEFAULT = 360
const CENTER_WIDTH_MIN = 240
const CENTER_WIDTH_MAX = 480
const RIGHT_WIDTH_MIN = 320

interface IStates {
  loading: boolean
  saveLoading: boolean
  card: VisCard
  isNew: boolean
  centerTab: 'query' | 'feature' | 'style'
  /** 高级设置折叠面板；默认折叠 */
  advancedOpen: string[]
}

const route = useRoute()
const router = useRouter()
const dirty = ref(false)
const { skipConfirm } = useLeaveConfirm(undefined, undefined, () => dirty.value)

const designerRef = ref<HTMLElement>()
const previewRef = ref<{
  runPreview: () => Promise<void>
  resetPreview: () => void
  closeDetail: () => void
}>()
const leftWidth = ref(LEFT_WIDTH_DEFAULT)
const centerWidth = ref(CENTER_WIDTH_DEFAULT)
const resizing = ref<'left' | 'center' | null>(null)

const states = reactive<IStates>({
  loading: true,
  saveLoading: false,
  isNew: true,
  centerTab: 'query',
  advancedOpen: [],
  card: {
    id: '',
    updatedAt: '',
    ...createEmptyCard(),
  },
})

watch(
  () => states.card,
  () => {
    if (!states.loading && !states.saveLoading)
      dirty.value = true
  },
  { deep: true, flush: 'sync' },
)

function readStoredWidth(key: string, min: number, max: number, fallback: number) {
  const n = Number(localStorage.getItem(key))
  if (Number.isFinite(n) && n >= min && n <= max)
    return n
  return fallback
}

function persistWidths() {
  localStorage.setItem(LEFT_WIDTH_KEY, String(leftWidth.value))
  localStorage.setItem(CENTER_WIDTH_KEY, String(centerWidth.value))
}

function clampPanelWidths(nextLeft?: number, nextCenter?: number) {
  const containerW = designerRef.value?.clientWidth ?? Number.POSITIVE_INFINITY
  let l = nextLeft ?? leftWidth.value
  let c = nextCenter ?? centerWidth.value

  l = Math.min(LEFT_WIDTH_MAX, Math.max(LEFT_WIDTH_MIN, l))
  c = Math.min(CENTER_WIDTH_MAX, Math.max(CENTER_WIDTH_MIN, c))

  const maxLeft = containerW - c - RIGHT_WIDTH_MIN
  const maxCenter = containerW - l - RIGHT_WIDTH_MIN
  if (Number.isFinite(maxLeft))
    l = Math.min(l, Math.max(LEFT_WIDTH_MIN, maxLeft))
  if (Number.isFinite(maxCenter))
    c = Math.min(c, Math.max(CENTER_WIDTH_MIN, maxCenter))

  leftWidth.value = l
  centerWidth.value = c
}

function onResizeStart(side: 'left' | 'center', e: MouseEvent) {
  e.preventDefault()
  resizing.value = side
  const startX = e.clientX
  const startLeft = leftWidth.value
  const startCenter = centerWidth.value

  const onMove = (ev: MouseEvent) => {
    const delta = ev.clientX - startX
    if (side === 'left')
      clampPanelWidths(startLeft + delta, startCenter)
    else
      clampPanelWidths(startLeft, startCenter + delta)
  }
  const onUp = () => {
    resizing.value = null
    persistWidths()
    window.removeEventListener('mousemove', onMove)
    window.removeEventListener('mouseup', onUp)
  }
  window.addEventListener('mousemove', onMove)
  window.addEventListener('mouseup', onUp)
}

function ensureArrays() {
  const q = states.card.query
  q.dimensions ??= []
  q.rowDimensions ??= []
  q.colDimensions ??= []
  q.metrics ??= []
  q.filters ??= []
  q.havingFilters ??= []
  q.orderList ??= []
  q.params ??= []

  q.dimensions = (q.dimensions as DimensionPill[]).map(d => ({
    ...d,
    _uid: d._uid || createDragUid(),
  }))
  q.rowDimensions = (q.rowDimensions as DimensionPill[]).map(d => ({
    ...d,
    _uid: d._uid || createDragUid(),
  }))
  q.colDimensions = (q.colDimensions as DimensionPill[]).map(d => ({
    ...d,
    _uid: d._uid || createDragUid(),
  }))
  q.metrics = (q.metrics as MetricPill[]).map(m => ({
    ...m,
    _uid: m._uid || createDragUid(),
  }))
  q.filters = (q.filters ?? []).map(group => ({
    ...group,
    conditions: (group.conditions as FilterPill[]).map(c => ({
      ...c,
      _uid: c._uid || createDragUid(),
    })),
  }))
  q.orderList = (q.orderList as OrderPill[]).map(o => ({
    ...o,
    _uid: o._uid || createDragUid(),
  }))
  q.havingFilters = (q.havingFilters as HavingPill[]).map(h => ({
    ...h,
    _uid: h._uid || createDragUid(),
  }))
  q.params = (q.params as ParamPill[]).map(p => ({
    ...p,
    _uid: p._uid || createDragUid(),
  }))
}

function onLimitChange(value: number | undefined) {
  if (value == null || Number.isNaN(value)) {
    delete states.card.query.limit
    return
  }
  states.card.query.limit = value
}

const dimensionPills = computed({
  get: () => (states.card.query.dimensions ?? []) as DimensionPill[],
  set: (value) => {
    states.card.query.dimensions = value
  },
})

const rowDimensionPills = computed({
  get: () => (states.card.query.rowDimensions ?? []) as DimensionPill[],
  set: (value) => {
    states.card.query.rowDimensions = value
  },
})

const colDimensionPills = computed({
  get: () => (states.card.query.colDimensions ?? []) as DimensionPill[],
  set: (value) => {
    states.card.query.colDimensions = value
  },
})

const metricPills = computed({
  get: () => (states.card.query.metrics ?? []) as MetricPill[],
  set: (value) => {
    states.card.query.metrics = value
  },
})

const orderPills = computed({
  get: () => (states.card.query.orderList ?? []) as OrderPill[],
  set: (value) => {
    states.card.query.orderList = value
  },
})

const havingPills = computed({
  get: () => (states.card.query.havingFilters ?? []) as HavingPill[],
  set: (value) => {
    states.card.query.havingFilters = value
  },
})

const paramPills = computed({
  get: () => (states.card.query.params ?? []) as ParamPill[],
  set: (value) => {
    states.card.query.params = value
  },
})

const datasetFields = ref<DatasetField[]>([])
/** 刷新 / 保存写入；已有错误时改配置再收一次，未报过错不跟 */
const shapeIssues = ref<QueryIssue[]>([])

const datasetError = computed(() =>
  shapeIssues.value.find(item => item.shelf === 'dataset')?.message,
)

function applyShapeIssues(issues: QueryIssue[]) {
  shapeIssues.value = issues
  if (!issues.length)
    return
  states.centerTab = 'query'
  if (issues.some(item => item.shelf === 'having') && !states.advancedOpen.includes('advanced'))
    states.advancedOpen = [...states.advancedOpen, 'advanced']
}

function onPreviewIssues(issues: QueryIssue[]) {
  applyShapeIssues(issues)
}

watch(
  () => [states.card.visual.chartType, states.card.query, states.card.visual.richtext, states.card.visual.web, states.card.visual.progress, states.card.visual.kpi] as const,
  () => {
    if (!shapeIssues.value.length)
      return
    shapeIssues.value = collectQueryIssues(
      states.card.visual.chartType,
      states.card.query,
      datasetFields.value,
      states.card.visual,
    )
  },
  { deep: true },
)

function onAsOfDateChange(value: string | undefined | null) {
  if (!value)
    delete states.card.query.asOfDate
  else
    states.card.query.asOfDate = value
}

const chartConstraints = computed(() => listChartConstraints(states.card.visual.chartType))
const isPivot = computed(() => isPivotChart(states.card.visual.chartType))
const isStatic = computed(() => isStaticChart(states.card.visual.chartType))
const datasetNeeded = computed(() => needsDataset(states.card.visual.chartType))
const hideDimensions = computed(() => hidesQueryDimensions(states.card.visual.chartType))
const allowContrast = computed(() => allowContrastForChart(states.card.visual.chartType))
const pageTitleAry = computed(() => {
  const name = states.card.name?.trim()
  return name ? ['卡片', name] : ['卡片']
})

const orderDimensionPills = computed(() =>
  orderSourceDimensions(states.card.query, states.card.visual.chartType),
)

watch(
  () => [
    states.card.visual.chartType,
    states.card.query.dimensions,
    states.card.query.rowDimensions,
    states.card.query.colDimensions,
    states.card.query.metrics,
  ],
  () => reconcileQueryDependents(states.card.query, states.card.visual.chartType),
  { deep: true },
)

function applyChartType(next: ChartType) {
  shapeIssues.value = []
  resetQueryShelves(states.card.query)
  states.card.visual.chartType = next
  ensureArrays()
  previewRef.value?.resetPreview()
}

function onChartTypeChange(next: ChartType) {
  if (states.card.visual.chartType === next)
    return
  if (!hasQueryShelves(states.card.query)) {
    applyChartType(next)
    return
  }
  showConfirm(
    '将清空维度、指标、排序和结果过滤，筛选条件会保留。是否继续？',
    '切换图表',
    'warning',
    () => applyChartType(next),
  )
}

function hasDatasetBoundVisual(visual: typeof states.card.visual) {
  return Boolean(
    visual.table?.marks?.length
    || visual.chart?.lineFields?.length
    || visual.chart?.secondaryFields?.length,
  )
}

function applyDatasetChange() {
  shapeIssues.value = []
  resetQueryForDataset(states.card.query)
  const visual = states.card.visual
  if (visual.table?.marks) {
    delete visual.table.marks
    if (!Object.keys(visual.table).length)
      delete visual.table
  }
  if (visual.chart) {
    delete visual.chart.lineFields
    delete visual.chart.secondaryFields
    if (!Object.keys(visual.chart).length)
      delete visual.chart
  }
  ensureArrays()
  previewRef.value?.closeDetail()
  if (!isStaticChart(states.card.visual.chartType))
    previewRef.value?.resetPreview()
}

let ignoreDatasetWatch = false

watch(
  () => states.card.query.datasetId,
  (next, prev) => {
    if (ignoreDatasetWatch) {
      ignoreDatasetWatch = false
      return
    }
    if (states.loading || prev == null || next === prev)
      return
    if (isStaticChart(states.card.visual.chartType)) {
      applyDatasetChange()
      return
    }
    if (!hasQueryModelContent(states.card.query) && !hasDatasetBoundVisual(states.card.visual)) {
      applyDatasetChange()
      return
    }
    showConfirm(
      '切换数据集将清空数据模型中的维度、指标、筛选、排序、结果过滤和模板参数，是否继续？',
      '切换数据集',
      'warning',
      applyDatasetChange,
      () => {
        ignoreDatasetWatch = true
        states.card.query.datasetId = prev
      },
    )
  },
)

let loadRequestId = 0
async function loadCard(id?: string) {
  const cardId = id ?? (route.query.id as string | undefined)
  const currentRequestId = ++loadRequestId
  shapeIssues.value = []
  previewRef.value?.resetPreview()
  dirty.value = false
  states.loading = true
  try {
    if (!cardId) {
      states.isNew = true
      states.card = {
        id: '',
        updatedAt: '',
        ...createEmptyCard(),
      }
      ensureArrays()
      return
    }
    const res = await vis.query.getCardDetail({ cardId })
    if (currentRequestId !== loadRequestId)
      return
    if (!res.data) {
      showToast('卡片不存在', 'error')
      skipConfirm()
      router.replace({ name: 'VisCards' })
      return
    }
    states.isNew = false
    states.card = fromVisCardInfo(res.data)
    ensureArrays()
    await nextTick()
    if (currentRequestId !== loadRequestId)
      return
    if (isStaticChart(states.card.visual.chartType) || states.card.query.datasetId)
      void previewRef.value?.runPreview()
  }
  catch (e) {
    if (currentRequestId !== loadRequestId)
      return
    showToast(apiErrorMessage(e, '卡片不存在'), 'error')
    skipConfirm()
    router.replace({ name: 'VisCards' })
  }
  finally {
    if (currentRequestId === loadRequestId)
      states.loading = false
  }
}

const saveOpen = ref(false)
const saveFormRef = ref<FormInstance>()
const saveForm = reactive({
  name: '',
  desc: '',
  status: 'EBL' as 'EBL' | 'DBL',
})
const saveRules: FormRules<typeof saveForm> = {
  name: [{ required: true, trigger: 'blur', message: '请填写卡片标题' }],
}

function openSaveDialog() {
  saveForm.name = states.card.name?.trim() || ''
  saveForm.desc = states.card.desc?.trim() || ''
  saveForm.status = states.card.status === 'DBL' ? 'DBL' : 'EBL'
  saveOpen.value = true
}

function closeSaveDialog() {
  saveOpen.value = false
}

function onSaveDialogClosed() {
  saveFormRef.value?.clearValidate()
}

async function handleSave() {
  const name = saveForm.name.trim()
  if (!name) {
    showToast('请填写卡片标题', 'warning')
    return
  }
  const issues = collectQueryIssues(
    states.card.visual.chartType,
    states.card.query,
    datasetFields.value,
    states.card.visual,
  )
  applyShapeIssues(issues)
  if (issues[0]) {
    showToast(issues[0].message, 'warning')
    return
  }
  const desc = saveForm.desc.trim()
  const query = normalizeQueryForRequest(states.card.query, states.card.visual.chartType)
  states.saveLoading = true
  try {
    const res = await vis.card.editCard(
      toVisCardSaveRequest({
        ...states.card,
        name,
        desc,
        status: saveForm.status,
      }, query),
    )
    const savedId = res.data ? String(res.data) : states.card.id
    states.card.name = name
    states.card.desc = desc
    states.card.status = saveForm.status
    states.card.id = savedId
    states.isNew = false
    saveOpen.value = false
    dirty.value = false
    showToast('保存成功', 'success')
    markListStale('VisCards')
    if (!route.query.id && savedId)
      router.replace({ name: 'VisCardEdit', query: { id: savedId } })
  }
  catch (e) {
    showToast(apiErrorMessage(e, '保存失败'), 'error')
  }
  finally {
    states.saveLoading = false
  }
}

function confirmSave() {
  saveFormRef.value?.validate((valid) => {
    if (!valid)
      return
    void handleSave()
  })
}

useSwipeBackGuard()

onMounted(() => {
  leftWidth.value = readStoredWidth(LEFT_WIDTH_KEY, LEFT_WIDTH_MIN, LEFT_WIDTH_MAX, LEFT_WIDTH_DEFAULT)
  centerWidth.value = readStoredWidth(
    CENTER_WIDTH_KEY,
    CENTER_WIDTH_MIN,
    CENTER_WIDTH_MAX,
    CENTER_WIDTH_DEFAULT,
  )
  nextTick(() => clampPanelWidths())
  loadCard()
})

onBeforeRouteUpdate((to) => {
  if (to.name !== 'VisCardEdit')
    return
  loadCard(to.query.id as string | undefined)
})
</script>

<template>
  <PageCard
    :title-ary="pageTitleAry"
    :scroll-content="false"
    :provide-scope="false"
    class="noAutoSeg1"
  >
    <template #extra>
      <el-button
        v-if="canWrite"
        type="primary"
        :loading="states.saveLoading"
        :disabled="states.loading"
        @click="openSaveDialog"
      >
        保存
      </el-button>
    </template>

    <template #default>
      <div
        ref="designerRef"
        v-spinner="states.loading"
        class="designer h-full flex"
        :class="{ 'is-resizing': resizing != null }"
      >
        <aside
          class="designer__left"
          :class="{ 'is-resizing': resizing === 'left' }"
          :style="{ width: `${leftWidth}px` }"
        >
          <FieldPanel
            v-model:dataset-id="states.card.query.datasetId"
            v-model:fields="datasetFields"
            :needs-dataset="datasetNeeded"
            :error="datasetError"
          />
          <div
            class="resize-handle resize-handle--col resize-handle--right"
            title="拖动调整宽度"
            @mousedown="onResizeStart('left', $event)"
          />
        </aside>

        <section
          class="designer__center"
          :class="{ 'is-resizing': resizing === 'center' }"
          :style="{ width: `${centerWidth}px` }"
        >
          <ChartTypePicker
            v-if="!states.loading"
            :chart-type="states.card.visual.chartType"
            @pick="onChartTypeChange"
          />

          <el-tabs
            v-model="states.centerTab"
            type="border-card"
            stretch
            class="designer__tabs"
          >
            <el-tab-pane label="数据模型" name="query">
              <el-scrollbar class="designer__tab-scroll">
                <div class="designer__tab-body">
                  <ChartDocBlock
                    title="数据约束"
                    :items="chartConstraints"
                  />
                  <StaticContentFields
                    v-if="isStatic"
                    v-model:visual="states.card.visual"
                    :issues="shapeIssues"
                  />
                  <template v-else>
                    <template v-if="isPivot">
                      <DimensionShelf
                        v-model:dimensions="rowDimensionPills"
                        title="行维"
                        tip="每一行代表一类，例如地区"
                        shelf="rowDimensions"
                        :fields="datasetFields"
                        :issues="shapeIssues"
                        :visual="states.card.visual"
                      />
                      <DimensionShelf
                        v-model:dimensions="colDimensionPills"
                        title="列维"
                        tip="每一列代表一类，例如月份"
                        shelf="colDimensions"
                        :fields="datasetFields"
                        :issues="shapeIssues"
                        :visual="states.card.visual"
                      />
                    </template>
                    <DimensionShelf
                      v-else-if="!hideDimensions"
                      v-model:dimensions="dimensionPills"
                      :fields="datasetFields"
                      :issues="shapeIssues"
                      :visual="states.card.visual"
                    />
                    <MetricShelf
                      v-model:metrics="metricPills"
                      :allow-contrast="allowContrast"
                      :fields="datasetFields"
                      :issues="shapeIssues"
                      :visual="states.card.visual"
                    />
                    <FilterBuilder
                      v-model:filters="states.card.query.filters!"
                      :fields="datasetFields"
                      :issues="shapeIssues"
                    />
                    <OrderShelf
                      v-model:order-list="orderPills"
                      :dimensions="orderDimensionPills"
                      :metrics="metricPills"
                      :for-pivot="isPivot"
                    />
                    <el-collapse v-model="states.advancedOpen" class="designer__advanced">
                      <el-collapse-item title="高级设置" name="advanced">
                        <div class="designer__advanced-mods">
                          <AdvancedModule title="查询范围">
                            <div class="adv-fields">
                              <div class="adv-field">
                                <AdvFieldLabel tip="日期快捷、同环比的参照日，空则基准日为今天">
                                  基准日
                                </AdvFieldLabel>
                                <el-date-picker
                                  :model-value="states.card.query.asOfDate"
                                  class="adv-field__control"
                                  type="date"
                                  size="small"
                                  value-format="YYYY-MM-DD"
                                  placeholder="默认今天"
                                  clearable
                                  @update:model-value="onAsOfDateChange"
                                />
                              </div>
                              <div class="adv-field">
                                <AdvFieldLabel tip="查询结果上限，空则不限制">
                                  最多行数
                                </AdvFieldLabel>
                                <el-input-number
                                  :model-value="states.card.query.limit"
                                  class="adv-field__control"
                                  size="small"
                                  :min="1"
                                  :max="50000"
                                  controls-position="right"
                                  placeholder="不限制"
                                  :value-on-clear="undefined"
                                  @update:model-value="onLimitChange"
                                />
                              </div>
                            </div>
                          </AdvancedModule>
                          <HavingShelf
                            v-model:having-filters="havingPills"
                            :metrics="metricPills"
                            :issues="shapeIssues"
                            :for-pivot="isPivot"
                          />
                          <ParamShelf
                            v-model:params="paramPills"
                            :fields="datasetFields"
                          />
                        </div>
                      </el-collapse-item>
                    </el-collapse>
                  </template>
                </div>
              </el-scrollbar>
            </el-tab-pane>
            <el-tab-pane label="功能设置" name="feature">
              <el-scrollbar class="designer__tab-scroll">
                <div class="designer__tab-body">
                  <ChartFormHost
                    v-model:visual="states.card.visual"
                    mode="feature"
                    :query="states.card.query"
                    :fields="datasetFields"
                  />
                </div>
              </el-scrollbar>
            </el-tab-pane>
            <el-tab-pane label="样式风格" name="style">
              <el-scrollbar class="designer__tab-scroll">
                <div class="designer__tab-body">
                  <ChartFormHost
                    v-model:visual="states.card.visual"
                    mode="style"
                    :query="states.card.query"
                    :fields="datasetFields"
                  />
                </div>
              </el-scrollbar>
            </el-tab-pane>
          </el-tabs>
          <div
            class="resize-handle resize-handle--col resize-handle--right"
            title="拖动调整宽度"
            @mousedown="onResizeStart('center', $event)"
          />
        </section>

        <aside class="designer__right">
          <CardPreview
            ref="previewRef"
            :query="states.card.query"
            :visual="states.card.visual"
            :title="states.card.name"
            :description="states.card.desc"
            :fields="datasetFields"
            @issues="onPreviewIssues"
          />
        </aside>
      </div>
      <CustomDialog
        v-model:visible="saveOpen"
        title="保存卡片"
        size="mini"
        append-to-body
        cancel-text="取消"
        confirm-text="确定"
        :confirm-loading="states.saveLoading"
        :handler-cancel="closeSaveDialog"
        :handler-confirm="confirmSave"
        @closed="onSaveDialogClosed"
      >
        <template #custom-dialog-body>
          <el-form
            ref="saveFormRef"
            class="card-save-form"
            :model="saveForm"
            :rules="saveRules"
            label-position="top"
          >
            <el-form-item label="卡片标题" prop="name">
              <el-input
                v-model="saveForm.name"
                maxlength="50"
                clearable
                placeholder="请输入卡片标题"
              />
            </el-form-item>
            <el-form-item label="卡片描述" prop="desc">
              <el-input
                v-model="saveForm.desc"
                type="textarea"
                :rows="3"
                maxlength="200"
                show-word-limit
                placeholder="请输入卡片描述"
              />
            </el-form-item>
            <el-form-item
              class="card-save-status"
              label="状态"
              prop="status"
              label-position="left"
              label-width="auto"
            >
              <el-switch
                v-model="saveForm.status"
                inline-prompt
                active-text="启用"
                inactive-text="禁用"
                active-value="EBL"
                inactive-value="DBL"
              />
            </el-form-item>
          </el-form>
        </template>
      </CustomDialog>
    </template>
  </PageCard>
</template>

<style scoped lang="scss">
.card-save-form {
  :deep(.el-form-item) {
    margin-bottom: 12px;
  }

  :deep(.el-form-item__label) {
    margin-bottom: 0;
    padding-bottom: 4px;
    height: auto;
    line-height: 1.2;
  }

  :deep(.el-form-item:last-child) {
    margin-bottom: 0;
  }

  :deep(.card-save-status) {
    align-items: center;

    .el-form-item__label {
      padding-bottom: 0;
      padding-right: 12px;
      justify-content: flex-start;
      text-align: left;
    }

    .el-form-item__content {
      flex: none;
      margin-left: 0;
      justify-content: flex-start;
    }
  }
}

.designer {
  /* 设计器自定义色（非字段条）；字段条走 EP primary/success/warning */
  --vis-shelf-well: #eef3f8;
  --vis-muted-bar: #e8eef5;
  --vis-select-bg: #e6f0fa;
  --vis-select-border: #1f6fad;
  --vis-select-fg: #124a78;
  --vis-panel-bg: #f7fafc;

  min-height: 0;
  min-width: 0;
  overscroll-behavior-x: none;

  &.is-resizing {
    cursor: col-resize;
  }

  &__left,
  &__center {
    position: relative;
    flex-shrink: 0;
    min-width: 0;
    overflow: hidden;
    background: var(--vis-panel-bg);
  }

  &__left {
    display: flex;
    flex-direction: column;
    min-height: 0;
    border-right: 1px solid var(--el-border-color-lighter);
  }

  &__center {
    --vis-cfg-title-size: 13px;
    --vis-cfg-title-weight: 500;
    --vis-cfg-title-color: var(--el-text-color-regular);
    --vis-cfg-group-size: 12px;
    --vis-cfg-group-weight: 500;
    --vis-cfg-group-color: var(--el-text-color-regular);
    --vis-cfg-label-size: 12px;
    --vis-cfg-label-weight: 400;
    --vis-cfg-label-color: var(--el-text-color-regular);
    --vis-cfg-meta-size: 12px;
    --vis-cfg-meta-color: var(--el-text-color-secondary);
    --vis-cfg-hint-size: 12px;
    --vis-cfg-hint-color: var(--el-text-color-placeholder);

    min-height: 0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    /* 横向 padding 下放到固定头 / 滚动内容，避免滚动条落在 padding 内侧 */
    padding: 0;
    border-right: 1px solid var(--el-border-color-lighter);
  }

  &__right {
    flex: 1;
    min-width: 320px;
    min-height: 0;
    height: 100%;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    background: var(--vis-panel-bg);
  }

  &__tabs {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    border: none;
    border-radius: 0;
    box-shadow: none;
    background: transparent;

    :deep(.el-tabs__header) {
      margin: 0;
      flex-shrink: 0;
      width: 100%;
      display: flex;
      border-bottom: 1px solid var(--el-border-color-light);
      background: var(--el-fill-color-lighter);
    }

    :deep(.el-tabs__nav-wrap) {
      flex: 1;
      min-width: 0;
      padding: 0;
    }

    :deep(.el-tabs__nav-scroll) {
      width: 100%;
    }

    :deep(.el-tabs__nav) {
      width: 100%;
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      border: none;
      float: none;
    }

    :deep(.el-tabs__active-bar) {
      display: none;
    }

    :deep(.el-tabs__item),
    :deep(.el-tabs__item:nth-child(2)),
    :deep(.el-tabs__item:first-child),
    :deep(.el-tabs__item:last-child) {
      flex: none;
      width: auto;
      min-width: 0;
      height: 40px;
      line-height: 40px;
      margin: 0;
      justify-content: center;
      padding: 0 4px;
      text-align: center;
      border: none;
      border-right: 1px solid var(--el-border-color-light);
      box-sizing: border-box;
      transition:
        color 0.15s ease,
        background 0.15s ease;
    }

    :deep(.el-tabs__item:last-child) {
      border-right: none;
    }

    :deep(.el-tabs__item.is-active) {
      background: var(--el-bg-color);
      color: var(--el-color-primary);
    }

    :deep(.el-tabs__content) {
      flex: 1;
      min-height: 0;
      padding: 0;
      overflow: hidden;
      background: var(--el-bg-color);
    }

    :deep(.el-tab-pane) {
      height: 100%;
    }
  }

  &__tab-scroll {
    height: 100%;
  }

  &__tab-body {
    padding: 12px 10px 16px;
    box-sizing: border-box;
  }

  /* 与字段条 minus 一致：圆形浅灰 hover */
  :deep(.vis-icon-btn) {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 22px;
    height: 22px;
    padding: 0;
    border: none;
    border-radius: 50%;
    background: transparent;
    color: var(--el-color-primary);
    cursor: pointer;
    opacity: 0.65;
    flex-shrink: 0;
    transition:
      background 0.15s ease,
      opacity 0.15s ease;

    > span {
      font-size: 16px;
      line-height: 1;
    }

    &:hover:not(:disabled) {
      opacity: 1;
      background: rgb(0 0 0 / 8%);
    }

    &:disabled {
      opacity: 0.35;
      cursor: not-allowed;
    }
  }
}

.designer__advanced {
  margin-top: 4px;
  border: none;
  --el-collapse-header-height: 36px;

  :deep(.el-collapse-item) {
    border: 1px solid var(--el-border-color-extra-light);
    border-radius: 8px;
    overflow: hidden;
    background: var(--el-fill-color-blank);
  }

  :deep(.el-collapse-item__header) {
    height: var(--el-collapse-header-height);
    line-height: var(--el-collapse-header-height);
    padding: 0 12px;
    font-size: var(--vis-cfg-title-size);
    font-weight: var(--vis-cfg-title-weight);
    color: var(--vis-cfg-title-color);
    background: var(--el-fill-color-lighter);
    border-bottom: none;
  }

  :deep(.el-collapse-item.is-active .el-collapse-item__header) {
    border-bottom: 1px solid var(--el-border-color-extra-light);
  }

  :deep(.el-collapse-item__wrap) {
    border-bottom: none;
    background: transparent;
  }

  :deep(.el-collapse-item__content) {
    padding: 8px 10px 10px;
  }
}

.designer__advanced-mods {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.adv-fields {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.adv-field {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-width: 0;
  min-height: 32px;

  &__control {
    flex: 0 1 168px;
    width: 168px;
    max-width: 52%;
    min-width: 0;
    box-sizing: border-box;
  }

  :deep(.adv-field__control.el-date-editor),
  :deep(.adv-field__control.el-input-number) {
    width: 168px;
    max-width: 100%;
  }
}
</style>
