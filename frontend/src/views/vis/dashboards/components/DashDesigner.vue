<!--
 * @Description: 嵌入式看板设计器
-->
<script setup lang="ts">
import type { FormInstance, FormRules } from 'element-plus'
import type { DashFilterValues, DashSettingsDraft, VisDashFilterDef } from '../dashApi'
import type { DashGroupDraft, DashWidget } from '../dashLayout'
import type { DashCardRadiusId, DashThemeId } from '../dashTheme'
import type { VisCard } from '@/views/vis/shared/types'
import vis from '@/apis/vis/index'
import { useLeaveConfirm } from '@/hooks/leaveConfirm'
import { useSwipeBackGuard } from '@/hooks/swipeBack'
import { useAccountStore } from '@/stores/modules/account'
import { showConfirm, showToast } from '@/utils/index'
import { fromVisCardInfo } from '@/views/vis/cards/cardApi'
import MenuIconPicker from '@/views/permission/menu/components/MenuIconPicker.vue'
import { apiErrorMessage } from '@/views/vis/shared/visRequest'
import { dashCardDefaultSize, DASH_DESIGNER_ID, FUNCTION_DASHBOARD_CONF } from '../config'
import {
  applyFilterDefaults,
  applyFilterDefaultsFromSettings,
  globalsForCard,
  loadDashboardWidgets,
  saveDashboard,
} from '../dashApi'
import {
  addCardsToRoot,
  applyGroupDraft,
  collectCardIds,
  createGroupFromDraft,
  dissolveGroup,
  draftFromGroup,
  emptyGroupDraft,
  listGroups,
  moveCardToGroup,
  moveCardToRoot,
  removeCardFromTree,
} from '../dashLayout'
import { captureDashPreview, saveDashScreenshot } from '../dashScreenshot'
import { dashThemeVars, DEFAULT_DASH_CARD_RADIUS, DEFAULT_DASH_THEME } from '../dashTheme'
import { useDashRefresh } from '../useDashRefresh'
import CardPickerDialog from './CardPickerDialog.vue'
import DashFilterBar from './DashFilterBar.vue'
import DashGrid from './DashGrid.vue'
import DashGroupEditor from './DashGroupEditor.vue'
import DashGroupTreeSelect from './DashGroupTreeSelect.vue'
import DashSettingsDialog from './DashSettingsDialog.vue'

export interface DashDesignerSavedPayload {
  id: string
  name: string
  groupId: string
  status: 'EBL' | 'DBL'
  icon?: string
}

export interface DashDesignerInstance {
  beforeSwitch: () => Promise<boolean>
  confirmDiscard: () => Promise<boolean>
  load: () => Promise<void>
  updateMeta: (meta: Partial<Omit<DashDesignerSavedPayload, 'id'>> & { desc?: string }) => void
}

const props = defineProps<{
  dashboardId: string
}>()

const emit = defineEmits<{
  saved: [payload: DashDesignerSavedPayload]
}>()

const { hasFunction } = useAccountStore()
const canWrite = hasFunction(FUNCTION_DASHBOARD_CONF)
const router = useRouter()

const loading = ref(false)
const adding = ref(false)
const saveLoading = ref(false)
const pickerOpen = ref(false)
const groupEditorOpen = ref(false)
const groupEditorId = ref('')
const groupEditorInitial = ref<DashGroupDraft>(emptyGroupDraft())
const groupEditorLoading = ref(false)
const moveOpen = ref(false)
const moveCardId = ref('')
const moveGroupId = ref('')
const settingsOpen = ref(false)
const saveOpen = ref(false)
const saveFormRef = ref<FormInstance>()
const reloading = ref(false)
const capturing = ref(false)

const states = reactive({
  id: '',
  name: '',
  status: 'EBL' as 'EBL' | 'DBL',
  desc: '',
  icon: '',
  groupId: '0',
})
const widgets = ref<DashWidget[]>([])
const cardMap = ref<Record<string, VisCard>>({})
const filters = ref<VisDashFilterDef[]>([])
const configExtra = ref<Record<string, unknown>>({})
const filterValues = ref<DashFilterValues>({})
const theme = ref<DashThemeId>(DEFAULT_DASH_THEME)
const cardRadius = ref<DashCardRadiusId>(DEFAULT_DASH_CARD_RADIUS)
const autoRefreshSec = ref<number>()
const groupTree = ref<VIS.DashGroupInfo[]>([])
const baselineSnapshot = ref('')

