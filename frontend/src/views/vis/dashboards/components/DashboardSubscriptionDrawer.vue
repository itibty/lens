<script setup lang="ts">
import type { FormInstance, FormRules } from 'element-plus'
import {
  deleteDashboardSubscription,
  editDashboardSubscription,
  listDashboardSubscriptionRuns,
  listDashboardSubscriptions,
  testDashboardSubscription,
  toggleDashboardSubscription,
} from '@/apis/vis/dashboardSubscription'
import CustomDrawer from '@/components/CustomDrawer.vue'
import { useAccountStore } from '@/stores/modules/account'
import { showConfirm, showToast } from '@/utils'
import { formatTimeMs } from '@/utils/date'
import { createSubscriptionPoller } from '../subscriptionPolling'

const props = withDefaults(defineProps<{
  dashboardId?: string
  dashboardName?: string
}>(), {
  dashboardId: '',
  dashboardName: '看板',
})

const visible = ref(false)
const accountStore = useAccountStore()
const loading = ref(false)
const saving = ref(false)
const testingId = ref('')
const loadError = ref('')
const pendingRuns = ref<Record<string, string>>({})
const historyId = ref('')
const history = ref<Record<string, VIS.DashboardSubscriptionRunInfo[]>>({})
const rows = ref<VIS.DashboardSubscriptionInfo[]>([])
const formRef = ref<FormInstance>()
const editing = ref(false)
const formVisible = ref(false)
const recipientEmail = computed(() => accountStore.userInfo.email || rows.value[0]?.recipientEmail || '')

function defaultForm(): VIS.SaveDashboardSubscriptionRequest {
  return {
    dashboardId: props.dashboardId,
    subscriptionName: `${props.dashboardName || '看板'}订阅`,
    scheduleType: 'DAILY',
    schedule: { time: '09:00', dayOfWeek: 1, dayOfMonth: 1 },
    timezone: 'Asia/Shanghai',
  }
}

const form = ref<VIS.SaveDashboardSubscriptionRequest>(defaultForm())
const rules: FormRules<VIS.SaveDashboardSubscriptionRequest> = {
  subscriptionName: [{ required: true, message: '请输入订阅名称', trigger: 'blur' }],
  scheduleType: [{ required: true, message: '请选择发送频率', trigger: 'change' }],
  timezone: [{ required: true, message: '请选择时区', trigger: 'change' }],
}

const weekdayOptions = [
  { label: '周一', value: 1 },
  { label: '周二', value: 2 },
  { label: '周三', value: 3 },
  { label: '周四', value: 4 },
  { label: '周五', value: 5 },
  { label: '周六', value: 6 },
  { label: '周日', value: 7 },
]

let listRequest = 0
async function fetchData(isCurrent: () => boolean = () => visible.value) {
  if (!props.dashboardId)
    return
  const request = ++listRequest
  loading.value = !rows.value.length
  try {
    const res = await listDashboardSubscriptions(
      { dashboardId: props.dashboardId },
      { showErrorMessage: false },
    )
    if (!isCurrent() || request !== listRequest)
      return
    rows.value = res.data?.list || []
    loadError.value = ''
  }
  catch (error) {
    if (isCurrent() && request === listRequest)
      loadError.value = errorMessage(error, '订阅加载失败，将自动重试')
  }
  finally {
    if (isCurrent() && request === listRequest)
      loading.value = false
  }
}

async function fetchRuns(subscriptionId: string, isCurrent: () => boolean) {
  try {
    const res = await listDashboardSubscriptionRuns({ subscriptionId }, { showErrorMessage: false })
    if (!isCurrent())
      return
    const runs = res.data?.list || []
    history.value[subscriptionId] = runs
    const run = runs.find(item => item.id === pendingRuns.value[subscriptionId])
    if (run && !['QUEUED', 'RUNNING'].includes(run.runStatus || '')) {
      delete pendingRuns.value[subscriptionId]
      showToast(run.runStatus === 'SUCCESS' ? '测试邮件已发送' : run.errorMessage || '测试发送未完成', run.runStatus === 'SUCCESS' ? 'success' : 'warning')
    }
  }
  catch (error) {
    if (isCurrent())
      loadError.value = errorMessage(error, '执行记录加载失败，将自动重试')
  }
}

