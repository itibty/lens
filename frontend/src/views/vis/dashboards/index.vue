<!--
 * @Description: 看板树与嵌入式设计器
-->
<script setup name="VisDashboards" lang="ts">
import type { FormInstance, FormRules } from 'element-plus'
import type { DashDesignerInstance, DashDesignerSavedPayload } from './components/DashDesigner.vue'
import type { DashExplorerTreeInstance } from './components/DashExplorerTree.vue'
import type { DashManageNode } from './dashManage'
import vis from '@/apis/vis/index'
import { useAutoFoldSidebar } from '@/hooks/layout'
import { useAccountStore } from '@/stores/modules/account'
import { showConfirm, showToast } from '@/utils/index'
import MenuIconPicker from '@/views/permission/menu/components/MenuIconPicker.vue'
import { apiErrorMessage } from '@/views/vis/shared/visRequest'
import DashDesigner from './components/DashDesigner.vue'
import DashExplorerTree from './components/DashExplorerTree.vue'
import DashGroupTreeSelect from './components/DashGroupTreeSelect.vue'
import { FUNCTION_DASHBOARD_WRITE } from './config'
import { normalizeDashManageNodes } from './dashManage'

defineOptions({ name: 'VisDashboards' })

type ExplorerCommand
  = | 'add-child-group'
    | 'add-dashboard'
    | 'edit-group'
    | 'toggle-group'
    | 'delete-group'
    | 'edit-dashboard'
    | 'preview-dashboard'
    | 'move-dashboard'
    | 'toggle-dashboard'
    | 'delete-dashboard'

const UNGROUPED_ID = '0'
const router = useRouter()
const { hasFunction } = useAccountStore()
const canWrite = hasFunction(FUNCTION_DASHBOARD_WRITE)
useAutoFoldSidebar()

const designerRef = ref<DashDesignerInstance>()
const explorerRef = ref<DashExplorerTreeInstance>()
const treeData = ref<DashManageNode[]>([])
const treeLoading = ref(false)
const actionLoading = ref(false)
const selectedId = ref('')

const groupDialogOpen = ref(false)
const groupDialogTitle = ref('新增分组')
const groupFormRef = ref<FormInstance>()
const groupForm = reactive<VIS.SaveDashGroupRequest>({
  id: undefined,
  pid: UNGROUPED_ID,
  groupName: '',
  icon: '',
  sortNum: 0,
  status: 'EBL',
})
const groupRules: FormRules<VIS.SaveDashGroupRequest> = {
  groupName: [{ required: true, trigger: 'blur', message: '请输入分组名称' }],
}

const dashboardDialogOpen = ref(false)
const dashboardDialogMode = ref<'create' | 'edit'>('create')
const dashboardFormRef = ref<FormInstance>()
const dashboardForm = reactive({
  id: '',
  dashName: '',
  dashDesc: '',
  status: 'EBL' as 'EBL' | 'DBL',
  groupId: UNGROUPED_ID,
})
const dashboardRules: FormRules<typeof dashboardForm> = {
  dashName: [{ required: true, trigger: 'blur', message: '请输入看板名称' }],
}

const moveDialogOpen = ref(false)
const moveTarget = ref<DashManageNode>()
const moveGroupId = ref(UNGROUPED_ID)
let detailRequestId = 0

function cancelDashboardDetailRequest() {
  detailRequestId++
}

function flattenDashboards(nodes: DashManageNode[], out: DashManageNode[] = []) {
  for (const node of nodes) {
    if (node.nodeType === 'DASH')
      out.push(node)
    if (node.children?.length)
      flattenDashboards(node.children, out)
  }
  return out
}

function toGroupTree(nodes: DashManageNode[]): VIS.DashGroupInfo[] {
  const groups: VIS.DashGroupInfo[] = []
  for (const node of nodes) {
    if (node.nodeType !== 'GROUP')
      continue
    if (node.virtual || node.id === UNGROUPED_ID) {
      groups.push(...toGroupTree(node.children ?? []))
      continue
    }
    groups.push({
      id: node.id,
      pid: node.pid || UNGROUPED_ID,
      groupName: node.name,
      icon: node.icon,
      status: node.status,
      children: toGroupTree(node.children ?? []),
    })
  }
  return groups
}

