<!--
 * @Description: DS SQL 编辑页（Meta + 模板编辑 + 运行结果）
-->
<script setup name="DsEditScript" lang="ts">
import type { BindFieldsDialogInstance } from './components/BindFieldsDialog.vue'
import type { DebugParamsDialogInstance } from './components/DebugParamsDialog.vue'
import type { SqlOutputRun } from './components/debugResult'
import type { CustomDialogProps } from '@/components/CustomDialog.vue'

import vis from '@/apis/vis/index'

import { markListStale } from '@/hooks/layout'
import { useLeaveConfirm } from '@/hooks/leaveConfirm'
import { useSwipeBackGuard } from '@/hooks/swipeBack'
import { useAccountStore } from '@/stores/modules/account'
import { showToast } from '@/utils/index'
import { createLogger } from '@/utils/logger'
import BindFieldsDialog from './components/BindFieldsDialog.vue'
import { FUNCTION_DATASET_CONF } from './components/config'
import DebugParamsDialog from './components/DebugParamsDialog.vue'
import {
  buildOutputRun,
  extractDebugErrorInfo,
  resolveSaveGate,
} from './components/debugResult'
import MetaTree from './components/MetaTree.vue'
import {
  ENJOY_CONSTANTS_PRESET,
  ENJOY_METHODS_PRESET,
} from './components/sql-editor'
import SqlOutputPanel from './components/SqlOutputPanel.vue'
import SqlRulePanel from './components/SqlRulePanel.vue'
import SqlTemplateEditor from './components/SqlTemplateEditor.vue'

const logger = createLogger('DS_EDIT')
const { hasFunction } = useAccountStore()
const canWrite = hasFunction(FUNCTION_DATASET_CONF)

const META_WIDTH_KEY = 'NA:ds-meta-side-width'
const META_WIDTH_DEFAULT = 300
const META_WIDTH_MIN = 200
const META_WIDTH_MAX = 560

interface IStates {
  loading: boolean
  saveLoading: boolean
  info?: VIS.ConfSqlInfo

  optionsLoading: boolean
  metaLoading: boolean
  metaTree: VIS.SchemaInfo[]
  tableOptions: VIS.OptionString[]
  loadedTables: string[]

  runLoading: boolean
  delayInit: boolean

  jsonCode: string
  sqlCode: string

  /** 底部最近一次运行结果 */
  outputRun: SqlOutputRun | null
}

const debugParamsDialogRef = ref<DebugParamsDialogInstance>()
const bindFieldsDialogRef = ref<BindFieldsDialogInstance>()
const sqlOutputPanelRef = ref<InstanceType<typeof SqlOutputPanel>>()

const metaSideWidth = ref(META_WIDTH_DEFAULT)
const metaSideDragging = ref(false)
const metaSideVisible = ref(true)

function readMetaSideWidth() {
  const raw = localStorage.getItem(META_WIDTH_KEY)
  const n = raw ? Number(raw) : NaN
  if (Number.isFinite(n) && n >= META_WIDTH_MIN && n <= META_WIDTH_MAX)
    metaSideWidth.value = n
}

function persistMetaSideWidth() {
  localStorage.setItem(META_WIDTH_KEY, String(metaSideWidth.value))
}

function closeMetaSide() {
  metaSideVisible.value = false
}

function openMetaSide() {
  metaSideVisible.value = true
}

function onMetaSideResizeStart(e: MouseEvent) {
  if (!metaSideVisible.value)
    return
  e.preventDefault()
  metaSideDragging.value = true
  const startX = e.clientX
  const startW = metaSideWidth.value

  const onMove = (ev: MouseEvent) => {
    const next = startW + (ev.clientX - startX)
    metaSideWidth.value = Math.min(META_WIDTH_MAX, Math.max(META_WIDTH_MIN, next))
  }
  const onUp = () => {
    metaSideDragging.value = false
    persistMetaSideWidth()
    window.removeEventListener('mousemove', onMove)
    window.removeEventListener('mouseup', onUp)
  }
  window.addEventListener('mousemove', onMove)
  window.addEventListener('mouseup', onUp)
}

const states = reactive<IStates>({
  loading: false,
  optionsLoading: false,
  metaLoading: false,
  runLoading: false,
  saveLoading: false,
  delayInit: false,

  metaTree: [],
  tableOptions: [],
  loadedTables: [],

  jsonCode: '',
  sqlCode: '',

  outputRun: null,
})

const dirty = ref(false)
useLeaveConfirm(undefined, undefined, () => dirty.value)
watch(
  [() => states.sqlCode, () => states.jsonCode],
  () => {
    if (!states.loading && !states.saveLoading)
      dirty.value = true
  },
  { flush: 'sync' },
)