const saveForm = reactive({
  name: '',
  desc: '',
  icon: '',
  status: 'EBL' as 'EBL' | 'DBL',
  groupId: '0',
})
const saveRules: FormRules<typeof saveForm> = {
  name: [{ required: true, trigger: 'blur', message: '请填写看板名称' }],
}

const themeStyle = computed(() => dashThemeVars(theme.value, cardRadius.value))
const { refreshCards, refreshTick } = useDashRefresh()
const excludeIds = computed(() => collectCardIds(widgets.value))
const cards = computed(() => Object.values(cardMap.value))
const groups = computed(() => listGroups(widgets.value))

function currentSnapshot() {
  return JSON.stringify({
    id: states.id,
    name: states.name,
    status: states.status,
    desc: states.desc,
    icon: states.icon,
    groupId: states.groupId,
    filters: filters.value,
    theme: theme.value,
    cardRadius: cardRadius.value,
    autoRefreshSec: autoRefreshSec.value ?? null,
    extra: configExtra.value,
    widgets: widgets.value,
  })
}

const dirty = computed(() => Boolean(states.id && baselineSnapshot.value && currentSnapshot() !== baselineSnapshot.value))
const { confirmLeave } = useLeaveConfirm(undefined, undefined, () => dirty.value)

function captureSnapshot() {
  baselineSnapshot.value = currentSnapshot()
}

function resetEmpty() {
  states.id = ''
  states.name = ''
  states.status = 'EBL'
  states.desc = ''
  states.icon = ''
  states.groupId = '0'
  filters.value = []
  configExtra.value = {}
  theme.value = DEFAULT_DASH_THEME
  cardRadius.value = DEFAULT_DASH_CARD_RADIUS
  autoRefreshSec.value = undefined
  filterValues.value = {}
  widgets.value = []
  cardMap.value = {}
  captureSnapshot()
}

let loadRequestId = 0
async function loadDashboard() {
  const dashboardId = String(props.dashboardId || '')
  const currentRequestId = ++loadRequestId
  if (!dashboardId) {
    loading.value = false
    resetEmpty()
    return
  }
  baselineSnapshot.value = ''
  loading.value = true
  try {
    const res = await vis.query.getDashboardDetail({ dashboardId })
    if (currentRequestId !== loadRequestId)
      return
    if (!res.data)
      throw new Error('看板不存在')
    const loaded = await loadDashboardWidgets(res.data)
    if (currentRequestId !== loadRequestId)
      return
    states.id = String(res.data.id || dashboardId)
    states.name = res.data.dashName || '未命名看板'
    states.status = res.data.status === 'DBL' ? 'DBL' : 'EBL'
    states.desc = res.data.dashDesc || ''
    states.icon = res.data.icon || ''
    states.groupId = res.data.groupId && res.data.groupId !== '0' ? String(res.data.groupId) : '0'
    filterValues.value = applyFilterDefaults(loaded.filters, {})
    filters.value = loaded.filters
    theme.value = loaded.theme
    cardRadius.value = loaded.cardRadius
    autoRefreshSec.value = loaded.autoRefreshSec
    configExtra.value = loaded.extra
    widgets.value = loaded.widgets
    cardMap.value = loaded.cardMap
    captureSnapshot()
  }
  catch (e) {
    if (currentRequestId !== loadRequestId)
      return
    showToast(apiErrorMessage(e, '看板不存在'), 'error')
    resetEmpty()
  }
  finally {
    if (currentRequestId === loadRequestId)
      loading.value = false
  }
}

function fetchGroups() {
  vis.dashboard.listDashGroupTree().then((res) => {
    groupTree.value = res.data?.list ?? []
  })
}

function globalsOf(card: VisCard) {
  return globalsForCard(filters.value, filterValues.value, card.query.datasetId)
}

watch(
  () => filters.value.map(item => item.uid).join(','),
  (_curr, prev) => {
    filterValues.value = applyFilterDefaults(
      filters.value,
      filterValues.value,
      prev ? prev.split(',').filter(Boolean) : [],
    )
  },
)

async function resolveCard(info: VIS.VisCardInfo) {
  const cardId = String(info.id || '')
  try {
    const res = await vis.query.getCardDetail({ cardId })
    if (res.data)
      return fromVisCardInfo(res.data)
  }
  catch {
    // 列表行兜底
  }
  return fromVisCardInfo(info)
}

function rememberCards(list: VisCard[]) {
  const next = { ...cardMap.value }
  for (const card of list)
    next[card.id] = card
  cardMap.value = next
}

