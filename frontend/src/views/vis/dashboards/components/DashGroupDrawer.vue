<!--
 * @Description: 看板分组管理：左树右看板
-->
<script setup lang="ts">
import type { ElTree, FormInstance, FormRules } from 'element-plus'
import type { CustomDrawerProps } from '@/components/CustomDrawer.vue'
import { MoreFilled } from '@element-plus/icons-vue'
import vis from '@/apis/vis/index'
import CustomDialog from '@/components/CustomDialog.vue'
import { showConfirm, showToast } from '@/utils/index'
import MenuIconPicker from '@/views/permission/menu/components/MenuIconPicker.vue'
import DashGroupTreeSelect from './DashGroupTreeSelect.vue'

export interface DashGroupDrawerInstance {
  showDrawer: () => void
}

interface GroupTreeNode extends VIS.DashGroupInfo {
  virtual?: boolean
}

const emits = defineEmits<{
  (e: 'changed'): void
}>()

const UNGROUPED_ID = '0'

const drawer = reactive<CustomDrawerProps>({
  visible: false,
  size: 'big',
  title: '看板分组',
  showFooter: false,
  handlerCancel: () => {
    drawer.visible = false
  },
})

const treeRef = ref<InstanceType<typeof ElTree>>()
const states = reactive({
  loading: false,
  records: [] as VIS.DashGroupInfo[],
  ungroupedCount: 0,
  selectedId: UNGROUPED_ID,
  dashLoading: false,
  dashKeyword: '',
  dashPage: 1,
  dashPageSize: 20,
  dashTotal: 0,
  dashes: [] as VIS.VisDashboardInfo[],
})

const formRef = ref<FormInstance>()
const dialogVisible = ref(false)
const dialogTitle = ref('新增分组')
const form = reactive<VIS.SaveDashGroupRequest>({
  id: undefined,
  pid: '0',
  groupName: '',
  icon: '',
  sortNum: 0,
  status: 'EBL',
})
const rules: FormRules<VIS.SaveDashGroupRequest> = {
  groupName: [{ required: true, trigger: 'blur', message: '请输入分组名' }],
}

const moveInOpen = ref(false)
const moveInKeyword = ref('')
const moveInLoading = ref(false)
const moveInRecords = ref<VIS.VisDashboardInfo[]>([])
const moveInIds = ref<string[]>([])

const treeData = computed<GroupTreeNode[]>(() => {
  const ungrouped: GroupTreeNode = {
    id: UNGROUPED_ID,
    pid: '0',
    groupName: '未分组',
    dashCount: states.ungroupedCount,
    descDashCount: 0,
    status: 'EBL',
    virtual: true,
    children: [],
  }
  return [ungrouped, ...states.records]
})

const selectedNode = computed(() => findNode(treeData.value, states.selectedId))
const isUngrouped = computed(() => !states.selectedId || states.selectedId === UNGROUPED_ID)
const selectedTitle = computed(() => selectedNode.value?.groupName || '未分组')

function findNode(nodes: GroupTreeNode[], id?: string): GroupTreeNode | undefined {
  if (!id)
    return undefined
  for (const node of nodes) {
    if (node.id === id)
      return node
    const child = node.children?.length ? findNode(node.children as GroupTreeNode[], id) : undefined
    if (child)
      return child
  }
  return undefined
}

function countLabel(node: GroupTreeNode) {
  const own = node.dashCount ?? 0
  const desc = node.descDashCount ?? 0
  if (node.virtual || !desc)
    return `${own}`
  return `${own}/${desc}`
}

function fetchTree(preferId?: string) {
  states.loading = true
  Promise.all([
    vis.dashboard.listDashGroupTree(),
    vis.dashboard.queryDashboards({
      page: { pageNumber: 1, pageSize: 1 },
      groupId: UNGROUPED_ID,
      includeDescendants: false,
    }),
  ])
    .then(([treeRes, ungroupedRes]) => {
      states.records = treeRes.data?.list ?? []
      states.ungroupedCount = ungroupedRes.data?.total ?? 0
      const nextId = preferId && findNode([...(treeRes.data?.list ?? []), { id: UNGROUPED_ID } as GroupTreeNode], preferId)
        ? preferId
        : (findNode(treeData.value, states.selectedId)?.id || UNGROUPED_ID)
      selectNode(nextId)
    })
    .finally(() => {
      states.loading = false
    })
}