const poller = createSubscriptionPoller(async (isCurrent) => {
  await fetchData(isCurrent)
  if (!isCurrent())
    return
  const ids = new Set(Object.keys(pendingRuns.value))
  if (historyId.value)
    ids.add(historyId.value)
  await Promise.all(Array.from(ids, id => fetchRuns(id, isCurrent)))
})

watch(visible, (opened) => {
  if (opened)
    poller.start()
  else
    poller.stop()
}, { flush: 'sync' })
watch(() => props.dashboardId, () => {
  visible.value = false
  rows.value = []
  pendingRuns.value = {}
  history.value = {}
  historyId.value = ''
})
onBeforeUnmount(poller.stop)

function open() {
  formVisible.value = false
  visible.value = true
}

function toggleHistory(row: VIS.DashboardSubscriptionInfo) {
  if (!row.id)
    return
  historyId.value = historyId.value === row.id ? '' : row.id
  if (historyId.value)
    poller.start()
}

function beginCreate() {
  if (!recipientEmail.value) {
    showToast('当前账号尚未绑定邮箱，请联系管理员完善用户邮箱', 'warning')
    return
  }
  editing.value = false
  form.value = defaultForm()
  formVisible.value = true
  nextTick(() => formRef.value?.clearValidate())
}

function beginEdit(row: VIS.DashboardSubscriptionInfo) {
  if (!row.id)
    return
  editing.value = true
  form.value = {
    id: row.id,
    dashboardId: row.dashboardId || props.dashboardId,
    subscriptionName: row.subscriptionName || `${props.dashboardName}订阅`,
    scheduleType: row.scheduleType || 'DAILY',
    schedule: {
      time: row.schedule?.time || '09:00',
      dayOfWeek: row.schedule?.dayOfWeek || 1,
      dayOfMonth: row.schedule?.dayOfMonth || 1,
    },
    timezone: row.timezone || 'Asia/Shanghai',
  }
  formVisible.value = true
  nextTick(() => formRef.value?.clearValidate())
}

async function submit() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid)
    return
  saving.value = true
  try {
    await editDashboardSubscription(form.value)
    showToast(editing.value ? '订阅已更新' : '订阅已创建')
    formVisible.value = false
    await fetchData()
  }
  finally {
    saving.value = false
  }
}

async function toggle(row: VIS.DashboardSubscriptionInfo) {
  if (!row.id)
    return
  await toggleDashboardSubscription({ subscriptionId: row.id })
  showToast(row.status === 'EBL' ? '订阅已停用' : '订阅已启用')
  await fetchData()
}

function remove(row: VIS.DashboardSubscriptionInfo) {
  if (!row.id)
    return
  showConfirm(`确定删除订阅「${row.subscriptionName || ''}」吗？`, '删除订阅', 'warning', async () => {
    await deleteDashboardSubscription({ subscriptionId: row.id! })
    delete pendingRuns.value[row.id!]
    if (historyId.value === row.id)
      historyId.value = ''
    showToast('订阅已删除')
    await fetchData()
  })
}

async function testSend(row: VIS.DashboardSubscriptionInfo) {
  if (!row.id || testingId.value || pendingRuns.value[row.id])
    return
  testingId.value = row.id
  try {
    const res = await testDashboardSubscription({ subscriptionId: row.id })
    if (res.data)
      pendingRuns.value[row.id] = res.data
    showToast('测试邮件已加入发送队列')
    if (visible.value)
      poller.start()
  }
  finally {
    testingId.value = ''
  }
}

function scheduleLabel(row: VIS.DashboardSubscriptionInfo) {
  const time = row.schedule?.time || '--:--'
  if (row.scheduleType === 'WEEKDAY')
    return `工作日 ${time}`
  if (row.scheduleType === 'WEEKLY') {
    const day = weekdayOptions.find(item => item.value === row.schedule?.dayOfWeek)?.label || ''
    return `每${day} ${time}`
  }
  if (row.scheduleType === 'MONTHLY')
    return `每月${row.schedule?.dayOfMonth || 1}日 ${time}`
  return `每天 ${time}`
}