const groupTree = computed(() => toGroupTree(treeData.value))

function setSelected(id: string) {
  selectedId.value = id
}

let switching = false
async function selectDashboard(id: string, confirmed = false) {
  if (!id || id === selectedId.value)
    return true
  if (switching)
    return false
  switching = true
  try {
    if (!confirmed && designerRef.value && !(await designerRef.value.beforeSwitch()))
      return false
    setSelected(id)
    return true
  }
  finally {
    switching = false
  }
}

let treeRequestId = 0
async function refreshTree(preferId?: string, fallbackIds: string[] = [], selectionConfirmed = false) {
  const currentRequestId = ++treeRequestId
  treeLoading.value = true
  try {
    const res = await vis.dashboard.listDashboardManageTree()
    if (currentRequestId !== treeRequestId)
      return
    treeData.value = normalizeDashManageNodes(res.data?.list)
    const dashes = flattenDashboards(treeData.value)
    const candidates = [preferId, selectedId.value, ...fallbackIds].filter(Boolean) as string[]
    const nextId = candidates.find(id => dashes.some(node => node.id === id)) || dashes[0]?.id || ''
    if (!selectedId.value) {
      setSelected(nextId)
    }
    else if (nextId !== selectedId.value) {
      if (nextId)
        await selectDashboard(nextId, selectionConfirmed)
      else
        await clearSelection(selectionConfirmed)
    }
    explorerRef.value?.setCurrentDashboard(selectedId.value)
  }
  catch (e) {
    if (currentRequestId === treeRequestId)
      showToast(apiErrorMessage(e, '加载看板树失败'), 'error')
  }
  finally {
    if (currentRequestId === treeRequestId)
      treeLoading.value = false
  }
}

async function clearSelection(confirmed = false) {
  if (!selectedId.value)
    return true
  if (!confirmed && designerRef.value && !(await designerRef.value.beforeSwitch()))
    return false
  setSelected('')
  return true
}

async function onTreeSelect(node: DashManageNode) {
  cancelDashboardDetailRequest()
  const changed = await selectDashboard(node.id)
  if (!changed)
    explorerRef.value?.setCurrentDashboard(selectedId.value)
}

function resetGroupForm(partial: Partial<VIS.SaveDashGroupRequest> = {}) {
  groupForm.id = partial.id
  groupForm.pid = partial.pid ?? UNGROUPED_ID
  groupForm.groupName = partial.groupName ?? ''
  groupForm.icon = partial.icon ?? ''
  groupForm.sortNum = partial.sortNum ?? 0
  groupForm.status = partial.status ?? 'EBL'
}

function openGroupDialog(node?: DashManageNode, edit = false) {
  cancelDashboardDetailRequest()
  if (edit && node) {
    groupDialogTitle.value = '编辑分组'
    resetGroupForm({
      id: node.id,
      pid: node.pid || UNGROUPED_ID,
      groupName: node.name,
      icon: node.icon,
      sortNum: node.sortNum,
      status: node.status,
    })
  }
  else {
    groupDialogTitle.value = node ? '新增子分组' : '新增根分组'
    resetGroupForm({ pid: node?.id || UNGROUPED_ID })
  }
  groupDialogOpen.value = true
}

function submitGroup() {
  groupFormRef.value?.validate(async (valid) => {
    if (!valid)
      return
    actionLoading.value = true
    try {
      const res = await vis.dashboard.editDashGroup({
        id: groupForm.id,
        pid: groupForm.pid || UNGROUPED_ID,
        groupName: groupForm.groupName.trim(),
        icon: groupForm.icon || undefined,
        sortNum: groupForm.sortNum ?? 0,
        status: groupForm.status,
      })
      groupDialogOpen.value = false
      showToast(res.msg || '保存成功', 'success')
      await refreshTree(selectedId.value)
    }
    catch (e) {
      showToast(apiErrorMessage(e, '保存分组失败'), 'error')
    }
    finally {
      actionLoading.value = false
    }
  })
}

