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
import { CARD_INPUT_PLACEHOLDERS, getChartShelfTips, QUERY_SETTINGS_COPY } from '@/views/vis/charts/chartHelp'
import { pruneSeriesStyles } from '@/views/vis/shared/chartSeriesStyle'
import { copyName } from '@/views/vis/shared/copyName'
import { createDragUid } from '@/views/vis/shared/dnd'
import { pruneFieldStyles } from '@/views/vis/shared/fieldStyle'
import { createEmptyCard, isPivotChart, isStaticChart, needsDataset } from '@/views/vis/shared/types'
import { allowContrastForChart, apiErrorMessage, collectQueryIssues, fromVisCardInfo, hasQueryModelContent, hasQueryShelves, listChartConstraints, normalizeQueryForRequest, orderSourceDimensions, reconcileQueryDependents, resetQueryForDataset, toVisCardSaveRequest } from './cardApi'
import { createCardCopy } from './cardCopy'
import { retainQueryIssues } from './cardValidation'
import { canPreserveChartQuery, changeCardChartType } from './chartShape'
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
import { providePreviewEditing } from './previewEditing'

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
  centerTab: 'query' | 'feature' | 'style'
  /** 高级设置折叠面板；默认折叠 */
  advancedOpen: string[]
}

const route = useRoute()
const router = useRouter()
const dirty = ref(false)
const previewRows = ref<Record<string, unknown>[]>([])
const { skipConfirm, confirmLeave } = useLeaveConfirm(undefined, undefined, () => dirty.value)

const designerRef = ref<HTMLElement>()
const fieldPanelRef = ref<InstanceType<typeof FieldPanel>>()
const previewRef = ref<{
  resetPreview: () => void
  closeDetail: () => void
}>()
const leftWidth = ref(LEFT_WIDTH_DEFAULT)
const centerWidth = ref(CENTER_WIDTH_DEFAULT)
const resizing = ref<'left' | 'center' | null>(null)
const { deferUpdates, onInput: onConfigInput, setInputEditing } = providePreviewEditing()

const states = reactive<IStates>({
  loading: true,
  saveLoading: false,
  centerTab: 'query',
  advancedOpen: [],
  card: {
    id: '',
    updatedAt: '',
    ...createEmptyCard(),
  },
})

watch(() => [states.centerTab, states.card.id, states.card.visual.chartType, states.card.query.datasetId], () => setInputEditing(false))

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

function onLimitChange(value: number | null | undefined) {
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
/** 仅主动刷新 / 保存写入；编辑过程只消除已修复的错误。 */
const shapeIssues = ref<QueryIssue[]>([])

const datasetError = computed(() =>
  shapeIssues.value.find(item => item.shelf === 'dataset')?.message,
)

function applyShapeIssues(issues: QueryIssue[]) {
  shapeIssues.value = issues
  if (!issues.length)
    return
  states.centerTab = ['detail', 'appearance'].includes(issues[0]?.shelf ?? '') ? 'feature' : 'query'
  if (issues.some(item => item.shelf === 'having') && !states.advancedOpen.includes('advanced'))
    states.advancedOpen = [...states.advancedOpen, 'advanced']
  void nextTick(() => {
    const target = designerRef.value?.querySelector<HTMLElement>(`[data-validation-shelf="${issues[0]!.shelf}"]`)
    target?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  })
}

function currentIssues() {
  return collectQueryIssues(states.card.visual.chartType, states.card.query, datasetFields.value, states.card.visual)
}

function validateForSave() {
  const issues = currentIssues()
  applyShapeIssues(issues)
  if (issues[0])
    showToast(issues[0].message, 'warning')
  return !issues.length
}

watch(
  () => [states.card.query, states.card.visual, datasetFields.value] as const,
  () => {
    if (!shapeIssues.value.length)
      return
    const remaining = retainQueryIssues(shapeIssues.value, currentIssues())
    if (remaining.length !== shapeIssues.value.length)
      shapeIssues.value = remaining
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
const chartShelfTips = computed(() => getChartShelfTips(states.card.visual.chartType))
const isPivot = computed(() => isPivotChart(states.card.visual.chartType))
const isStatic = computed(() => isStaticChart(states.card.visual.chartType))
const datasetNeeded = computed(() => needsDataset(states.card.visual.chartType))
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
  () => {
    reconcileQueryDependents(states.card.query, states.card.visual.chartType)
    pruneFieldStyles(states.card.visual, states.card.query)
    pruneSeriesStyles(states.card.visual, states.card.query)
  },
  { deep: true },
)

function applyChartType(next: ChartType) {
  shapeIssues.value = []
  changeCardChartType(states.card, next)
  ensureArrays()
  previewRef.value?.resetPreview()
}

function onChartTypeChange(next: ChartType) {
  if (states.card.visual.chartType === next)
    return
  if (canPreserveChartQuery(states.card.visual.chartType, next) || !hasQueryShelves(states.card.query)) {
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
    visual.detail?.fields?.length
    || visual.table?.marks?.length
    || visual.chart?.lineFields?.length
    || visual.chart?.secondaryFields?.length,
  )
}

function applyDatasetChange() {
  shapeIssues.value = []
  resetQueryForDataset(states.card.query)
  const visual = states.card.visual
  delete visual.detail
  if (visual.table?.marks) {
    delete visual.table.marks
    if (!Object.keys(visual.table).length)
      delete visual.table
  }
  if (visual.chart) {
    delete visual.chart.lineFields
    delete visual.chart.secondaryFields
    delete visual.chart.seriesStyles
    if (!Object.keys(visual.chart).length)
      delete visual.chart
  }
  ensureArrays()
  previewRef.value?.closeDetail()
  if (!isStaticChart(states.card.visual.chartType))
    previewRef.value?.resetPreview()
}

let ignoreDatasetWatch = false
const datasetChangePending = ref(false)

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
    datasetChangePending.value = true
    showConfirm(
      '切换数据集将清空数据模型中的维度、指标、筛选、排序、结果过滤、模板参数和明细配置，是否继续？',
      '切换数据集',
      'warning',
      () => {
        applyDatasetChange()
        datasetChangePending.value = false
      },
      () => {
        ignoreDatasetWatch = true
        states.card.query.datasetId = prev
        datasetChangePending.value = false
      },
    )
  },
)