function selectNode(id: string) {
  states.selectedId = id || UNGROUPED_ID
  nextTick(() => treeRef.value?.setCurrentKey(states.selectedId))
  states.dashPage = 1
  fetchDashes()
}

function onNodeClick(data: GroupTreeNode) {
  selectNode(data.id || UNGROUPED_ID)
}

function fetchDashes() {
  states.dashLoading = true
  vis.dashboard.queryDashboards({
    page: {
      pageNumber: states.dashPage,
      pageSize: states.dashPageSize,
    },
    groupId: states.selectedId || UNGROUPED_ID,
    includeDescendants: false,
    dashName: states.dashKeyword.trim() || undefined,
  }).then((res) => {
    states.dashes = res.data?.records ?? []
    states.dashTotal = res.data?.total ?? 0
    if (isUngrouped.value)
      states.ungroupedCount = res.data?.total ?? 0
  }).finally(() => {
    states.dashLoading = false
  })
}

function handleDashQuery() {
  states.dashPage = 1
  fetchDashes()
}

function showDrawer() {
  drawer.visible = true
  fetchTree(states.selectedId)
}

function resetForm(partial: Partial<VIS.SaveDashGroupRequest> = {}) {
  form.id = partial.id
  form.pid = partial.pid ?? '0'
  form.groupName = partial.groupName ?? ''
  form.icon = partial.icon ?? ''
  form.sortNum = partial.sortNum ?? 0
  form.status = partial.status ?? 'EBL'
}

function handleAdd(pid?: string) {
  dialogTitle.value = '新增分组'
  resetForm({ pid: pid && pid !== UNGROUPED_ID ? pid : '0' })
  dialogVisible.value = true
}

function handleEdit(row: GroupTreeNode) {
  if (row.virtual)
    return
  dialogTitle.value = '编辑分组'
  resetForm({
    id: row.id,
    pid: row.pid ?? '0',
    groupName: row.groupName,
    icon: row.icon,
    sortNum: row.sortNum,
    status: row.status,
  })
  dialogVisible.value = true
}

function handleToggle(row: GroupTreeNode) {
  if (!row.id || row.virtual)
    return
  const statusTxt = row.status === 'EBL' ? '禁用' : '启用'
  showConfirm(`确定${statusTxt}分组「${row.groupName}」吗？`, `${statusTxt}确认`, 'warning', () => {
    vis.dashboard.toggleDashGroupStatus({ groupId: row.id! }).then((res) => {
      showToast(res.msg)
      fetchTree(states.selectedId)
      emits('changed')
    })
  })
}

function handleDelete(row: GroupTreeNode) {
  if (!row.id || row.virtual)
    return
  showConfirm(`确定删除分组「${row.groupName}」吗？`, '删除确认', 'warning', () => {
    vis.dashboard.delDashGroup({ groupId: row.id! }).then((res) => {
      showToast(res.msg)
      const nextId = row.id === states.selectedId ? (row.pid && row.pid !== UNGROUPED_ID ? row.pid : UNGROUPED_ID) : states.selectedId
      fetchTree(nextId)
      emits('changed')
    })
  })
}

function onNodeCommand(command: string, row: GroupTreeNode) {
  if (command === 'add')
    handleAdd(row.id)
  else if (command === 'edit')
    handleEdit(row)
  else if (command === 'toggle')
    handleToggle(row)
  else if (command === 'delete')
    handleDelete(row)
}

function doSubmit() {
  formRef.value?.validate((valid) => {
    if (!valid)
      return
    vis.dashboard.editDashGroup({
      ...form,
      pid: form.pid && form.pid !== '0' ? form.pid : '0',
      groupName: form.groupName.trim(),
    }).then((res) => {
      showToast(res.msg)
      dialogVisible.value = false
      const nextId = form.id || (res.data != null ? String(res.data) : states.selectedId)
      fetchTree(nextId)
      emits('changed')
    })
  })
}

function moveOut(row: { id?: string }) {
  if (!row.id)
    return
  vis.dashboard.moveDashboardsGroup({
    dashboardIds: [row.id],
    groupId: UNGROUPED_ID,
  }).then((res) => {
    showToast(res.msg)
    fetchTree(states.selectedId)
    emits('changed')
  })
}

