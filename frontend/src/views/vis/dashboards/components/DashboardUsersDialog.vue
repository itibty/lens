<script setup lang="ts">
import { Search } from '@element-plus/icons-vue'
import dayjs from 'dayjs'
import { listDashboardRoles, queryDashboardUsers, unlinkDashboardRole } from '@/apis/admin/dashboardRelation'
import CustomDialog from '@/components/CustomDialog.vue'
import { SYS_ROLE_QUERY, SYS_ROLE_WRITE, SYS_USER_QUERY } from '@/core/permCodes'
import { useAccountStore } from '@/stores/modules/account'
import { showConfirm, showToast } from '@/utils'
import { apiErrorMessage } from '@/views/vis/shared/visRequest'

const { hasFunction } = useAccountStore()
const canReadUsers = computed(() => hasFunction(SYS_USER_QUERY))
const canReadRoles = computed(() => hasFunction(SYS_ROLE_QUERY))
const canUnlink = computed(() => hasFunction(SYS_ROLE_WRITE))
const visible = ref(false)
const dashboard = reactive({ id: '', name: '' })
const activeTab = ref('users')
const roles = ref<ADMIN.DashboardRoleInfo[]>([])
const users = ref<ADMIN.DashboardUserInfo[]>([])
const loading = reactive({ users: false, roles: false })
const errors = reactive({ users: false, roles: false })
const keyword = ref('')
const appliedKeyword = ref('')
const pageNumber = ref(1)
const pageSize = 10
const total = ref(0)
const removing = ref('')
let session = 0
let usersRequest = 0
let rolesRequest = 0

async function fetchUsers() {
  if (!canReadUsers.value)
    return
  const currentSession = session
  const request = ++usersRequest
  loading.users = true
  errors.users = false
  try {
    const res = await queryDashboardUsers({
      dashboardId: dashboard.id,
      keyword: appliedKeyword.value || undefined,
      page: { pageNumber: pageNumber.value, pageSize },
    }, { showErrorMessage: false })
    if (currentSession !== session || request !== usersRequest)
      return
    total.value = res.data?.total ?? 0
    const lastPage = Math.max(1, Math.ceil(total.value / pageSize))
    if (pageNumber.value > lastPage) {
      pageNumber.value = lastPage
      await fetchUsers()
      return
    }
    users.value = res.data?.records ?? []
  }
  catch {
    if (currentSession === session && request === usersRequest)
      errors.users = true
  }
  finally {
    if (currentSession === session && request === usersRequest)
      loading.users = false
  }
}

async function fetchRoles() {
  if (!canReadRoles.value)
    return
  const currentSession = session
  const request = ++rolesRequest
  loading.roles = true
  errors.roles = false
  try {
    const res = await listDashboardRoles({ dashboardId: dashboard.id }, { showErrorMessage: false })
    if (currentSession === session && request === rolesRequest)
      roles.value = res.data?.list ?? []
  }
  catch {
    if (currentSession === session && request === rolesRequest)
      errors.roles = true
  }
  finally {
    if (currentSession === session && request === rolesRequest)
      loading.roles = false
  }
}

function search() {
  appliedKeyword.value = keyword.value.trim()
  pageNumber.value = 1
  void fetchUsers()
}

function showDialog(row: { id: string, name: string }) {
  session++
  Object.assign(dashboard, row)
  roles.value = []
  users.value = []
  keyword.value = ''
  appliedKeyword.value = ''
  pageNumber.value = 1
  total.value = 0
  removing.value = ''
  Object.assign(loading, { users: false, roles: false })
  Object.assign(errors, { users: false, roles: false })
  activeTab.value = canReadUsers.value ? 'users' : 'roles'
  visible.value = true
  void fetchUsers()
  void fetchRoles()
}

function unlink(role: ADMIN.DashboardRoleInfo) {
  if (!role.id || removing.value)
    return
  const target = { dashboardId: dashboard.id, roleId: role.id }
  const currentSession = session
  showConfirm(`解除角色「${role.roleName}」与此看板的关联？该角色将不再授予此看板的访问权限。`, '解除关联', 'warning', async () => {
    if (currentSession !== session || !visible.value || removing.value)
      return
    removing.value = target.roleId
    try {
      await unlinkDashboardRole(target, { showErrorMessage: false })
      if (currentSession !== session)
        return
      showToast('已解除关联')
      await Promise.all([fetchRoles(), fetchUsers()])
    }
    catch (error) {
      if (currentSession === session)
        showToast(apiErrorMessage(error, '解除关联失败'), 'error')
    }
    finally {
      if (currentSession === session)
        removing.value = ''
    }
  })
}