const saveOpen = ref(false)
let loadRequestId = 0
async function loadCard(id?: string, copyFrom?: string) {
  const cardId = id || copyFrom
  const copying = !id && !!copyFrom
  let copied = false
  const currentRequestId = ++loadRequestId
  shapeIssues.value = []
  saveOpen.value = false
  previewRef.value?.resetPreview()
  dirty.value = false
  states.loading = true
  try {
    if (!cardId) {
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
    const loaded = fromVisCardInfo(res.data)
    states.card = copying ? createCardCopy(loaded) : loaded
    ensureArrays()
    await nextTick()
    if (currentRequestId !== loadRequestId)
      return
    // 字段面板先响应数据集变更，再等字段回填到预览，避免初次校验误报字段不可用。
    await fieldPanelRef.value?.waitForFields()
    await nextTick()
    if (currentRequestId !== loadRequestId)
      return
    copied = copying
  }
  catch (e) {
    if (currentRequestId !== loadRequestId)
      return
    showToast(apiErrorMessage(e, '卡片不存在'), 'error')
    skipConfirm()
    router.replace({ name: 'VisCards' })
  }
  finally {
    if (currentRequestId === loadRequestId) {
      states.loading = false
      dirty.value = copied
    }
  }
}

const saveAs = ref(false)
const saveFormRef = ref<FormInstance>()
const saveForm = reactive({
  name: '',
  desc: '',
  status: 'EBL' as 'EBL' | 'DBL',
})
const saveRules: FormRules<typeof saveForm> = {
  name: [{ required: true, whitespace: true, trigger: 'blur', message: '请填写卡片标题' }],
}

async function openSaveDialog(asCopy = false) {
  await nextTick()
  if (states.loading || states.saveLoading || !canWrite)
    return
  if (!validateForSave())
    return
  saveAs.value = asCopy
  saveForm.name = asCopy ? copyName(states.card.name) : states.card.name?.trim() || ''
  saveForm.desc = states.card.desc?.trim() || ''
  saveForm.status = states.card.status === 'DBL' ? 'DBL' : 'EBL'
  saveOpen.value = true
}

function closeSaveDialog() {
  if (!states.saveLoading)
    saveOpen.value = false
}

function onSaveDialogClosed() {
  saveFormRef.value?.clearValidate()
}

async function handleSave() {
  await nextTick()
  if (states.loading || states.saveLoading || !canWrite)
    return
  const name = saveForm.name.trim()
  if (!name) {
    showToast('请填写卡片标题', 'warning')
    return
  }
  if (!validateForSave()) {
    saveOpen.value = false
    return
  }
  const desc = saveForm.desc.trim()
  const query = normalizeQueryForRequest(states.card.query, states.card.visual.chartType)
  states.saveLoading = true
  try {
    const res = await vis.card.editCard(
      toVisCardSaveRequest({
        ...states.card,
        id: saveAs.value ? '' : states.card.id,
        name,
        desc,
        status: saveForm.status,
      }, query),
    )
    const savedId = res.data ? String(res.data) : ''
    if (!savedId)
      throw new Error('保存失败：未返回卡片 ID')
    states.card.name = name
    states.card.desc = desc
    states.card.status = saveForm.status
    states.card.id = savedId
    saveOpen.value = false
    dirty.value = false
    showToast('保存成功', 'success')
    markListStale('VisCards')
    if (route.query.id !== savedId)
      await router.replace({ name: 'VisCardEdit', query: { id: savedId } })
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
  loadCard(route.query.id as string | undefined, route.query.copyFrom as string | undefined)
})

onBeforeRouteUpdate(async (to) => {
  if (to.name !== 'VisCardEdit')
    return
  if (states.saveLoading && dirty.value)
    return false
  if (!(await confirmLeave()))
    return false
  await loadCard(to.query.id as string | undefined, to.query.copyFrom as string | undefined)
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
      <el-button v-if="canWrite && states.card.id" :disabled="states.loading || states.saveLoading" @click="openSaveDialog(true)">
        另存为
      </el-button>
      <el-button
        v-if="canWrite"
        type="primary"
        :loading="states.saveLoading"
        :disabled="states.loading"
        @click="openSaveDialog()"
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
            ref="fieldPanelRef"
            v-model:dataset-id="states.card.query.datasetId"
            v-model:fields="datasetFields"
            data-validation-shelf="dataset"
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
          @input.capture="onConfigInput"
          @focusout.capture="setInputEditing(false)"
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
                    data-validation-shelf="content"
                    :issues="shapeIssues"
                  />
                  <template v-else>
                    <template v-if="isPivot">
                      <DimensionShelf
                        v-model:dimensions="rowDimensionPills"
                        data-validation-shelf="rowDimensions"
                        title="行维"
                        :tip="chartShelfTips.rowDimensions"
                        shelf="rowDimensions"
                        :fields="datasetFields"
                        :issues="shapeIssues"
                        :visual="states.card.visual"
                      />
                      <DimensionShelf
                        v-model:dimensions="colDimensionPills"
                        data-validation-shelf="colDimensions"
                        title="列维"
                        :tip="chartShelfTips.colDimensions"
                        shelf="colDimensions"
                        :fields="datasetFields"
                        :issues="shapeIssues"
                        :visual="states.card.visual"
                      />
                    </template>
                    <DimensionShelf
                      v-else
                      v-model:dimensions="dimensionPills"
                      data-validation-shelf="dimensions"
                      :tip="chartShelfTips.dimensions"
                      :fields="datasetFields"
                      :issues="shapeIssues"
                      :visual="states.card.visual"
                    />
                    <MetricShelf
                      v-model:metrics="metricPills"
                      data-validation-shelf="metrics"
                      :tip="chartShelfTips.metrics"
                      :allow-contrast="allowContrast"
                      :fields="datasetFields"
                      :issues="shapeIssues"
                      :visual="states.card.visual"
                    />
                    <FilterBuilder
                      v-model:filters="states.card.query.filters!"
                      data-validation-shelf="filters"
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
                          <div class="adv-fields">
                            <div class="adv-field">
                              <AdvFieldLabel :tip="QUERY_SETTINGS_COPY.asOfDate.tip">
                                {{ QUERY_SETTINGS_COPY.asOfDate.label }}
                              </AdvFieldLabel>
                              <el-date-picker
                                :model-value="states.card.query.asOfDate"
                                class="adv-field__control"
                                type="date"
                                size="small"
                                value-format="YYYY-MM-DD"
                                :placeholder="QUERY_SETTINGS_COPY.asOfDate.placeholder"
                                clearable
                                @update:model-value="onAsOfDateChange"
                              />
                            </div>
                            <div class="adv-field">
                              <AdvFieldLabel :tip="QUERY_SETTINGS_COPY.limit.tip">
                                {{ QUERY_SETTINGS_COPY.limit.label }}
                              </AdvFieldLabel>
                              <el-input-number
                                :model-value="states.card.query.limit"
                                :aria-label="QUERY_SETTINGS_COPY.limit.label"
                                class="adv-field__control"
                                size="small"
                                :min="1"
                                :max="50000"
                                controls-position="right"
                                :value-on-clear="null"
                                @update:model-value="onLimitChange"
                              >
                                <template #suffix>
                                  <button
                                    v-if="states.card.query.limit != null"
                                    type="button"
                                    class="adv-field__clear"
                                    :aria-label="QUERY_SETTINGS_COPY.limit.clear"
                                    :title="QUERY_SETTINGS_COPY.limit.clear"
                                    @click="onLimitChange(undefined)"
                                  >
                                    <span class="i-ep-circle-close" />
                                  </button>
                                </template>
                              </el-input-number>
                            </div>
                          </div>
                          <HavingShelf
                            v-model:having-filters="havingPills"
                            data-validation-shelf="having"
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
                    :issues="shapeIssues"
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
                    :rows="previewRows"
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
            :enabled="!states.loading && !datasetChangePending"
            :defer-updates="deferUpdates"
            @issues="applyShapeIssues"
            @rows="previewRows = $event"
          />
        </aside>
      </div>
      <CustomDialog
        v-model:visible="saveOpen"
        :title="saveAs ? '另存为新卡片' : '保存卡片'"
        size="mini"
        append-to-body
        cancel-text="取消"
        confirm-text="确定"
        :confirm-loading="states.saveLoading"
        :show-close="!states.saveLoading"
        :close-on-click-modal="!states.saveLoading"
        :close-on-press-escape="!states.saveLoading"
        :handler-cancel="closeSaveDialog"
        :handler-confirm="confirmSave"
        @closed="onSaveDialogClosed"
      >
        <template #custom-dialog-body>
          <el-form
            ref="saveFormRef"
            class="card-save-form"
            :model="saveForm"
            :disabled="states.saveLoading"
            :rules="saveRules"
            label-position="top"
          >
            <el-form-item label="卡片标题" prop="name">
              <el-input
                v-model="saveForm.name"
                maxlength="50"
                clearable
                :placeholder="CARD_INPUT_PLACEHOLDERS.title"
              />
            </el-form-item>
            <el-form-item label="卡片描述" prop="desc">
              <el-input
                v-model="saveForm.desc"
                type="textarea"
                :rows="3"
                maxlength="200"
                show-word-limit
                :placeholder="CARD_INPUT_PLACEHOLDERS.description"
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
  --vis-shelf-well: var(--na-fill-color-light);
  --vis-muted-bar: var(--na-border-color-light);
  --vis-select-bg: var(--el-color-primary-light-9);
  --vis-select-border: var(--el-color-primary-light-5);
  --vis-select-fg: var(--el-color-primary);
  --vis-panel-bg: var(--na-content-bg);

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
    --vis-cfg-title-weight: 600;
    --vis-cfg-title-color: var(--el-text-color-primary);
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

    :deep(.el-scrollbar__wrap) {
      // 避免表单显隐时自动跟随其他字段调整滚动位置。
      overflow-anchor: none;
    }
  }

  &__tab-body {
    padding: 12px 14px 16px;
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

    &.is-small {
      width: 18px;
      height: 18px;
      opacity: 0.55;

      > span {
        font-size: 13px;
      }
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
    border-bottom: 1px solid var(--el-border-color-extra-light);
    overflow: hidden;
    background: var(--el-fill-color-blank);
  }

  :deep(.el-collapse-item__header) {
    height: var(--el-collapse-header-height);
    line-height: var(--el-collapse-header-height);
    padding: 0 2px;
    font-size: var(--vis-cfg-title-size);
    font-weight: var(--vis-cfg-title-weight);
    color: var(--vis-cfg-title-color);
    background: transparent;
    border-bottom: none;
  }

  :deep(.el-collapse-item__header:hover) {
    background: var(--el-fill-color-lighter);
  }

  :deep(.el-collapse-item__wrap) {
    border-bottom: none;
    background: transparent;
  }

  :deep(.el-collapse-item__content) {
    padding: 8px 2px 14px;
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
  padding: 0 2px 4px;
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

  &__clear {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    border: 0;
    background: transparent;
    color: var(--el-text-color-placeholder);
    font-size: 14px;
    cursor: pointer;
    opacity: 0;

    &:hover {
      color: var(--el-text-color-secondary);
    }

    &:focus-visible {
      outline: 2px solid var(--el-color-primary-light-5);
      outline-offset: 2px;
    }
  }

  &__control:hover &__clear,
  &__control:focus-within &__clear {
    opacity: 1;
  }

  :deep(.adv-field__control.el-date-editor),
  :deep(.adv-field__control.el-input-number) {
    width: 168px;
    max-width: 100%;
  }
}
</style>