function openMoveIn() {
  moveInKeyword.value = ''
  moveInIds.value = []
  moveInOpen.value = true
  searchMoveIn()
}

function searchMoveIn() {
  moveInLoading.value = true
  vis.dashboard.queryDashboards({
    page: { pageNumber: 1, pageSize: 50 },
    dashName: moveInKeyword.value.trim() || undefined,
  }).then((res) => {
    const current = states.selectedId || UNGROUPED_ID
    moveInRecords.value = (res.data?.records ?? []).filter((row) => {
      const gid = row.groupId && row.groupId !== '0' ? String(row.groupId) : UNGROUPED_ID
      return gid !== current
    })
  }).finally(() => {
    moveInLoading.value = false
  })
}

function confirmMoveIn() {
  if (!moveInIds.value.length) {
    showToast('请选择要移入的看板', 'warning')
    return
  }
  vis.dashboard.moveDashboardsGroup({
    dashboardIds: moveInIds.value,
    groupId: states.selectedId || UNGROUPED_ID,
  }).then((res) => {
    showToast(res.msg)
    moveInOpen.value = false
    fetchTree(states.selectedId)
    emits('changed')
  })
}

defineExpose({
  showDrawer,
})
</script>

<template>
  <CustomDrawer v-bind="{ ...drawer }" v-model.visible="drawer.visible">
    <template #custom-drawer-body>
      <div class="dash-group-layout">
        <aside class="dash-group-tree">
          <div class="dash-group-tree__head">
            <el-button type="primary" @click="handleAdd()">
              新增分组
            </el-button>
          </div>
          <el-scrollbar v-spinner="states.loading" class="dash-group-tree__scroll">
            <el-tree
              ref="treeRef"
              :data="treeData"
              :props="{ children: 'children', label: 'groupName' }"
              node-key="id"
              default-expand-all
              highlight-current
              :expand-on-click-node="false"
              :indent="16"
              @node-click="onNodeClick"
            >
              <template #default="{ data }">
                <div class="group-node" :class="{ 'is-virtual': data.virtual }">
                  <span class="group-node__name">{{ data.groupName }}</span>
                  <span class="group-node__count">{{ countLabel(data) }}</span>
                  <el-tag v-if="!data.virtual && data.status === 'DBL'" size="small" type="info">
                    禁用
                  </el-tag>
                  <span v-if="!data.virtual" class="group-node__ops" @click.stop>
                    <el-dropdown trigger="click" @command="(cmd: string) => onNodeCommand(cmd, data)">
                      <el-button link type="primary" :icon="MoreFilled" />
                      <template #dropdown>
                        <el-dropdown-menu>
                          <el-dropdown-item command="add">
                            新增子分组
                          </el-dropdown-item>
                          <el-dropdown-item command="edit">
                            编辑
                          </el-dropdown-item>
                          <el-dropdown-item command="toggle">
                            {{ data.status === 'EBL' ? '禁用' : '启用' }}
                          </el-dropdown-item>
                          <el-dropdown-item command="delete">
                            删除
                          </el-dropdown-item>
                        </el-dropdown-menu>
                      </template>
                    </el-dropdown>
                  </span>
                </div>
              </template>
            </el-tree>
          </el-scrollbar>
        </aside>

        <section class="dash-group-main">
          <div class="dash-group-main__head">
            <div class="dash-group-main__title">
              {{ selectedTitle }}
              <span class="light1">{{ states.dashTotal }} 个看板</span>
            </div>
            <el-button type="primary" @click="openMoveIn">
              移入看板
            </el-button>
          </div>
          <el-form class="dash-group-main__query" @submit.prevent>
            <el-input
              v-model="states.dashKeyword"
              clearable
              placeholder="看板名称"
              @keyup.enter="handleDashQuery"
              @clear="handleDashQuery"
            />
          </el-form>
          <el-table
            v-spinner="states.dashLoading"
            :data="states.dashes"
            :border="true"
            height="100%"
          >
            <el-table-column label="名称" prop="dashName" min-width="140" show-overflow-tooltip />
            <el-table-column label="状态" width="72" align="center">
              <template #default="{ row }">
                <el-tag v-if="row.status === 'EBL'" type="success" size="small">
                  启用
                </el-tag>
                <el-tag v-else type="info" size="small">
                  禁用
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="88" align="center">
              <template #default="{ row }">
                <el-button
                  v-if="!isUngrouped"
                  type="primary"
                  link
                  size="small"
                  @click="moveOut(row)"
                >
                  移出本组
                </el-button>
                <span v-else class="light1">—</span>
              </template>
            </el-table-column>
          </el-table>
          <el-pagination
            class="dash-group-main__pager"
            :current-page="states.dashPage"
            layout="total, prev, pager, next"
            :page-size="states.dashPageSize"
            :total="states.dashTotal"
            @current-change="(page: number) => { states.dashPage = page; fetchDashes() }"
          />
        </section>
      </div>
    </template>
  </CustomDrawer>

  <CustomDialog
    v-model:visible="dialogVisible"
    :title="dialogTitle"
    size="mini"
    append-to-body
    cancel-text="取消"
    confirm-text="保存"
    :handler-cancel="() => dialogVisible = false"
    :handler-confirm="doSubmit"
  >
    <template #custom-dialog-body>
      <el-form ref="formRef" :model="form" :rules="rules" label-width="80px">
        <el-form-item label="名称" prop="groupName">
          <el-input v-model.trim="form.groupName" maxlength="50" clearable />
        </el-form-item>
        <el-form-item label="上级">
          <DashGroupTreeSelect
            v-model="form.pid"
            :data="states.records"
            :exclude-id="form.id"
            root-label="无（根分组）"
            :clearable="false"
            placeholder="无（根分组）"
          />
        </el-form-item>
        <el-form-item label="图标">
          <MenuIconPicker v-model="form.icon" />
        </el-form-item>
        <el-form-item label="排序">
          <el-input-number v-model="form.sortNum" :min="0" :max="9999" />
        </el-form-item>
        <el-form-item label="状态">
          <el-switch
            v-model="form.status"
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
    v-model:visible="moveInOpen"
    title="移入看板"
    size="small"
    append-to-body
    cancel-text="取消"
    confirm-text="移入"
    :handler-cancel="() => moveInOpen = false"
    :handler-confirm="confirmMoveIn"
  >
    <template #custom-dialog-body>
      <el-input
        v-model="moveInKeyword"
        class="mb-12px"
        clearable
        placeholder="搜索看板名称，回车查询"
        @keyup.enter="searchMoveIn"
        @clear="searchMoveIn"
      />
      <el-table
        v-spinner="moveInLoading"
        :data="moveInRecords"
        :border="true"
        max-height="360"
        @selection-change="(rows: VIS.VisDashboardInfo[]) => moveInIds = rows.map(row => row.id).filter(Boolean) as string[]"
      >
        <el-table-column type="selection" width="42" />
        <el-table-column label="名称" prop="dashName" show-overflow-tooltip />
        <el-table-column label="当前分组" width="120" show-overflow-tooltip>
          <template #default="{ row }">
            {{ row.groupName || '未分组' }}
          </template>
        </el-table-column>
      </el-table>
    </template>
  </CustomDialog>
