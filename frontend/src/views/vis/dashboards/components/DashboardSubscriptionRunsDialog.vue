<script setup lang="ts">
import { getSubscriptionRunView, listDashboardSubscriptionRuns } from '@/apis/vis/dashboardSubscription'
import CustomDialog from '@/components/CustomDialog.vue'
import {
  formatSubscriptionBytes,
  formatSubscriptionFireAt,
  isSubscriptionRunPending,
  subscriptionErrorMessage,
  subscriptionRunStatusLabel,
  subscriptionRunStatusTagType,
  subscriptionTriggerLabel,
} from '../subscriptionFormat'
import { createSubscriptionPoller } from '../subscriptionPolling'

const props = defineProps<{ dashboardId?: string }>()
const router = useRouter()
const summaries = ref<Record<string, string>>({})
const visible = ref(false)
const subscriptionId = ref('')
const subscriptionName = ref('')
const runs = ref<VIS.DashboardSubscriptionRunInfo[]>([])
const loading = ref(false)
const loadError = ref('')

let runsRequest = 0

async function fetchRuns(isCurrent: () => boolean) {
  if (!subscriptionId.value)
    return
  const request = ++runsRequest
  const active = () => visible.value && isCurrent() && request === runsRequest
  loading.value = true
  try {
    const res = await listDashboardSubscriptionRuns(
      { subscriptionId: subscriptionId.value },
      { showErrorMessage: false },
    )
    if (!active())
      return
    runs.value = res.data?.list || []
    loadError.value = ''
    return true
  }
  catch (error) {
    if (active())
      loadError.value = subscriptionErrorMessage(error, '执行记录加载失败，将自动重试')
  }
  finally {
    if (active())
      loading.value = false
  }
}

const poller = createSubscriptionPoller(async (isCurrent) => {
  const succeeded = await fetchRuns(isCurrent)
  if (succeeded && isCurrent() && !runs.value.some(item => isSubscriptionRunPending(item.runStatus)))
    poller.stop()
})

function showDialog(row: { id?: string, subscriptionName?: string }) {
  if (!row.id)
    return
  subscriptionId.value = row.id
  subscriptionName.value = row.subscriptionName || '订阅'
  runs.value = []
  summaries.value = {}
  loadError.value = ''
  visible.value = true
  poller.start()
}

async function inspectRun(row: VIS.DashboardSubscriptionRunInfo, expanded: VIS.DashboardSubscriptionRunInfo[] | boolean) {
  if (!row.id || !row.asOfDate || !row.viewStateJson || !props.dashboardId || !(Array.isArray(expanded) ? expanded.includes(row) : expanded) || summaries.value[row.id])
    return
  const id = row.id
  const currentSubscription = subscriptionId.value
  summaries.value[id] = '正在读取本次运行的条件…'
  try {
    const response = await getSubscriptionRunView({ dashboardId: props.dashboardId, runId: id }, { showErrorMessage: false })
    if (currentSubscription === subscriptionId.value)
      summaries.value[id] = response.data?.summary || '未设置额外筛选'
  }
  catch (error) {
    if (currentSubscription === subscriptionId.value)
      summaries.value[id] = subscriptionErrorMessage(error, '本次运行条件不可用')
  }
}

function runLink(id: string) {
  return router.resolve({ name: 'ReportView', params: { id: props.dashboardId }, query: { subscriptionRunId: id } }).href
}

function close() {
  visible.value = false
}

/** 抽屉删除订阅后关闭悬空的记录弹窗。 */
function closeIf(id?: string) {
  if (id && id === subscriptionId.value)
    visible.value = false
}

function refresh() {
  if (visible.value)
    poller.start()
}

watch(visible, (opened) => {
  if (!opened) {
    poller.stop()
    loading.value = false
  }
}, { flush: 'sync' })

onBeforeUnmount(poller.stop)

defineExpose({ showDialog, close, closeIf, refresh })
</script>