const outputLoading = computed(() => states.runLoading)

const draftParams = computed(() => states.jsonCode || '{}')
const saveGate = computed(() => resolveSaveGate(states.outputRun, {
  sqlId: states.info?.id,
  sql: states.sqlCode,
  params: draftParams.value,
}))
const saveBlockReason = computed(() => saveGate.value.ok ? '' : saveGate.value.reason)

const pageTitleAry = computed(() => {
  const name = states.info?.sqlName?.trim()
  return name ? ['数据集', name] : ['数据集', '编辑脚本']
})

/** meta 返回的库类型（如 MySQL），驱动关键字映射 */
const sqlDbType = computed(() => states.metaTree[0]?.dbType)

/** 编辑器顶栏：数据库名 */
const editorTitle = computed(() => {
  return states.metaTree[0]?.name || states.info?.dsName || 'DB'
})

const ruleDocDialog = reactive<CustomDialogProps>({
  visible: false,
  size: 'mini',
  title: 'SQL 模板速查',
  showFooter: false,
  appendToBody: true,
  destroyOnClose: true,
})

let requestId = 0
let loadRequestId = 0
let tableOptionsRequestId = 0
let metaTreeRequestId = 0
let outputRunSeq = 0

function clearOutputRun() {
  states.outputRun = null
}

function setOutputRun(run: Omit<SqlOutputRun, 'id'>) {
  outputRunSeq += 1
  states.outputRun = {
    id: `output-${outputRunSeq}`,
    ...run,
    columns: run.columns || [],
    records: run.records || [],
  }
}

function resetMetaState() {
  states.metaTree = []
  states.tableOptions = []
  states.loadedTables = []
  states.optionsLoading = false
  states.metaLoading = false
}

async function fetchConfSql(sqlId: string, initMeta: boolean = false) {
  const currentRequestId = ++loadRequestId
  tableOptionsRequestId += 1
  metaTreeRequestId += 1
  resetMetaState()
  states.loading = true
  dirty.value = false
  try {
    const res = await vis.dataset.getDatasetDetail({ sqlId })
    if (currentRequestId !== loadRequestId)
      return
    const { data } = res
    if (!data) {
      states.info = undefined
      states.jsonCode = ''
      states.sqlCode = ''
      resetMetaState()
      showToast('数据集不存在', 'error')
      return
    }

    states.info = data
    states.jsonCode = data.sqlParams || '{}'
    states.sqlCode = data.sqlContent || ''
    if (data.dsName && initMeta)
      void initMetaForSource(data.dsName, currentRequestId)
  }
  catch {
    if (currentRequestId !== loadRequestId)
      return
    states.info = undefined
    states.jsonCode = ''
    states.sqlCode = ''
    resetMetaState()
  }
  finally {
    if (currentRequestId === loadRequestId)
      states.loading = false
  }
}

async function initMetaForSource(sourceName: string, ownerRequestId = loadRequestId) {
  const currentRequestId = ++tableOptionsRequestId
  metaTreeRequestId += 1
  resetMetaState()
  states.optionsLoading = true
  try {
    const res = await vis.datasource.listDatasourceTables({ sourceName })
    if (ownerRequestId !== loadRequestId || currentRequestId !== tableOptionsRequestId)
      return
    states.tableOptions = res.data?.list || []
  }
  catch (e) {
    if (ownerRequestId !== loadRequestId || currentRequestId !== tableOptionsRequestId)
      return
    logger.error(e)
    showToast('表清单加载失败', 'error')
  }
  finally {
    if (ownerRequestId === loadRequestId && currentRequestId === tableOptionsRequestId)
      states.optionsLoading = false
  }
}

/** 按 tables 加载 meta；有数据时原地替换，避免先清空造成闪烁 */
async function reloadMetaTree(sourceName: string, tables: string[], ownerRequestId = loadRequestId) {
  const currentRequestId = ++metaTreeRequestId
  if (!tables.length) {
    if (ownerRequestId === loadRequestId) {
      states.metaTree = []
      states.loadedTables = []
    }
    return
  }

  states.metaLoading = true
  states.loadedTables = [...tables]
  try {
    const res = await vis.datasource.getDatasourceMetaTree({
      sourceName,
      tables: tables.join(','),
    })
    if (ownerRequestId !== loadRequestId || currentRequestId !== metaTreeRequestId)
      return
    states.metaTree = res.data?.list || []
  }
  catch (e) {
    if (ownerRequestId !== loadRequestId || currentRequestId !== metaTreeRequestId)
      return
    logger.error(e)
    showToast('元数据加载失败', 'error')
  }
  finally {
    if (ownerRequestId === loadRequestId && currentRequestId === metaTreeRequestId)
      states.metaLoading = false
  }
}

