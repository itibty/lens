<!--
 * @Description: 角色配置可看看板。勾选分组级联子孙，只存看板 id。
-->
<script setup lang="ts">
import type { ElTree } from 'element-plus'
import type { CustomDrawerProps } from '@/components/CustomDrawer.vue'
import { getRoleDetail, resetRoleDashboards } from '@/apis/admin/role'
import { listDashboardAssignTree } from '@/apis/vis/dashboard'
import { showToast } from '@/utils/index'

export interface ConfigDashboardsDrawerInstance {
  showDrawer: (row: ADMIN.RoleInfo) => void
}

type AssignTreeNode = VIS.AssignNode & { key: string }

const emits = defineEmits<{
  (e: 'fetchData'): void
}>()

const states = reactive({
  loading: false,
  roleId: '',
  roleName: '',
  filterText: '',
  records: [] as AssignTreeNode[],
})

const drawer = reactive<CustomDrawerProps>({
  visible: false,
  size: 'small',
  title: '配置看板',
  confirmLoading: false,
  handlerCancel: () => {
    drawer.visible = false
  },
  handlerConfirm: () => {
    doSubmit()
  },
})

const treeRef = ref<InstanceType<typeof ElTree>>()
const pendingCheckedKeys = ref<string[]>()
let requestId = 0

function nodeKey(node: Pick<VIS.AssignNode, 'id' | 'nodeType'>) {
  return `${node.nodeType === 'DASH' ? 'd' : 'g'}:${node.id}`
}

function toTree(nodes: VIS.AssignNode[]): AssignTreeNode[] {
  return nodes.map(node => ({
    ...node,
    key: nodeKey(node),
    children: node.children?.length ? toTree(node.children) : [],
  }))
}

function applyCheckedKeys() {
  if (!pendingCheckedKeys.value)
    return
  treeRef.value?.setCheckedKeys(pendingCheckedKeys.value, true)
}

function handleOpen() {
  if (states.roleId)
    fetchData()
}

function handleClose() {
  if (drawer.visible)
    return
  requestId += 1
  states.loading = false
  drawer.confirmLoading = false
  states.filterText = ''
  pendingCheckedKeys.value = []
  treeRef.value?.setCheckedKeys([])
}

function fetchData() {
  const currentRequestId = ++requestId
  states.loading = true
  Promise.all([
    getRoleDetail({ roleId: states.roleId }),
    listDashboardAssignTree(),
  ]).then(([roleRes, treeRes]) => {
    if (currentRequestId !== requestId)
      return
    states.records = toTree(treeRes?.data?.list ?? [])
    pendingCheckedKeys.value = (roleRes?.data?.dashboardIds ?? []).map(id => `d:${id}`)
  }).finally(() => {
    if (currentRequestId === requestId)
      states.loading = false
  })
}

function showDrawer(row: ADMIN.RoleInfo) {
  states.roleId = row.id || ''
  states.roleName = row.roleName || ''
  drawer.title = `${states.roleName}-配置看板`
  drawer.visible = true
  nextTick(fetchData)
}

function filterNode(value: string, data: { name?: string }): boolean {
  if (!value)
    return true
  return (data.name || '').toLowerCase().includes(value.toLowerCase())
}

function doSubmit() {
  const nodes = (treeRef.value?.getCheckedNodes(true) ?? []) as AssignTreeNode[]
  const dashboardIds = nodes
    .filter(node => node.nodeType === 'DASH')
    .map(node => String(node.id))
    .filter(Boolean)
  drawer.confirmLoading = true
  resetRoleDashboards({ roleId: states.roleId, dashboardIds })
    .then((res) => {
      showToast(res.msg, 'success')
      emits('fetchData')
      drawer.visible = false
    })
    .finally(() => {
      drawer.confirmLoading = false
    })
}

watch(
  () => states.filterText,
  (value) => {
    treeRef.value?.filter(value)
  },
)

watch(
  () => states.records,
  () => {
    nextTick(applyCheckedKeys)
  },
)

defineExpose({
  showDrawer,
})
</script>

<template>
  <CustomDrawer
    v-bind="{ ...drawer }"
    v-model.visible="drawer.visible"
    @opened="handleOpen"
    @closed="handleClose"
  >
    <template #custom-drawer-body>
      <el-scrollbar>
        <div v-spinner="states.loading" class="pl-10px pr-10px">
          <el-input
            v-model="states.filterText"
            class="mb-12px"
            placeholder="输入关键字过滤"
            clearable
          />
          <p class="hint">
            勾选分组会选中其下全部看板，保存只记录看板
          </p>
          <el-tree
            :key="`${states.records.length}:${(pendingCheckedKeys ?? []).join(',')}`"
            ref="treeRef"
            :data="states.records"
            :props="{ children: 'children', label: 'name' }"
            show-checkbox
            node-key="key"
            default-expand-all
            :default-checked-keys="pendingCheckedKeys ?? []"
            :filter-node-method="filterNode"
          >
            <template #default="{ node, data }">
              <span class="custom-tree-node">
                <span>{{ node.label }}</span>
                <span v-if="data.nodeType === 'GROUP'" class="light1">分组</span>
              </span>
            </template>
          </el-tree>
        </div>
      </el-scrollbar>
    </template>
  </CustomDrawer>
</template>

<style scoped lang="scss">
.hint {
  margin: 0 0 12px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}
.custom-tree-node {
  display: flex;
  align-items: center;
  gap: 6px;
}
.light1 {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}
</style>