function openCreateDashboard(groupId = UNGROUPED_ID) {
  cancelDashboardDetailRequest()
  dashboardDialogMode.value = 'create'
  dashboardForm.id = ''
  dashboardForm.dashName = ''
  dashboardForm.dashDesc = ''
  dashboardForm.status = 'EBL'
  dashboardForm.groupId = groupId || UNGROUPED_ID
  dashboardDialogOpen.value = true
}

async function openEditDashboard(node: DashManageNode) {
  const currentRequestId = ++detailRequestId
  actionLoading.value = true
  try {
    const res = await vis.dashboard.getDashboardDetail({ dashboardId: node.id })
    if (currentRequestId !== detailRequestId || !res.data)
      return
    dashboardDialogMode.value = 'edit'
    dashboardForm.id = node.id
    dashboardForm.dashName = res.data.dashName || node.name
    dashboardForm.dashDesc = res.data.dashDesc || ''
    dashboardForm.status = res.data.status === 'DBL' ? 'DBL' : 'EBL'
    dashboardForm.groupId = res.data.groupId || node.groupId || UNGROUPED_ID
    dashboardDialogOpen.value = true
  }
  catch (e) {
    showToast(apiErrorMessage(e, '加载看板信息失败'), 'error')
  }
  finally {
    if (currentRequestId === detailRequestId)
      actionLoading.value = false
  }
}

function submitDashboard() {
  dashboardFormRef.value?.validate(async (valid) => {
    if (!valid)
      return
    if (dashboardDialogMode.value === 'create') {
      const canSwitch = !designerRef.value || await designerRef.value.beforeSwitch()
      if (!canSwitch)
        return
    }
    actionLoading.value = true
    try {
      const groupId = dashboardForm.groupId || UNGROUPED_ID
      if (dashboardDialogMode.value === 'create') {
        const res = await vis.dashboard.editDashboard({
          dashName: dashboardForm.dashName.trim(),
          dashDesc: dashboardForm.dashDesc.trim(),
          status: dashboardForm.status,
          groupId,
          cards: [],
        })
        const newId = res.data != null ? String(res.data) : ''
        if (!newId)
          throw new Error('创建看板失败')
        dashboardDialogOpen.value = false
        showToast(res.msg || '创建成功', 'success')
        await refreshTree(newId, [], true)
      }
      else {
        await vis.dashboard.editDashboardMeta({
          id: dashboardForm.id,
          dashName: dashboardForm.dashName.trim(),
          dashDesc: dashboardForm.dashDesc.trim(),
          groupId,
        })
        dashboardDialogOpen.value = false
        if (dashboardForm.id === selectedId.value) {
          designerRef.value?.updateMeta({
            name: dashboardForm.dashName.trim(),
            desc: dashboardForm.dashDesc.trim(),
            groupId,
          })
        }
        showToast('保存成功', 'success')
        await refreshTree(selectedId.value)
      }
    }
    catch (e) {
      showToast(apiErrorMessage(e, dashboardDialogMode.value === 'create' ? '创建看板失败' : '保存看板信息失败'), 'error')
    }
    finally {
      actionLoading.value = false
    }
  })
}

function previewDashboard(node: DashManageNode) {
  const href = router.resolve({
    name: 'VisDashboardView',
    query: { id: node.id },
  }).href
  window.open(href, '_blank')
}

function openMoveDashboard(node: DashManageNode) {
  cancelDashboardDetailRequest()
  moveTarget.value = node
  moveGroupId.value = node.groupId || node.pid || UNGROUPED_ID
  moveDialogOpen.value = true
}

async function submitMoveDashboard() {
  const node = moveTarget.value
  if (!node)
    return
  actionLoading.value = true
  try {
    const groupId = moveGroupId.value || UNGROUPED_ID
    const res = await vis.dashboard.moveDashboardsGroup({
      dashboardIds: [node.id],
      groupId,
    })
    moveDialogOpen.value = false
    if (node.id === selectedId.value)
      designerRef.value?.updateMeta({ groupId })
    showToast(res.msg || '移动成功', 'success')
    await refreshTree(selectedId.value)
  }
  catch (e) {
    showToast(apiErrorMessage(e, '移动看板失败'), 'error')
  }
  finally {
    actionLoading.value = false
  }
}

