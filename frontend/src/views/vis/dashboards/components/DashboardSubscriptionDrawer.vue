<script setup lang="ts">
import {
  deleteDashboardSubscription,
  listDashboardSubscriptionRuns,
  listDashboardSubscriptions,
  testDashboardSubscription,
  toggleDashboardSubscription,
} from '@/apis/vis/dashboardSubscription'
import CustomDrawer from '@/components/CustomDrawer.vue'
import { useAccountStore } from '@/stores/modules/account'
import { showConfirm, showToast } from '@/utils'
import {
  formatSubscriptionFireAt,
  isSubscriptionRunPending,
  subscriptionErrorMessage,
  subscriptionRunStatusTagType,
  subscriptionRunStatusText,
  subscriptionScheduleLabel,
} from '../subscriptionFormat'
import { createSubscriptionPoller } from '../subscriptionPolling'
import DashboardSubscriptionFormDialog from './DashboardSubscriptionFormDialog.vue'
import DashboardSubscriptionRunsDialog from './DashboardSubscriptionRunsDialog.vue'

const props = withDefaults(defineProps<{
  dashboardId?: string
  dashboardName?: string
  viewStateJson?: string
  personalViews?: VIS.PersonalViewInfo[]
}>(), {
  dashboardId: '',
  dashboardName: '看板',
})

const visible = ref(false)
const accountStore = useAccountStore()
const loading = ref(false)
const busyIds = ref<Record<string, 'test' | 'toggle' | 'delete'>>({})
const pendingRuns = ref<Record<string, string>>({})
const loadError = ref('')
const actionError = ref('')
const rows = ref<VIS.DashboardSubscriptionInfo[]>([])
const formDialogRef = ref<InstanceType<typeof DashboardSubscriptionFormDialog>>()
const runsDialogRef = ref<InstanceType<typeof DashboardSubscriptionRunsDialog>>()
const recipientEmail = computed(() => rows.value.length ? rows.value[0]?.recipientEmail || '' : accountStore.userInfo.email || '')

let listRequest = 0
let session = 0
async function fetchData(isCurrent: () => boolean = () => visible.value) {
  if (!visible.value || !props.dashboardId)
    return
  const request = ++listRequest
  const dashboardId = props.dashboardId
  const currentSession = session
  const active = () => isCurrent() && visible.value && dashboardId === props.dashboardId && currentSession === session && request === listRequest
  loading.value = true
  try {
    const res = await listDashboardSubscriptions(
      { dashboardId: props.dashboardId },
      { showErrorMessage: false },
    )
    if (!active())
      return
    rows.value = res.data?.list || []
    loadError.value = ''
    return true
  }
  catch (error) {
    if (active())
      loadError.value = subscriptionErrorMessage(error, '订阅加载失败，将自动重试，也可点击刷新')
  }
  finally {
    if (active())
      loading.value = false
  }
}

const poller = createSubscriptionPoller(async (isCurrent) => {
  const succeeded = await fetchData(isCurrent)
  if (!isCurrent())
    return
  await Promise.all(Object.entries(pendingRuns.value).map(async ([subscriptionId, runId]) => {
    if (!rows.value.some(row => row.id === subscriptionId) && !loadError.value) {
      delete pendingRuns.value[subscriptionId]
      return
    }
    try {
      const res = await listDashboardSubscriptionRuns({ subscriptionId }, { showErrorMessage: false })
      if (!isCurrent() || pendingRuns.value[subscriptionId] !== runId)
        return
      const run = res.data?.list.find(item => item.id === runId)
      if (run && run.runStatus && !isSubscriptionRunPending(run.runStatus)) {
        delete pendingRuns.value[subscriptionId]
        showToast(run.runStatus === 'SUCCESS' ? '测试邮件已发送' : run.errorMessage || '测试发送未完成', run.runStatus === 'SUCCESS' ? 'success' : 'warning')
      }
    }
    catch (error) {
      if (isCurrent())
        loadError.value = subscriptionErrorMessage(error, '测试结果加载失败，将自动重试')
    }
  }))
  if (succeeded && isCurrent() && !loadError.value && !Object.keys(pendingRuns.value).length && !rows.value.some(row => isSubscriptionRunPending(row.lastRunStatus)))
    poller.stop()
})

function refresh() {
  if (visible.value)
    poller.start()
}

watch(visible, (opened) => {
  session++
  if (opened) {
    actionError.value = ''
    refresh()
  }
  else {
    poller.stop()
    loading.value = false
    formDialogRef.value?.close()
    runsDialogRef.value?.close()
  }
}, { flush: 'sync' })

watch(() => props.dashboardId, () => {
  visible.value = false
  rows.value = []
  busyIds.value = {}
  pendingRuns.value = {}
  loadError.value = ''
  actionError.value = ''
  formDialogRef.value?.close()
  runsDialogRef.value?.close()
}, { flush: 'sync' })

onBeforeUnmount(() => {
  session++
  poller.stop()
})

function open() {
  if (!props.dashboardId)
    return
  if (visible.value)
    refresh()
  visible.value = true
}