function handleConfirmTables(tables: string[]) {
  const sourceName = states.info?.dsName
  if (!sourceName) {
    showToast('数据源不存在', 'error')
    return
  }
  void reloadMetaTree(sourceName, tables)
}

async function persistSave(sqlId: string, fields: VIS.ConfSqlFieldItem[]) {
  states.saveLoading = true
  try {
    await vis.dataset.editDatasetContent({
      id: sqlId,
      sqlContent: states.sqlCode,
      sqlParams: draftParams.value,
      fields,
    })
    dirty.value = false
    showToast('保存成功', 'success')
    markListStale('VisDatasets')
  }
  finally {
    states.saveLoading = false
  }
}

async function handleSave() {
  const gate = saveGate.value
  if (!gate.ok) {
    showToast(gate.reason, 'warning')
    return
  }

  const sqlId = states.info?.id
  if (!sqlId)
    return

  let fields: VIS.ConfSqlFieldItem[] | undefined
  const run = gate.run
  if (run) {
    let saved: VIS.ConfSqlFieldInfo[] = []
    try {
      const res = await vis.dataset.listDatasetFields({ sqlId })
      saved = res.data ?? []
    }
    catch {
      // 已有说明带不上，仍可继续绑定
    }
    const confirmed = await bindFieldsDialogRef.value?.showDialog({
      columns: run.debugInfo.columns ?? [],
      saved,
    })
    if (!confirmed)
      return
    if (!saveGate.value.ok) {
      showToast(saveGate.value.reason, 'warning')
      return
    }
    fields = confirmed
  }

  if (!fields)
    return
  await persistSave(sqlId, fields)
}

function parseExecParams(): Record<string, any> | null {
  try {
    return states.jsonCode ? JSON.parse(states.jsonCode) : {}
  }
  catch (e) {
    logger.error(e)
    showToast('参数格式错误', 'error')
    return null
  }
}

async function requestDebugSql(body: VIS.DebugSqlRequest) {
  const runSource = { sourceSql: body.sqlContent, sourceParams: draftParams.value }
  const currentRequestId = ++requestId
  sqlOutputPanelRef.value?.expand()

  states.runLoading = true

  try {
    const res = await vis.dataset.debugDataset(body)
    if (currentRequestId !== requestId)
      return
    setOutputRun({
      ...buildOutputRun(res.data),
      ...runSource,
    })
  }
  catch (err) {
    if (currentRequestId !== requestId)
      return
    setOutputRun({
      ...buildOutputRun(undefined, extractDebugErrorInfo(err)),
      ...runSource,
    })
  }
  finally {
    if (currentRequestId === requestId) {
      states.runLoading = false
    }
  }
}

function handleOpenParams() {
  if (!states.info) {
    showToast('数据集不存在，无法编辑参数', 'error')
    return
  }
  debugParamsDialogRef.value?.showDialog()
}

function handleRun() {
  if (!states.info) {
    showToast('数据集不存在，无法运行', 'error')
    return
  }
  if (!states.info.id) {
    showToast('数据集不存在，无法运行', 'error')
    return
  }

  const execParams = parseExecParams()
  if (execParams === null)
    return

  void requestDebugSql({
    sqlContent: states.sqlCode,
    execSql: true,
    params: execParams,
    id: states.info.id,
  })
}