function toggleGroup(node: DashManageNode) {
  const action = node.status === 'EBL' ? '禁用' : '启用'
  showConfirm(`确定${action}分组「${node.name}」吗？`, `${action}确认`, 'warning', () => {
    void (async () => {
      try {
        const res = await vis.dashboard.toggleDashGroupStatus({ groupId: node.id })
        showToast(res.msg || `${action}成功`, 'success')
        await refreshTree(selectedId.value)
      }
      catch (e) {
        showToast(apiErrorMessage(e, `${action}分组失败`), 'error')
      }
    })()
  })
}

function deleteGroup(node: DashManageNode) {
  showConfirm(`确定删除分组「${node.name}」吗？`, '删除确认', 'warning', () => {
    void (async () => {
      try {
        const res = await vis.dashboard.delDashGroup({ groupId: node.id })
        showToast(res.msg || '删除成功', 'success')
        await refreshTree(selectedId.value)
      }
      catch (e) {
        showToast(apiErrorMessage(e, '删除分组失败'), 'error')
      }
    })()
  })
}

function toggleDashboard(node: DashManageNode) {
  const action = node.status === 'EBL' ? '禁用' : '启用'
  showConfirm(`确定${action}看板「${node.name}」吗？`, `${action}确认`, 'warning', () => {
    void (async () => {
      try {
        const res = await vis.dashboard.toggleDashboardStatus({ dashboardId: node.id })
        if (node.id === selectedId.value)
          designerRef.value?.updateMeta({ status: node.status === 'EBL' ? 'DBL' : 'EBL' })
        showToast(res.msg || `${action}成功`, 'success')
        await refreshTree(selectedId.value)
      }
      catch (e) {
        showToast(apiErrorMessage(e, `${action}看板失败`), 'error')
      }
    })()
  })
}

async function deleteDashboard(node: DashManageNode) {
  if (node.id === selectedId.value && designerRef.value && !(await designerRef.value.beforeSwitch()))
    return
  const dashes = flattenDashboards(treeData.value)
  const index = dashes.findIndex(item => item.id === node.id)
  const fallbackIds = [
    dashes[index + 1]?.id,
    dashes[index - 1]?.id,
  ].filter(Boolean) as string[]
  showConfirm(`确定删除看板「${node.name}」吗？`, '删除确认', 'warning', () => {
    void (async () => {
      try {
        const res = await vis.dashboard.delDashboard({ ids: [node.id] })
        showToast(res.msg || '删除成功', 'success')
        await refreshTree(node.id === selectedId.value ? undefined : selectedId.value, fallbackIds, true)
      }
      catch (e) {
        showToast(apiErrorMessage(e, '删除看板失败'), 'error')
      }
    })()
  })
}

function onTreeCommand(command: ExplorerCommand, node: DashManageNode) {
  if (command !== 'edit-dashboard')
    cancelDashboardDetailRequest()
  if (command === 'add-child-group')
    openGroupDialog(node)
  else if (command === 'add-dashboard')
    openCreateDashboard(node.id)
  else if (command === 'edit-group')
    openGroupDialog(node, true)
  else if (command === 'toggle-group')
    toggleGroup(node)
  else if (command === 'delete-group')
    deleteGroup(node)
  else if (command === 'edit-dashboard')
    void openEditDashboard(node)
  else if (command === 'preview-dashboard')
    previewDashboard(node)
  else if (command === 'move-dashboard')
    openMoveDashboard(node)
  else if (command === 'toggle-dashboard')
    toggleDashboard(node)
  else if (command === 'delete-dashboard')
    void deleteDashboard(node)
}

function onDesignerSaved(payload: DashDesignerSavedPayload) {
  void refreshTree(selectedId.value || payload.id)
}

onMounted(() => {
  void refreshTree()
})
</script>