function openHistory(row: VIS.DashboardSubscriptionInfo) {
  if (!row.id)
    return
  runsDialogRef.value?.showDialog({ id: row.id, subscriptionName: row.subscriptionName })
}

function beginCreate() {
  if (!recipientEmail.value) {
    showToast('当前账号尚未绑定邮箱，请联系管理员完善用户邮箱', 'warning')
    return
  }
  formDialogRef.value?.showDialog()
}

function beginEdit(row: VIS.DashboardSubscriptionInfo) {
  if (!row.id)
    return
  formDialogRef.value?.showDialog(row)
}

async function toggle(row: VIS.DashboardSubscriptionInfo) {
  if (!row.id || busyIds.value[row.id])
    return
  const id = row.id
  const busy = busyIds.value
  const currentSession = session
  busy[id] = 'toggle'
  actionError.value = ''
  try {
    await toggleDashboardSubscription({ subscriptionId: id }, { showErrorMessage: false })
    if (currentSession !== session) {
      if (busy === busyIds.value)
        refresh()
      return
    }
    row.status = row.status === 'EBL' ? 'DBL' : 'EBL'
    showToast(row.status === 'EBL' ? '订阅已启用' : '订阅已停用')
    refresh()
  }
  catch (error) {
    if (currentSession === session)
      actionError.value = subscriptionErrorMessage(error, '订阅状态更新失败，请重试')
  }
  finally {
    delete busy[id]
  }
}

function remove(row: VIS.DashboardSubscriptionInfo) {
  if (!row.id || busyIds.value[row.id])
    return
  const id = row.id
  const currentSession = session
  showConfirm(`确定删除订阅「${row.subscriptionName || ''}」吗？`, '删除订阅', 'warning', async () => {
    if (currentSession !== session || busyIds.value[id])
      return
    const busy = busyIds.value
    busy[id] = 'delete'
    actionError.value = ''
    try {
      await deleteDashboardSubscription({ subscriptionId: id }, { showErrorMessage: false })
      if (currentSession !== session) {
        if (busy === busyIds.value) {
          delete pendingRuns.value[id]
          runsDialogRef.value?.closeIf(id)
          refresh()
        }
        return
      }
      rows.value = rows.value.filter(item => item.id !== id)
      delete pendingRuns.value[id]
      runsDialogRef.value?.closeIf(id)
      showToast('订阅已删除')
      refresh()
    }
    catch (error) {
      if (currentSession === session)
        actionError.value = subscriptionErrorMessage(error, '订阅删除失败，请重试')
    }
    finally {
      delete busy[id]
    }
  })
}

async function testSend(row: VIS.DashboardSubscriptionInfo) {
  if (!row.id || busyIds.value[row.id] || pendingRuns.value[row.id] || isSubscriptionRunPending(row.lastRunStatus))
    return
  const id = row.id
  const busy = busyIds.value
  const pending = pendingRuns.value
  const currentSession = session
  busy[id] = 'test'
  actionError.value = ''
  try {
    const res = await testDashboardSubscription({ subscriptionId: id }, { showErrorMessage: false })
    if (res.data)
      pending[id] = res.data
    if (currentSession !== session) {
      if (busy === busyIds.value)
        refresh()
      return
    }
    row.lastRunStatus = 'QUEUED'
    row.lastErrorMessage = ''
    showToast('测试邮件已加入发送队列，可在执行记录中查看结果')
    refresh()
  }
  catch (error) {
    if (currentSession === session)
      actionError.value = subscriptionErrorMessage(error, '测试发送失败，请重试')
  }
  finally {
    delete busy[id]
  }
}

defineExpose({ open })
</script>