async function addCards(list: VIS.VisCardInfo[]) {
  const used = new Set(collectCardIds(widgets.value))
  const selected = list.filter(info => Boolean(info.id && !used.has(String(info.id))))
  if (!selected.length)
    return
  adding.value = true
  try {
    const nextCards = await Promise.all(selected.map(resolveCard))
    rememberCards(nextCards)
    const sizeById = new Map(nextCards.map(card => [card.id, dashCardDefaultSize(card.visual.chartType)]))
    widgets.value = addCardsToRoot(widgets.value, nextCards.map(card => card.id), id => sizeById.get(id))
  }
  catch (e) {
    showToast(apiErrorMessage(e, '添加卡片失败'), 'error')
  }
  finally {
    adding.value = false
  }
}

function addGroup() {
  groupEditorId.value = ''
  groupEditorInitial.value = emptyGroupDraft()
  groupEditorOpen.value = true
}

function configureGroup(groupId: string) {
  const group = groups.value.find(item => item.id === groupId)
  if (!group)
    return
  groupEditorId.value = groupId
  groupEditorInitial.value = draftFromGroup(group, cardId => cardMap.value[cardId]?.name || cardId)
  groupEditorOpen.value = true
}

async function onGroupEditorConfirm(draft: DashGroupDraft) {
  groupEditorLoading.value = true
  try {
    widgets.value = groupEditorId.value
      ? applyGroupDraft(widgets.value, groupEditorId.value, draft)
      : createGroupFromDraft(widgets.value, draft)
    groupEditorOpen.value = false
  }
  catch (e) {
    showToast(apiErrorMessage(e, '保存分组失败'), 'error')
  }
  finally {
    groupEditorLoading.value = false
  }
}

function removeCard(cardId: string) {
  const target = cardMap.value[cardId]
  showConfirm(`确定从看板移除「${target?.name || cardId}」吗？`, '移除确认', 'warning', () => {
    widgets.value = removeCardFromTree(widgets.value, cardId)
    const next = { ...cardMap.value }
    delete next[cardId]
    cardMap.value = next
  })
}

function detachCard(cardId: string) {
  widgets.value = moveCardToRoot(widgets.value, cardId)
}

function openMoveToGroup(cardId: string) {
  if (!groups.value.length) {
    showToast('请先添加分组', 'warning')
    return
  }
  if (groups.value.length === 1) {
    widgets.value = moveCardToGroup(widgets.value, cardId, groups.value[0]!.id)
    return
  }
  moveCardId.value = cardId
  moveGroupId.value = groups.value[0]!.id
  moveOpen.value = true
}

function confirmMoveToGroup() {
  if (!moveCardId.value || !moveGroupId.value)
    return
  widgets.value = moveCardToGroup(widgets.value, moveCardId.value, moveGroupId.value)
  moveOpen.value = false
}

function dissolveCurrentGroup() {
  if (!groupEditorId.value)
    return
  widgets.value = dissolveGroup(widgets.value, groupEditorId.value)
  groupEditorOpen.value = false
}

function confirmReloadCards() {
  showConfirm(
    '将还原为上次保存的布局，并用服务端内容覆盖每张卡片，确定？',
    '重载卡片',
    'warning',
    () => void reloadCards(),
  )
}

async function reloadCards() {
  if (!states.id)
    return
  const dashboardId = states.id
  reloading.value = true
  try {
    const res = await vis.query.getDashboardDetail({ dashboardId }, { showErrorMessage: false })
    if (!res.data || dashboardId !== states.id)
      return
    const loaded = await loadDashboardWidgets(res.data)
    if (dashboardId !== states.id)
      return
    widgets.value = loaded.widgets
    cardMap.value = loaded.cardMap
    refreshCards()
  }
  catch (e) {
    showToast(apiErrorMessage(e, '重载失败'), 'error')
  }
  finally {
    reloading.value = false
  }
}

async function onScreenshot() {
  if (capturing.value || loading.value)
    return
  const root = document.getElementById(DASH_DESIGNER_ID)
  if (!root) {
    showToast('截屏失败', 'error')
    return
  }
  capturing.value = true
  await nextTick()
  try {
    const blob = await captureDashPreview(root)
    saveDashScreenshot(blob, states.name)
    showToast('截屏已保存')
  }
  catch {
    showToast('截屏失败', 'error')
  }
  finally {
    capturing.value = false
  }
}

function openPreview() {
  if (!states.id)
    return
  const href = router.resolve({
    name: 'VisDashboardView',
    query: { id: states.id },
  }).href
  window.open(href, '_blank')
}