function validityLabel(role: ADMIN.DashboardUserRoleInfo) {
  return ({ ACTIVE: '生效中', PENDING: '未生效', EXPIRED: '已过期', DISABLED: '已禁用' })[role.validity || 'ACTIVE']
}

function validityPeriod(role: ADMIN.DashboardUserRoleInfo) {
  const format = (value: string) => dayjs(Number(value)).format('YYYY-MM-DD HH:mm')
  if (role.startAt && role.endAt)
    return `${format(role.startAt)} 至 ${format(role.endAt)}`
  if (role.startAt)
    return `${format(role.startAt)} 起`
  if (role.endAt)
    return `截至 ${format(role.endAt)}`
  return '长期有效'
}

defineExpose({ showDialog })
</script>

<template>
  <CustomDialog
    v-model.visible="visible"
    :title="`「${dashboard.name}」的相关用户`"
    size="big"
    :show-footer="false"
    append-to-body
    destroy-on-close
    @close="session++"
  >
    <template #custom-dialog-body>
      <el-tabs v-model="activeTab">
        <el-tab-pane v-if="canReadUsers" label="用户" name="users">
          <div class="users-toolbar">
            <el-input v-model="keyword" :prefix-icon="Search" placeholder="搜索用户名或姓名" clearable @keyup.enter="search" @clear="search" />
            <el-button @click="search">
              搜索
            </el-button>
          </div>
          <div v-if="errors.users" class="users-empty">
            <span>加载失败</span>
            <el-button link type="primary" @click="fetchUsers">
              重试
            </el-button>
          </div>
          <el-table v-else v-spinner="loading.users" :data="users" max-height="420" :empty-text="appliedKeyword ? '没有匹配的用户' : '暂无相关用户'">
            <el-table-column prop="username" label="用户名" min-width="140" show-overflow-tooltip />
            <el-table-column prop="realName" label="姓名" min-width="110" show-overflow-tooltip />
            <el-table-column label="账号状态" width="100">
              <template #default="{ row }">
                <el-tag :type="row.status === 'EBL' ? 'success' : 'info'" size="small">
                  {{ row.status === 'EBL' ? '启用' : '禁用' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="关联角色" min-width="320">
              <template #default="{ row }">
                <div v-for="role in row.roles" :key="role.id" class="user-role">
                  <div class="user-role__head">
                    <span>{{ role.roleName }}</span>
                    <el-tag v-if="role.validity !== 'ACTIVE'" size="small" :type="role.validity === 'PENDING' ? 'warning' : 'info'">
                      {{ validityLabel(role) }}
                    </el-tag>
                  </div>
                  <span class="user-role__period">{{ validityPeriod(role) }}</span>
                </div>
              </template>
            </el-table-column>
          </el-table>
          <el-pagination v-if="!errors.users && total > pageSize" v-model:current-page="pageNumber" class="users-pagination" :disabled="loading.users" :page-size="pageSize" :total="total" layout="total, prev, pager, next" @current-change="fetchUsers" />
        </el-tab-pane>
        <el-tab-pane v-if="canReadRoles" label="授权角色" name="roles">
          <div v-if="errors.roles" class="users-empty">
            <span>加载失败</span>
            <el-button link type="primary" @click="fetchRoles">
              重试
            </el-button>
          </div>
          <el-table v-else v-spinner="loading.roles" :data="roles" max-height="420" empty-text="暂无授权角色">
            <el-table-column prop="roleName" label="角色名称" min-width="180" show-overflow-tooltip />
            <el-table-column prop="roleCode" label="角色编码" min-width="180" show-overflow-tooltip />
            <el-table-column label="状态" width="100">
              <template #default="{ row }">
                <el-tag :type="row.status === 'EBL' ? 'success' : 'info'" size="small">
                  {{ row.status === 'EBL' ? '启用' : '禁用' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column v-if="canUnlink" label="操作" width="110" fixed="right">
              <template #default="{ row }">
                <el-button
                  size="small"
                  type="primary"
                  link
                  :loading="removing === row.id"
                  :disabled="!!removing && removing !== row.id"
                  @click="unlink(row)"
                >
                  解除关联
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>
      </el-tabs>
    </template>
  </CustomDialog>
</template>

<style scoped lang="scss">
.users-toolbar {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
  .el-input {
    max-width: 280px;
  }
}
.users-empty {
  min-height: 160px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: var(--el-text-color-secondary);
}
.users-pagination {
  justify-content: flex-end;
  margin-top: 16px;
}
.user-role {
  padding: 5px 0;
  overflow-wrap: anywhere;
  & + & {
    border-top: 1px solid var(--el-border-color-lighter);
  }
}
.user-role__head {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}
.user-role__period {
  color: var(--el-text-color-secondary);
  font-size: 12px;
}
</style>