<template>
  <CustomDrawer
    v-model:visible="visible"
    title="报表订阅"
    size-num="min(560px, 100vw)"
    :show-footer="false"
    append-to-body
    destroy-on-close
  >
    <template #custom-drawer-body>
      <div v-spinner="loading && !rows.length" class="subscription-drawer">
        <div class="subscription-drawer__intro">
          <div>
            <strong>{{ dashboardName }}</strong>
          </div>
          <div class="subscription-drawer__actions">
            <el-button :loading="loading" @click="refresh">
              刷新
            </el-button>
            <el-button type="primary" :disabled="!recipientEmail" @click="beginCreate">
              新建订阅
            </el-button>
          </div>
        </div>

        <el-alert
          v-if="!recipientEmail"
          title="请联系管理员绑定接收邮箱"
          type="warning"
          :closable="false"
          show-icon
        />

        <el-alert v-if="loadError" :title="loadError" type="error" :closable="false" show-icon />
        <el-alert v-if="actionError" :title="actionError" type="error" :closable="false" show-icon />

        <el-empty v-if="!loading && !loadError && !rows.length" description="暂无订阅" :image-size="100" />

        <div v-if="rows.length" class="subscription-list">
          <article v-for="row in rows" :key="row.id" class="subscription-item">
            <div class="subscription-item__head">
              <div class="subscription-item__title">
                <strong :title="row.subscriptionName">{{ row.subscriptionName }}</strong>
                <span :class="{ 'is-enabled': row.status === 'EBL' }">
                  {{ row.status === 'EBL' ? '订阅中' : '已暂停' }}
                </span>
              </div>
              <el-dropdown trigger="click">
                <el-button text :loading="!!busyIds[row.id || ''] && busyIds[row.id || ''] !== 'test'" :disabled="!!busyIds[row.id || '']" aria-label="订阅操作">
                  <span class="i-mingcute-more-2-line" />
                </el-button>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item :disabled="!!busyIds[row.id || '']" @click="beginEdit(row)">
                      编辑
                    </el-dropdown-item>
                    <el-dropdown-item :disabled="!!busyIds[row.id || ''] || (row.status !== 'EBL' && !recipientEmail)" @click="toggle(row)">
                      {{ row.status === 'EBL' ? '暂停订阅' : '恢复订阅' }}
                    </el-dropdown-item>
                    <el-dropdown-item divided :disabled="!!busyIds[row.id || '']" @click="remove(row)">
                      删除
                    </el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
            </div>
            <dl>
              <div><dt>筛选</dt><dd>{{ row.viewStateJson ? '已保存筛选' : '跟随默认视图' }}</dd></div>
              <div>
                <dt>发送计划</dt><dd :title="row.timezone || 'Asia/Shanghai'">
                  {{ subscriptionScheduleLabel(row) }} · {{ !row.timezone || row.timezone === 'Asia/Shanghai' ? '北京时间' : row.timezone }}
                </dd>
              </div>
              <div>
                <dt>邮箱</dt><dd :title="row.recipientEmail">
                  {{ row.recipientEmail || '未绑定' }}
                </dd>
              </div>
              <div>
                <dt title="按当前设备的本地时间显示">
                  下次发送
                </dt><dd>{{ row.status === 'EBL' ? formatSubscriptionFireAt(row.nextFireAt) : '已暂停' }}</dd>
              </div>
              <div>
                <dt>执行状态</dt><dd>
                  <el-tag :type="subscriptionRunStatusTagType(row.lastRunStatus)" size="small">
                    {{ subscriptionRunStatusText(row) }}
                  </el-tag>
                </dd>
              </div>
            </dl>
            <p v-if="row.lastErrorMessage" class="subscription-item__error">
              {{ row.lastErrorMessage }}
            </p>
            <el-button
              plain
              :loading="busyIds[row.id || ''] === 'test'"
              :disabled="!recipientEmail || !!busyIds[row.id || ''] || !!pendingRuns[row.id || ''] || isSubscriptionRunPending(row.lastRunStatus)"
              @click="testSend(row)"
            >
              {{ pendingRuns[row.id || ''] || isSubscriptionRunPending(row.lastRunStatus) ? '发送中' : '测试发送' }}
            </el-button>
            <el-button text @click="openHistory(row)">
              发送记录
            </el-button>
          </article>
        </div>
      </div>
    </template>
  </CustomDrawer>

  <DashboardSubscriptionFormDialog
    ref="formDialogRef"
    :dashboard-id="dashboardId"
    :dashboard-name="dashboardName"
    :recipient-email="recipientEmail"
    :current-state-json="viewStateJson"
    :personal-views="personalViews"
    @saved="refresh"
  />
  <DashboardSubscriptionRunsDialog ref="runsDialogRef" :dashboard-id="dashboardId" />
</template>

<style scoped lang="scss">
.subscription-drawer {
  min-height: 100%;
  padding: 20px;
  box-sizing: border-box;
}

.subscription-drawer__intro,
.subscription-item__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.subscription-drawer__intro {
  flex-wrap: wrap;
  margin-bottom: 18px;

  > div:first-child {
    min-width: 0;
    overflow-wrap: anywhere;
  }

  p {
    margin: 5px 0 0;
    color: var(--el-text-color-secondary);
    font-size: 13px;
  }
}

.subscription-drawer__actions {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  gap: 8px;

  .el-button + .el-button {
    margin-left: 0;
  }
}

.subscription-drawer > .el-alert + .el-alert {
  margin-top: 12px;
}

.subscription-item__title {
  display: flex;
  align-items: center;
  min-width: 0;

  strong {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  span {
    flex-shrink: 0;
  }
}

.subscription-item__head > :last-child {
  flex-shrink: 0;
}

.subscription-item__error {
  margin: 0 0 14px;
  color: var(--el-color-danger);
  font-size: 12px;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.subscription-list {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 12px;
  margin-top: 16px;
}

.subscription-item {
  min-width: 0;
  padding: 16px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 10px;
  background: var(--el-bg-color);

  strong + span {
    margin-left: 10px;
    color: var(--el-text-color-secondary);
    font-size: 12px;

    &.is-enabled {
      color: var(--el-color-success);
    }
  }

  dl {
    display: grid;
    gap: 8px;
    margin: 14px 0;
  }

  dl > div {
    display: grid;
    grid-template-columns: 76px minmax(0, 1fr);
    gap: 10px;
  }

  dt {
    color: var(--el-text-color-secondary);
  }

  dd {
    min-width: 0;
    margin: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}
</style>