function openSaveDialog() {
  fetchGroups()
  saveForm.name = states.name.trim()
  saveForm.desc = states.desc.trim()
  saveForm.icon = states.icon
  saveForm.status = states.status
  saveForm.groupId = states.groupId || '0'
  saveOpen.value = true
}

async function handleSave() {
  const name = saveForm.name.trim()
  if (!name || !states.id)
    return
  const dashboardId = states.id
  const desc = saveForm.desc.trim()
  const icon = saveForm.icon || ''
  const status = saveForm.status
  const groupId = saveForm.groupId || '0'
  const savedState = JSON.parse(currentSnapshot()) as Record<string, unknown>
  Object.assign(savedState, { name, desc, icon, status, groupId })
  const savedSnapshot = JSON.stringify(savedState)
  saveLoading.value = true
  try {
    const savedId = await saveDashboard({
      id: dashboardId,
      name,
      status,
      desc,
      icon,
      groupId,
      filters: filters.value,
      theme: theme.value,
      cardRadius: cardRadius.value,
      autoRefreshSec: autoRefreshSec.value,
      extra: configExtra.value,
      widgets: widgets.value,
    })
    if (props.dashboardId === dashboardId && states.id === dashboardId) {
      states.name = name
      states.desc = desc
      states.icon = icon
      states.status = status
      states.groupId = groupId
      states.id = savedId
      saveOpen.value = false
      baselineSnapshot.value = savedSnapshot
    }
    showToast('保存成功', 'success')
    emit('saved', {
      id: savedId,
      name,
      groupId,
      status,
      icon,
    })
  }
  catch (e) {
    showToast(apiErrorMessage(e, '保存失败'), 'error')
  }
  finally {
    saveLoading.value = false
  }
}

function confirmSave() {
  saveFormRef.value?.validate((valid) => {
    if (valid)
      void handleSave()
  })
}

function onSettingsConfirm(draft: DashSettingsDraft) {
  filterValues.value = applyFilterDefaultsFromSettings(draft.filters, filters.value, filterValues.value)
  filters.value = draft.filters
  theme.value = draft.theme
  cardRadius.value = draft.cardRadius
  autoRefreshSec.value = draft.autoRefreshSec
}

async function beforeSwitch() {
  return confirmLeave()
}

function updateMeta(meta: Partial<Omit<DashDesignerSavedPayload, 'id'>> & { desc?: string }) {
  if (meta.name !== undefined)
    states.name = meta.name
  if (meta.groupId !== undefined)
    states.groupId = meta.groupId || '0'
  if (meta.status !== undefined)
    states.status = meta.status
  if (meta.desc !== undefined)
    states.desc = meta.desc
  if (meta.icon !== undefined)
    states.icon = meta.icon

  if (!baselineSnapshot.value)
    return
  try {
    const baseline = JSON.parse(baselineSnapshot.value) as Record<string, unknown>
    if (meta.name !== undefined)
      baseline.name = meta.name
    if (meta.groupId !== undefined)
      baseline.groupId = meta.groupId || '0'
    if (meta.status !== undefined)
      baseline.status = meta.status
    if (meta.desc !== undefined)
      baseline.desc = meta.desc
    if (meta.icon !== undefined)
      baseline.icon = meta.icon
    baselineSnapshot.value = JSON.stringify(baseline)
  }
  catch {
    captureSnapshot()
  }
}

watch(() => props.dashboardId, () => void loadDashboard(), { immediate: true })
useSwipeBackGuard()

defineExpose<DashDesignerInstance>({
  beforeSwitch,
  confirmDiscard: beforeSwitch,
  load: loadDashboard,
  updateMeta,
})
</script>