useSwipeBackGuard()
const route = useRoute()
function loadConf(id: string) {
  requestId += 1
  states.runLoading = false
  clearOutputRun()
  void fetchConfSql(id, true)
  if (!states.delayInit) {
    nextTick(() => {
      states.delayInit = true
    })
  }
}
onMounted(() => {
  readMetaSideWidth()
  const { id } = route.query
  if (!id) {
    showToast('参数错误', 'error')
    return
  }
  loadConf(id as string)
})
onBeforeRouteUpdate((to) => {
  const id = to.query.id as string
  if (!id) {
    showToast('参数错误', 'error')
    return
  }
  loadConf(id)
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
        :disabled="states.loading || !states.info || !!saveBlockReason"
        :title="saveBlockReason || undefined"
        @click="handleSave"
      >
        保存
      </el-button>
    </template>
    <template #default>
      <div class="h-full flex" :class="{ 'is-resizing': metaSideDragging }">
        <aside
          v-if="metaSideVisible"
          class="meta-side"
          :class="{ 'is-resizing': metaSideDragging }"
          :style="{ width: `${metaSideWidth}px` }"
        >
          <div class="meta-side__header">
            <span>数据源</span>
            <div
              class="meta-side__minus clickable"
              title="关闭面板"
              @click="closeMetaSide"
            >
              <i-mingcute-minimize-line />
            </div>
          </div>
          <div class="meta-side__body" style="--ets-wrap-height: 100%;--ets-header-bg: #f5f7fa;--ets-tools-justify-content:flex-start;">
            <MetaTree
              :infos="states.metaTree"
              :table-options="states.tableOptions"
              :loaded-tables="states.loadedTables"
              :options-loading="states.optionsLoading"
              :meta-loading="states.metaLoading"
              @confirm="handleConfirmTables"
            />
          </div>
          <div
            class="resize-handle resize-handle--col resize-handle--right"
            title="拖动调整宽度"
            @mousedown="onMetaSideResizeStart"
          />
        </aside>
        <div
          v-else
          class="meta-side-collapsed clickable"
          title="打开数据源"
          @click="openMetaSide"
        >
          <span class="i-mingcute-storage-fill" />
        </div>
        <div
          id="configSqlPanel"
          v-spinner="states.loading"
          class="editor-col"
          style="--ets-wrap-height: 100%;--ets-header-bg: #f5f7fa;--ets-tools-justify-content:flex-start; transform: translate(0, 0)"
        >
          <div class="editor-col__main">
            <SqlTemplateEditor
              v-model="states.sqlCode"
              :tools="['COPY', 'FMT', 'FULL']"
              :border="false"
              :resize="false"
              placeholder="请输入sql脚本"
              :sql-meta="states.metaTree"
              :sql-db="sqlDbType"
              :enjoy-constants="ENJOY_CONSTANTS_PRESET"
              :enjoy-methods="ENJOY_METHODS_PRESET"
            >
              <template #tools-prefix>
                <span class="mr-auto pl-5px text-14px color-#303133">{{ editorTitle }}</span>
                <div
                  v-throttle="() => { ruleDocDialog.visible = true }"
                  class="clickable tool-item"
                  title="模板速查"
                >
                  <span class="icon i-mingcute-book-2-line" />
                </div>
              </template>
            </SqlTemplateEditor>
          </div>
          <SqlOutputPanel
            ref="sqlOutputPanelRef"
            :loading="outputLoading"
            :run="states.outputRun"
          >
            <template #actions>
              <el-button
                text
                bg
                size="small"
                :loading="states.runLoading"
                :disabled="!states.info"
                @click="handleRun"
              >
                <span class="output-btn-icon i-mingcute-play-fill" />
                运行
              </el-button>
              <el-button
                text
                bg
                size="small"
                :disabled="!states.info"
                @click="handleOpenParams"
              >
                <span class="output-btn-icon i-mingcute-braces-line" />
                参数
              </el-button>
            </template>
          </SqlOutputPanel>
        </div>
        <DebugParamsDialog
          v-if="states.delayInit"
          ref="debugParamsDialogRef"
          v-model="states.jsonCode"
          :sql-content="states.sqlCode"
          :dataset-id="states.info?.id"
        />
        <BindFieldsDialog ref="bindFieldsDialogRef" />

        <CustomDialog
          v-bind="{ ...ruleDocDialog }"
          v-model.visible="ruleDocDialog.visible"
        >
          <template #custom-dialog-body>
            <SqlRulePanel />
          </template>
        </CustomDialog>
      </div>
    </template>
  </PageCard>
</template>

<style lang="scss" scoped>
.h-full.flex.is-resizing {
  cursor: col-resize;
}

.meta-side {
  position: relative;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  border-right: 1px solid var(--el-border-color-lighter);
  background: #fff;

  &__header {
    flex-shrink: 0;
    height: 32px;
    padding: 0 6px 0 12px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 13px;
    color: var(--el-text-color-primary);
    background: #f5f7fa;
    border-bottom: 1px solid var(--el-border-color-lighter);
  }

  &__minus {
    width: 20px;
    height: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
    border-radius: 4px;
    color: #797a7b;

    &:hover {
      background-color: #dddee1;
    }
  }

  &__body {
    flex: 1;
    min-height: 0;
    overflow: hidden;
  }
}

.meta-side-collapsed {
  flex-shrink: 0;
  width: 40px;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding-top: 10px;
  box-sizing: border-box;
  background: #f5f7fa;
  border-right: 1px solid var(--el-border-color-lighter);
  color: #606266;
  font-size: 20px;

  &:hover {
    color: #303133;
    background: #ebedf0;
  }
}

.editor-col {
  flex: 1;
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;

  &__main {
    flex: 1;
    min-height: 0;
    overflow: hidden;
  }
}

.output-btn-icon {
  margin-right: 4px;
  font-size: 16px;
}
</style>
