<script setup lang="ts">
import type { AddRoleDialogInstance } from './components/AddRoleDialog.vue'
import type { ConfigDashboardsDrawerInstance } from './components/ConfigDashboardsDrawer.vue'
import type { ConfigFunctionsDrawerInstance } from './components/ConfigFunctionsDrawer.vue'
import type { EditRoleDialogInstance } from './components/EditRoleDialog.vue'
import { Plus, Search } from '@element-plus/icons-vue'
import { pickBy } from 'lodash-es'
import { queryRoles, toggleRoleStatus } from '@/apis/admin/role'

import { useAccountStore } from '@/stores/modules/account'
import { showConfirm, showToast } from '@/utils/index'
import AddRoleDialog from './components/AddRoleDialog.vue'
import ConfigDashboardsDrawer from './components/ConfigDashboardsDrawer.vue'
import ConfigFunctionsDrawer from './components/ConfigFunctionsDrawer.vue'
import EditRoleDialog from './components/EditRoleDialog.vue'

interface IStates {
  permission: Record<string, boolean>
  query: Record<string, string>
  statusOptions: Array<{
    label: string
    value: string
  }>
  loading: boolean
  pageNumber: number
  pageSize: number
  total: number
  records: ADMIN.RoleInfo[]
}

// data
const { hasFunction } = useAccountStore()
const states = reactive<IStates>({
  query: {
    roleName: '',
    roleCode: '',
    roleNote: '',
    status: '',
  },
  statusOptions: [
    { label: '启用', value: 'EBL' },
    { label: '禁用', value: 'DBL' },
  ],
  loading: false,
  pageNumber: 1,
  pageSize: 15,
  total: 0,
  records: [],
  permission: {
    write: hasFunction('sys:role:write'),
    configFunction: hasFunction('sys:role:config-menu'),
    configDashboard: hasFunction('sys:role:config-dashboard'),
  },
})

const addDialogRef = ref<AddRoleDialogInstance>()
const editDialogRef = ref<EditRoleDialogInstance>()
const configFunctionsDrawerRef = ref<ConfigFunctionsDrawerInstance>()
const configDashboardsDrawerRef = ref<ConfigDashboardsDrawerInstance>()
let requestId = 0

function fetchData() {
  const currentRequestId = ++requestId
  const params: ADMIN.QueryRoleRequest = {
    page: {
      pageNumber: states.pageNumber,
      pageSize: states.pageSize,
    },
    ...pickBy(states.query, value => value !== ''),
  }
  states.loading = true
  queryRoles(params)
    .then((res) => {
      if (currentRequestId !== requestId)
        return

      const { data } = res
      states.records = data?.records ?? []
      states.total = data?.total ?? 0
    })
    .finally(() => {
      if (currentRequestId === requestId)
        states.loading = false
    })
}
function handleQuery() {
  states.pageNumber = 1
  fetchData()
}

function handleCurrentChange(pageNumber: number) {
  states.pageNumber = pageNumber
  fetchData()
}

function handleAdd() {
  addDialogRef.value?.showDialog()
}
function handleEdit(row: ADMIN.RoleInfo) {
  editDialogRef.value?.showDialog(row)
}
function handleToggleStatus(roleId: string | undefined, status?: string) {
  if (!roleId)
    return
  const statusTxt = status === 'EBL' ? '禁用' : '启用'
  showConfirm(
    `您确定要${statusTxt}此角色吗?`,
    `${statusTxt}确认`,
    'warning',
    () => {
      toggleRoleStatus({ roleId }).then((res) => {
        showToast(res.msg, 'success')
        fetchData()
      })
    },
  )
}

function handleConfigFunction(row: ADMIN.RoleInfo) {
  configFunctionsDrawerRef.value?.showDrawer(row)
}

function handleConfigDashboard(row: ADMIN.RoleInfo) {
  configDashboardsDrawerRef.value?.showDrawer(row)
}

onMounted(() => {
  handleQuery()
})
</script>

<template>
  <PageCard>
    <template #extra>
      <el-button v-if="states.permission.write" :icon="Plus" type="primary" @click="handleAdd">
        新增
      </el-button>
    </template>
    <template #default="scope">
      <el-form :model="states.query" @submit.prevent>
        <el-row :gutter="15">
          <el-col :span="4">
            <el-input
              v-model="states.query.roleName"
              placeholder="角色名"
              clearable
            />
          </el-col>
          <el-col :span="4">
            <el-input
              v-model="states.query.roleCode"
              placeholder="角色编码"
              clearable
            />
          </el-col>
          <el-col :span="4">
            <el-input
              v-model="states.query.roleNote"
              placeholder="角色说明"
              clearable
            />
          </el-col>
          <el-col :span="3">
            <el-select v-model="states.query.status" placeholder="状态" clearable>
              <el-option
                v-for="item in states.statusOptions"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </el-select>
          </el-col>
          <el-col :span="3">
            <el-button native-type="submit" :icon="Search" @click="handleQuery">
              查询
            </el-button>
          </el-col>
        </el-row>
      </el-form>
      <el-table
        v-spinner="states.loading"
        class="base-m-t"
        :border="true"
        :data="states.records"
        :max-height="scope.info.heightL1"
      >
        <el-table-column label="角色名称" prop="roleName" />
        <el-table-column label="角色编码" prop="roleCode" />
        <!-- @vue-generic {ADMIN.RoleInfo} -->
        <el-table-column label="状态" prop="status">
          <template #default="{ row }">
            <el-text :type="row.status === 'EBL' ? 'success' : 'info'">
              {{ row.status === "EBL" ? "启用" : "禁用" }}
            </el-text>
          </template>
        </el-table-column>
        <el-table-column label="备注" show-overflow-tooltip prop="roleNote" />
        <!-- @vue-generic {ADMIN.RoleInfo} -->
        <el-table-column label="操作" width="320px" fixed="right">
          <template #default="{ row }">
            <el-button
              v-if="states.permission.write"
              type="primary"
              link
              size="small"
              @click="handleEdit(row)"
            >
              编辑
            </el-button>
            <el-button
              v-if="states.permission.write"
              type="primary"
              link
              size="small"
              @click="handleToggleStatus(row.id, row.status)"
            >
              {{ row.status === "EBL" ? "禁用" : "启用" }}
            </el-button>
            <el-button
              v-if="states.permission.configFunction"
              type="primary"
              link
              size="small"
              @click="handleConfigFunction(row)"
            >
              配置功能
            </el-button>
            <el-button
              v-if="states.permission.configDashboard"
              type="primary"
              link
              size="small"
              @click="handleConfigDashboard(row)"
            >
              配置看板
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <AddRoleDialog ref="addDialogRef" @fetch-data="fetchData" />
      <EditRoleDialog ref="editDialogRef" @fetch-data="fetchData" />
      <ConfigFunctionsDrawer
        ref="configFunctionsDrawerRef"
        @fetch-data="fetchData"
      />
      <ConfigDashboardsDrawer
        ref="configDashboardsDrawerRef"
        @fetch-data="fetchData"
      />
    </template>

    <template #footer>
      <el-pagination
        class="justify-end mtb-6px"
        :current-page="states.pageNumber"
        layout="total, prev, pager, next"
        :page-size="states.pageSize"
        :total="states.total"
        @current-change="handleCurrentChange"
      />
    </template>
  </PageCard>
</template>

<style lang="scss" scoped></style>