<template>
  <section
    :id="DASH_DESIGNER_ID"
    v-spinner="adding || reloading"
    class="designer"
    :class="{ 'is-loading': loading }"
  >
    <div class="designer__stage" :style="themeStyle">
      <el-scrollbar class="designer__canvas">
        <div class="designer__chrome">
          <DashFilterBar
            v-model:values="filterValues"
            v-model:theme="theme"
            :title="states.name"
            :desc="states.desc"
            :defs="filters"
            :show-design="canWrite"
            :adding="adding"
            :loading="loading"
            :dirty="dirty"
            :preview-disabled="!states.id"
            :screenshotting="capturing || loading"
            :save-loading="saveLoading"
            :save-disabled="!states.id"
            @refresh="refreshCards"
            @reload-cards="confirmReloadCards"
            @preview="openPreview"
            @screenshot="onScreenshot"
            @add-card="pickerOpen = true"
            @add-group="addGroup"
            @settings="settingsOpen = true"
            @save="openSaveDialog"
          />
        </div>
        <div class="designer__body">
          <DashGrid
            v-model:widgets="widgets"
            :cards="cardMap"
            :dashboard-id="states.id"
            :globals-of="globalsOf"
            :data-tick="refreshTick"
            :editable="canWrite"
            :design-actions="canWrite"
            show-sql
            @remove="removeCard"
            @detach="detachCard"
            @move-to-group="openMoveToGroup"
            @configure-group="configureGroup"
          />
        </div>
      </el-scrollbar>
    </div>
  </section>

  <CardPickerDialog
    v-model:visible="pickerOpen"
    :exclude-ids="excludeIds"
    @confirm="addCards"
  />
  <DashGroupEditor
    v-model:visible="groupEditorOpen"
    :initial="groupEditorInitial"
    :cards="cardMap"
    :allow-delete="!!groupEditorId"
    :confirm-loading="groupEditorLoading"
    @confirm="onGroupEditorConfirm"
    @remove="dissolveCurrentGroup"
  />
  <CustomDialog
    v-model:visible="moveOpen"
    title="移入分组"
    size="mini"
    append-to-body
    cancel-text="取消"
    confirm-text="确定"
    :handler-cancel="() => moveOpen = false"
    :handler-confirm="confirmMoveToGroup"
  >
    <template #custom-dialog-body>
      <el-form label-position="top">
        <el-form-item label="分组">
          <el-select v-model="moveGroupId">
            <el-option
              v-for="group in groups"
              :key="group.id"
              :label="group.title || '未命名分组'"
              :value="group.id"
            />
          </el-select>
        </el-form-item>
      </el-form>
    </template>
  </CustomDialog>
  <DashSettingsDialog
    v-model:visible="settingsOpen"
    :filters="filters"
    :theme="theme"
    :card-radius="cardRadius"
    :auto-refresh-sec="autoRefreshSec"
    :cards="cards"
    @confirm="onSettingsConfirm"
  />
  <CustomDialog
    v-model:visible="saveOpen"
    title="保存看板"
    size="mini"
    append-to-body
    cancel-text="取消"
    confirm-text="确定"
    :confirm-loading="saveLoading"
    :handler-cancel="() => saveOpen = false"
    :handler-confirm="confirmSave"
    @closed="saveFormRef?.clearValidate()"
  >
    <template #custom-dialog-body>
      <el-form
        ref="saveFormRef"
        class="dash-save-form"
        :model="saveForm"
        :rules="saveRules"
        label-position="top"
      >
        <el-form-item label="看板名称" prop="name">
          <el-input v-model="saveForm.name" maxlength="50" clearable />
        </el-form-item>
        <el-form-item label="报表分组">
          <DashGroupTreeSelect
            v-model="saveForm.groupId"
            :data="groupTree"
            root-label="报表中心"
            :clearable="false"
          />
        </el-form-item>
        <el-form-item label="图标">
          <MenuIconPicker v-model="saveForm.icon" />
        </el-form-item>
        <el-form-item label="看板描述" prop="desc">
          <el-input
            v-model="saveForm.desc"
            type="textarea"
            :rows="3"
            maxlength="200"
            show-word-limit
          />
        </el-form-item>
        <el-form-item class="dash-save-status" label="状态" prop="status">
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

<style scoped lang="scss">
@use '../dashPage' as dash;

.designer {
  display: flex;
  flex: 1;
  flex-direction: column;
  height: 100%;
  min-width: 0;
  min-height: 0;

  &.is-loading .designer__stage {
    pointer-events: none;
  }
}

.designer__stage {
  @include dash.design-tokens;
  @include dash.shell;

  flex: 1;
  min-height: 0;
  background: var(--dash-canvas-bg, var(--el-fill-color));
}

.designer__chrome {
  @include dash.chrome-sticky;
}

.designer__canvas {
  @include dash.canvas;
}

.designer__body {
  @include dash.body;
}

.dash-save-form {
  :deep(.el-form-item) {
    margin-bottom: 12px;
  }

  :deep(.el-form-item__label) {
    height: auto;
    margin-bottom: 0;
    padding-bottom: 4px;
    line-height: 1.2;
  }

  :deep(.el-form-item:last-child) {
    margin-bottom: 0;
  }
}
</style>