<template>
  <div class="dashboards-route">
    <PageCard
      :show-header="false"
      :scroll-content="false"
      :provide-scope="false"
      class="dashboards-page"
    >
      <div class="dashboards-layout">
        <DashExplorerTree
          ref="explorerRef"
          :data="treeData"
          :loading="treeLoading"
          :can-write="canWrite"
          @select="onTreeSelect"
          @command="onTreeCommand"
          @add-root-group="openGroupDialog()"
          @add-ungrouped-dashboard="openCreateDashboard()"
        />
        <main class="dashboards-main">
          <DashDesigner
            v-if="selectedId"
            ref="designerRef"
            :dashboard-id="selectedId"
            @saved="onDesignerSaved"
          />
          <el-empty
            v-else
            class="dashboards-empty"
            description="暂无看板，请先新建看板"
          />
        </main>
      </div>
    </PageCard>

    <CustomDialog
      v-model:visible="groupDialogOpen"
      :title="groupDialogTitle"
      size="mini"
      append-to-body
      cancel-text="取消"
      confirm-text="保存"
      :confirm-loading="actionLoading"
      :handler-cancel="() => groupDialogOpen = false"
      :handler-confirm="submitGroup"
      @closed="groupFormRef?.clearValidate()"
    >
      <template #custom-dialog-body>
        <el-form
          ref="groupFormRef"
          :model="groupForm"
          :rules="groupRules"
          label-position="top"
        >
          <el-form-item label="分组名称" prop="groupName">
            <el-input v-model="groupForm.groupName" maxlength="50" clearable />
          </el-form-item>
          <el-form-item label="上级分组">
            <DashGroupTreeSelect
              v-model="groupForm.pid"
              :data="groupTree"
              :exclude-id="groupForm.id"
              root-label="无（根分组）"
              :clearable="false"
            />
          </el-form-item>
          <el-form-item label="图标">
            <MenuIconPicker v-model="groupForm.icon" />
          </el-form-item>
          <el-form-item label="状态">
            <el-switch
              v-model="groupForm.status"
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

    <CustomDialog
      v-model:visible="dashboardDialogOpen"
      :title="dashboardDialogMode === 'create' ? '新增看板' : '编辑看板信息'"
      size="mini"
      append-to-body
      cancel-text="取消"
      :confirm-text="dashboardDialogMode === 'create' ? '创建' : '保存'"
      :confirm-loading="actionLoading"
      :handler-cancel="() => dashboardDialogOpen = false"
      :handler-confirm="submitDashboard"
      @closed="dashboardFormRef?.clearValidate()"
    >
      <template #custom-dialog-body>
        <el-form
          ref="dashboardFormRef"
          :model="dashboardForm"
          :rules="dashboardRules"
          label-position="top"
        >
          <el-form-item label="看板名称" prop="dashName">
            <el-input v-model="dashboardForm.dashName" maxlength="50" clearable />
          </el-form-item>
          <el-form-item label="报表分组">
            <DashGroupTreeSelect
              v-model="dashboardForm.groupId"
              :data="groupTree"
              root-label="未分组"
              :clearable="false"
            />
          </el-form-item>
          <el-form-item label="看板描述">
            <el-input
              v-model="dashboardForm.dashDesc"
              type="textarea"
              :rows="3"
              maxlength="200"
              show-word-limit
            />
          </el-form-item>
          <el-form-item v-if="dashboardDialogMode === 'create'" label="状态">
            <el-switch
              v-model="dashboardForm.status"
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

    <CustomDialog
      v-model:visible="moveDialogOpen"
      title="移动看板"
      size="mini"
      append-to-body
      cancel-text="取消"
      confirm-text="移动"
      :confirm-loading="actionLoading"
      :handler-cancel="() => moveDialogOpen = false"
      :handler-confirm="submitMoveDashboard"
    >
      <template #custom-dialog-body>
        <el-form label-position="top">
          <el-form-item :label="`将「${moveTarget?.name || ''}」移动到`">
            <DashGroupTreeSelect
              v-model="moveGroupId"
              :data="groupTree"
              root-label="未分组"
              :clearable="false"
            />
          </el-form-item>
        </el-form>
      </template>
    </CustomDialog>
  </div>
</template>

<style scoped lang="scss">
.dashboards-route {
  height: 100%;
  min-height: 0;
}

.dashboards-page {
  min-width: 1060px;
}

.dashboards-layout {
  display: flex;
  width: 100%;
  height: 100%;
  min-height: 0;
  overflow: hidden;
}

.dashboards-main {
  display: flex;
  flex: 1;
  min-width: 0;
  min-height: 0;
  background: var(--el-fill-color-lighter);
}

.dashboards-empty {
  width: 100%;
}
</style>