<template>
  <CustomDialog
    v-model:visible="visible"
    class="subscription-runs-dialog"
    title="发送记录"
    width="min(880px, 94vw)"
    size=""
    :show-footer="false"
    append-to-body
    destroy-on-close
  >
    <template #custom-dialog-title>
      <div class="runs-title">
        发送记录
      </div>
    </template>
    <template #custom-dialog-body>
      <div class="runs-toolbar">
        <span>{{ subscriptionName }} · 最近 20 条</span>
        <el-button :loading="loading" @click="refresh">
          刷新
        </el-button>
      </div>
      <div v-spinner="loading && !runs.length" class="runs-content">
        <el-alert
          v-if="loadError"
          :title="runs.length ? `${loadError}，已保留上次数据` : loadError"
          type="error"
          :closable="false"
          show-icon
          class="runs-alert"
        />
        <el-table
          :data="runs"
          row-key="id"
          :max-height="420"
          stripe
          :empty-text="loading ? '加载中' : loadError ? '加载失败，请重试' : '暂无发送记录'"
          @expand-change="inspectRun"
        >
          <el-table-column type="expand" width="44">
            <template #default="{ row }">
              <dl class="runs-detail">
                <div><dt>开始时间</dt><dd>{{ formatSubscriptionFireAt(row.startedAt, '—') }}</dd></div>
                <div><dt>结束时间</dt><dd>{{ formatSubscriptionFireAt(row.finishedAt, '—') }}</dd></div>
                <div v-if="row.viewStateJson">
                  <dt>筛选条件</dt><dd>{{ summaries[row.id] || '待发送' }}</dd>
                </div>
                <div v-if="row.asOfDate">
                  <dt>计算日期</dt><dd>{{ row.asOfDate }}</dd>
                </div>
                <div v-if="row.asOfDate && row.viewStateJson">
                  <dt>查看报表</dt><dd>
                    <el-link :href="runLink(row.id)" target="_blank" type="primary" title="使用本次筛选和日期重新查询当前数据">
                      打开报表
                    </el-link>
                  </dd>
                </div>
                <div v-if="row.errorMessage">
                  <dt>执行说明</dt><dd>{{ row.errorMessage }}</dd>
                </div>
              </dl>
            </template>
          </el-table-column>
          <el-table-column label="计划时间" min-width="180" show-overflow-tooltip>
            <template #default="{ row }">
              {{ formatSubscriptionFireAt(row.scheduledAt, '—') }}
            </template>
          </el-table-column>
          <el-table-column label="触发方式" width="90">
            <template #default="{ row }">
              {{ subscriptionTriggerLabel(row.triggerType) }}
            </template>
          </el-table-column>
          <el-table-column label="状态" min-width="150">
            <template #default="{ row }">
              <el-tag :type="subscriptionRunStatusTagType(row.runStatus)" size="small">
                {{ subscriptionRunStatusLabel(row.runStatus) }}
              </el-tag>
              <el-tooltip v-if="row.errorMessage" :content="row.errorMessage" placement="top" :show-after="200" :popper-style="{ maxWidth: 'min(480px, 90vw)', overflowWrap: 'anywhere' }">
                <span class="runs-error-msg" tabindex="0">查看原因</span>
              </el-tooltip>
            </template>
          </el-table-column>
          <el-table-column label="尝试次数" width="90">
            <template #default="{ row }">
              {{ row.attemptCount ?? 0 }}
            </template>
          </el-table-column>
          <el-table-column label="截图大小" width="110" show-overflow-tooltip>
            <template #default="{ row }">
              {{ formatSubscriptionBytes(row.screenshotSize) }}
            </template>
          </el-table-column>
        </el-table>
      </div>
    </template>
  </CustomDialog>
</template>

<style scoped lang="scss">
.runs-title {
  padding-right: 28px;
  color: var(--el-text-color-regular);
  font-size: 16px;
  font-weight: 700;
  line-height: 1.5;
  overflow-wrap: anywhere;
}

.runs-toolbar {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
  color: var(--el-text-color-secondary);
  font-size: 13px;
}

.runs-content {
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;

  .el-table {
    display: flex;
    flex-direction: column;
    min-height: 0;
  }

  :deep(.el-table__inner-wrapper) {
    flex: 1;
    min-height: 0;
    height: auto;
  }

  :deep(.el-table__body-wrapper),
  :deep(.el-table__body-wrapper > .el-scrollbar) {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-height: 0;
    height: auto;
  }

  :deep(.el-table__body-wrapper .el-scrollbar__wrap) {
    flex: 1;
    min-height: 0;
    height: auto;
  }
}

.runs-detail {
  margin: 0;
  padding: 12px 20px;

  > div {
    display: grid;
    grid-template-columns: 72px minmax(0, 1fr);
    gap: 12px;
    padding: 4px 0;
  }

  dt {
    color: var(--el-text-color-secondary);
  }

  dd {
    margin: 0;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }
}

.runs-alert {
  flex-shrink: 0;
  margin-bottom: 12px;
}

.runs-error-msg {
  margin-left: 8px;
  color: var(--el-text-color-secondary);
  font-size: 12px;
  cursor: help;
}
</style>

<style lang="scss">
.subscription-runs-dialog.custom-dialog .el-dialog__body {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
</style>