function runStatus(row: VIS.DashboardSubscriptionInfo) {
  if (row.lastRunStatus === 'SUCCESS')
    return '上次成功'
  if (row.lastRunStatus === 'FAILED')
    return row.lastErrorMessage || '上次失败'
  if (row.lastRunStatus === 'QUEUED')
    return '等待发送'
  if (row.lastRunStatus === 'SKIPPED')
    return row.lastErrorMessage || '已跳过'
  if (row.lastRunStatus === 'RUNNING')
    return '发送中'
  return '尚未发送'
}

function formatFireAt(value?: string) {
  if (!value)
    return '待计算'
  const timestamp = Number(value)
  return Number.isFinite(timestamp) ? formatTimeMs(timestamp, 'YYYY-MM-DD HH:mm') : '待计算'
}

function errorMessage(error: unknown, fallback: string) {
  if (error && typeof error === 'object') {
    const message = (error as { msg?: unknown }).msg
    if (typeof message === 'string' && message.trim())
      return message
  }
  return fallback
}

defineExpose({ open })
</script>

<template>
  <CustomDrawer
    v-model:visible="visible"
    title="看板订阅"
    size-num="560px"
    :show-footer="false"
    append-to-body
    destroy-on-close
  >
    <template #custom-drawer-body>
      <div v-loading="loading" class="subscription-drawer">
        <div class="subscription-drawer__intro">
          <div>
            <strong>{{ dashboardName }}</strong>
            <p>按计划将看板完整截图发送到你的绑定邮箱。</p>
          </div>
          <el-button type="primary" :disabled="!recipientEmail" @click="beginCreate">
            新建订阅
          </el-button>
        </div>

        <el-alert
          v-if="!recipientEmail"
          title="当前账号尚未绑定邮箱，请联系管理员完善用户邮箱。"
          type="warning"
          :closable="false"
          show-icon
        />

        <el-alert v-if="loadError" :title="loadError" type="error" :closable="false" show-icon />

        <el-empty v-if="!loading && !loadError && !rows.length && !formVisible" description="还没有看板订阅" />

        <div v-if="rows.length && !formVisible" class="subscription-list">
          <article v-for="row in rows" :key="row.id" class="subscription-item">
            <div class="subscription-item__head">
              <div>
                <strong>{{ row.subscriptionName }}</strong>
                <span :class="{ 'is-enabled': row.status === 'EBL' }">
                  {{ row.status === 'EBL' ? '启用' : '停用' }}
                </span>
              </div>
              <el-dropdown trigger="click">
                <el-button text aria-label="订阅操作">
                  <span class="i-mingcute-more-2-line" />
                </el-button>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item @click="beginEdit(row)">
                      编辑
                    </el-dropdown-item>
                    <el-dropdown-item @click="toggle(row)">
                      {{ row.status === 'EBL' ? '停用' : '启用' }}
                    </el-dropdown-item>
                    <el-dropdown-item divided @click="remove(row)">
                      删除
                    </el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
            </div>
            <dl>
              <div><dt>频率</dt><dd>{{ scheduleLabel(row) }}</dd></div>
              <div><dt>邮箱</dt><dd>{{ row.recipientEmail || '未绑定' }}</dd></div>
              <div><dt>下次发送</dt><dd>{{ row.status === 'EBL' ? formatFireAt(row.nextFireAt) : '已停用' }}</dd></div>
              <div>
                <dt>执行状态</dt><dd :title="row.lastErrorMessage">
                  {{ runStatus(row) }}
                </dd>
              </div>
            </dl>
            <el-button
              plain
              :loading="testingId === row.id"
              :disabled="!recipientEmail || !!testingId || !!pendingRuns[row.id || '']"
              @click="testSend(row)"
            >
              {{ pendingRuns[row.id || ''] ? '等待测试结果' : '测试发送' }}
            </el-button>
            <el-button text @click="toggleHistory(row)">
              {{ historyId === row.id ? '收起记录' : '执行记录' }}
            </el-button>
            <div v-if="historyId === row.id" class="subscription-history">
              <el-empty v-if="!history[row.id || '']?.length" description="暂无执行记录" :image-size="48" />
              <div v-for="run in history[row.id || '']" :key="run.id" class="subscription-history__item">
                <div>{{ formatFireAt(run.scheduledAt) }} · {{ run.triggerType === 'MANUAL' ? '测试' : '定时' }}</div>
                <div>{{ runStatus({ lastRunStatus: run.runStatus, lastErrorMessage: run.errorMessage }) }} · 尝试 {{ run.attemptCount || 0 }} 次</div>
              </div>
            </div>
          </article>
        </div>

        <div v-if="formVisible" class="subscription-form">
          <div class="subscription-form__title">
            <strong>{{ editing ? '编辑订阅' : '新建订阅' }}</strong>
            <el-button text @click="formVisible = false">
              返回列表
            </el-button>
          </div>
          <el-form ref="formRef" :model="form" :rules="rules" label-position="top">
            <el-form-item label="订阅名称" prop="subscriptionName">
              <el-input v-model.trim="form.subscriptionName" maxlength="100" show-word-limit />
            </el-form-item>
            <el-form-item label="发送频率" prop="scheduleType">
              <el-select v-model="form.scheduleType">
                <el-option label="每天" value="DAILY" />
                <el-option label="工作日" value="WEEKDAY" />
                <el-option label="每周" value="WEEKLY" />
                <el-option label="每月" value="MONTHLY" />
              </el-select>
            </el-form-item>
            <el-form-item v-if="form.scheduleType === 'WEEKLY'" label="星期">
              <el-select v-model="form.schedule.dayOfWeek">
                <el-option v-for="item in weekdayOptions" :key="item.value" v-bind="item" />
              </el-select>
            </el-form-item>
            <el-form-item v-if="form.scheduleType === 'MONTHLY'" label="日期">
              <el-select v-model="form.schedule.dayOfMonth">
                <el-option v-for="day in 28" :key="day" :label="`${day}日`" :value="day" />
              </el-select>
            </el-form-item>
            <el-form-item label="发送时间">
              <el-time-select
                v-model="form.schedule.time"
                start="00:00"
                step="00:15"
                end="23:45"
                placeholder="选择时间"
              />
            </el-form-item>
            <el-form-item label="时区" prop="timezone">
              <el-select v-model="form.timezone">
                <el-option label="中国标准时间（Asia/Shanghai）" value="Asia/Shanghai" />
              </el-select>
            </el-form-item>
            <el-form-item label="接收方式">
              <el-input :model-value="recipientEmail || '未绑定邮箱'" disabled />
            </el-form-item>
            <div class="subscription-form__actions">
              <el-button @click="formVisible = false">
                取消
              </el-button>
              <el-button type="primary" :loading="saving" @click="submit">
                保存
              </el-button>
            </div>
          </el-form>
        </div>
      </div>
    </template>
  </CustomDrawer>
</template>

<style scoped lang="scss">
.subscription-drawer {
  min-height: 100%;
  padding: 20px;
  box-sizing: border-box;
}

.subscription-drawer__intro,
.subscription-item__head,
.subscription-form__title,
.subscription-form__actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.subscription-drawer__intro {
  margin-bottom: 18px;

  p {
    margin: 5px 0 0;
    color: var(--el-text-color-secondary);
    font-size: 13px;
  }
}

.subscription-list {
  display: grid;
  gap: 12px;
  margin-top: 16px;
}

.subscription-item {
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

.subscription-history {
  margin-top: 12px;
  max-height: 300px;
  overflow: auto;
}

.subscription-history__item {
  padding: 8px 0;
  border-top: 1px solid var(--el-border-color-lighter);
  font-size: 12px;
  line-height: 1.6;
  overflow-wrap: anywhere;
}

.subscription-form__title {
  margin-bottom: 18px;
}

.subscription-form__actions {
  justify-content: flex-end;
  padding-top: 8px;
}

:deep(.el-select),
:deep(.el-time-select) {
  width: 100%;
}
</style>
