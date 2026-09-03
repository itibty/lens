<script setup lang="ts">
import type { AddUserDialogInstance } from './components/AddUserDialog.vue'
import type { ConfigRoleDialogInstance } from './components/ConfigRoleDialog.vue'
import type { EditUserDialogInstance } from './components/EditUserDialog.vue'
import { Plus, Search } from '@element-plus/icons-vue'
import { pickBy } from 'lodash-es'
import { queryUsers, resetUserPwd, toggleUserStatus } from '@/apis/admin/user'
import { SYS_USER_WRITE } from '@/core/permCodes'
import { useAccountStore } from '@/stores/modules/account'
import { showConfirm, showToast } from '@/utils/index'
import AddUserDialog from './components/AddUserDialog.vue'
import ConfigRoleDialog from './components/ConfigRoleDialog.vue'
import EditUserDialog from './components/EditUserDialog.vue'

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
  records: ADMIN.UserInfo[]
}

// data
const accountStore = useAccountStore()
const states = reactive<IStates>({
  query: {
    username: '',
    realName: '',
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
    write: accountStore.hasFunction(SYS_USER_WRITE),
  },
})

const addDialogRef = ref<AddUserDialogInstance>()
const editDialogRef = ref<EditUserDialogInstance>()
const roleDialogRef = ref<ConfigRoleDialogInstance>()
let requestId = 0

function fetchData() {
  const currentRequestId = ++requestId
  const params: ADMIN.QueryUserRequest = {
    page: {
      pageNumber: states.pageNumber,
      pageSize: states.pageSize,
    },
    ...pickBy(states.query, value => value !== ''),
  }
  states.loading = true
  queryUsers(params)
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

function handleConfigRole(row: ADMIN.UserInfo) {
  roleDialogRef.value?.showDialog(row)
}

function handleEdit(row: ADMIN.UserInfo) {
  editDialogRef.value?.showDialog(row)
}
function handleAdd() {
  addDialogRef.value?.showDialog()
}

function handleResetPwd(userId?: string) {
  if (!userId)
    return
  showConfirm('确定将此账号密码重置为 Aa123456 吗?', '密码重置', 'warning', () => {
    resetUserPwd({ userId, password: 'Aa123456' }).then((res) => {
      showToast(res.msg, 'success')
      fetchData()
    })
  })
}
function handleToggleStatus(userId: string | undefined, status?: string) {
  if (!userId)
    return
  const statusTxt = status === 'EBL' ? '禁用' : '启用'
  showConfirm(
    `您确定要${statusTxt}此账号吗?`,
    `${statusTxt}确认`,
    'warning',
    () => {
      toggleUserStatus({ userId }).then((res) => {
        showToast(res.msg, 'success')
        fetchData()
      })
    },
  )
}

onMounted(() => {
  handleQuery()
})
</script>

<template>
  <PageCard>
    <template #extra>
      <el-button
        v-if="states.permission.write"
        :icon="Plus"
        type="primary"
        @click="handleAdd"
      >
        新增
      </el-button>
    </template>
    <template #default="scope">
      <el-form :model="states.query" @submit.prevent>
        <el-row :gutter="16">
          <el-col :span="3">
            <el-input
              v-model="states.query.username"
              placeholder="用户名"
              clearable
            />
          </el-col>
          <el-col :span="3">
            <el-input
              v-model="states.query.realName"
              placeholder="姓名"
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
        <el-table-column label="用户名" prop="username" />
        <el-table-column label="姓名" prop="realName" />
        <!-- @vue-generic {ADMIN.UserInfo} -->
        <el-table-column label="状态" prop="status">
          <template #default="{ row }">
            <el-text :type="row.status === 'EBL' ? 'success' : 'info'">
              {{ row.status === "EBL" ? "启用" : "禁用" }}
            </el-text>
          </template>
        </el-table-column>
        <el-table-column show-overflow-tooltip label="角色" prop="roleNames" />
        <el-table-column
          show-overflow-tooltip
          label="最后登录时间"
          prop="lastLoginAt"
        />
        <!-- @vue-generic {ADMIN.UserInfo} -->
        <el-table-column
          v-if="states.permission.write"
          width="250px"
          label="操作"
          fixed="right"
        >
          <template #default="{ row }">
            <el-button
              v-if="states.permission.write"
              size="small"
              type="primary"
              link
              @click="handleEdit(row)"
            >
              编辑
            </el-button>
            <el-button
              v-if="states.permission.write"
              size="small"
              type="primary"
              link
              @click="handleToggleStatus(row.id, row.status)"
            >
              {{ row.status === "EBL" ? "禁用" : "启用" }}
            </el-button>
            <el-button
              v-if="states.permission.write"
              size="small"
              type="primary"
              link
              @click="handleResetPwd(row.id)"
            >
              重置密码
            </el-button>
            <el-button
              v-if="states.permission.write"
              size="small"
              type="primary"
              link
              @click="handleConfigRole(row)"
            >
              配置角色
            </el-button>
          </template>
        </el-table-column>
      </el-table>
      <AddUserDialog ref="addDialogRef" @fetch-data="fetchData" />
      <EditUserDialog ref="editDialogRef" @fetch-data="fetchData" />
      <ConfigRoleDialog ref="roleDialogRef" @fetch-data="fetchData" />
    </template>

    <template #footer>
      <el-pagination
        class="justify-end mtb-8px"
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