</template>

<style scoped lang="scss">
.dash-group-layout {
  display: flex;
  height: calc(100vh - 55px);
  min-height: 0;
}

.dash-group-tree {
  display: flex;
  flex-direction: column;
  width: 280px;
  padding: 12px;
  box-sizing: border-box;
  border-right: 1px solid var(--el-border-color-lighter);

  &__head {
    margin-bottom: 12px;
  }

  &__scroll {
    flex: 1;
    min-height: 0;
  }
}

.dash-group-main {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
  padding: 12px;
  box-sizing: border-box;

  &__head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 12px;
  }

  &__title {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 15px;
    font-weight: 600;
  }

  &__query {
    margin-bottom: 12px;
  }

  &__pager {
    display: flex;
    justify-content: flex-end;
    margin-top: 8px;
  }

  :deep(.el-table) {
    flex: 1;
  }
}

.group-node {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1;
  min-width: 0;
  padding-right: 4px;

  &__name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__count {
    flex-shrink: 0;
    font-size: 12px;
    color: var(--el-text-color-secondary);
  }

  &__ops {
    margin-left: auto;
    flex-shrink: 0;
  }
}

.light1 {
  font-size: 12px;
  font-weight: 400;
  color: var(--el-text-color-secondary);
}

:deep(.el-tree-node__content) {
  height: 32px;
}

.mb-12px {
  margin-bottom: 12px;
}
</style>
