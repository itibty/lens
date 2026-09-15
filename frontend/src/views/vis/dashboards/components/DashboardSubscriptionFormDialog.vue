<script setup lang="ts">
import type { FormInstance, FormRules } from 'element-plus'
import { editDashboardSubscription } from '@/apis/vis/dashboardSubscription'
import { resolvePersonalView } from '@/apis/vis/personalReport'
import CustomDialog from '@/components/CustomDialog.vue'
import { showToast } from '@/utils'
import { subscriptionErrorMessage, subscriptionWeekdayOptions } from '../subscriptionFormat'

const props = withDefaults(defineProps<{
  dashboardId?: string
  dashboardName?: string
  recipientEmail?: string
  currentStateJson?: string
  personalViews?: VIS.PersonalViewInfo[]
}>(), {
  dashboardId: '',
  dashboardName: '看板',
  recipientEmail: '',
})

const emit = defineEmits<{
  saved: []
}>()

const visible = ref(false)
const saving = ref(false)
const editing = ref(false)
const saveError = ref('')
const contentMode = ref('current')
const contentState = ref<string>()
const contentSummary = ref('')
const contentError = ref('')
const contentLoading = ref(false)
const currentSnapshot = ref<string>()
let contentRequest = 0

const formRef = ref<FormInstance>()
let session = 0

function defaultForm(): VIS.SaveDashboardSubscriptionRequest {
  return {
    dashboardId: props.dashboardId,
    subscriptionName: `${(props.dashboardName || '看板').slice(0, 98)}订阅`,
    scheduleType: 'DAILY',
    schedule: { time: '09:00', dayOfWeek: 1, dayOfMonth: 1 },
    timezone: 'Asia/Shanghai',
  }
}

const form = ref<VIS.SaveDashboardSubscriptionRequest>(defaultForm())
async function previewContent() {
  const request = ++contentRequest
  const currentSession = session
  contentLoading.value = true
  contentError.value = ''
  contentState.value = undefined
  if (contentMode.value === 'keep' && !form.value.viewStateJson) {
    contentSummary.value = '报表默认筛选'
    contentLoading.value = false
    return
  }
  try {
    const payload: VIS.ResolveViewRequest = { dashboardId: props.dashboardId }
    if (contentMode.value === 'keep')
      payload.stateJson = form.value.viewStateJson
    else if (contentMode.value === 'current')
      payload.stateJson = currentSnapshot.value
    else if (contentMode.value.startsWith('view:'))
      payload.viewId = contentMode.value.slice(5)
    const response = await resolvePersonalView(payload, { showErrorMessage: false })
    if (request === contentRequest && currentSession === session) {
      contentState.value = response.data?.stateJson
      contentSummary.value = response.data?.summary || '报表默认条件'
    }
  }
  catch (e) {
    if (request === contentRequest && currentSession === session)
      contentError.value = subscriptionErrorMessage(e, '筛选条件不可用，请重新选择')
  }
  finally {
    if (request === contentRequest && currentSession === session)
      contentLoading.value = false
  }
}

const rules: FormRules<VIS.SaveDashboardSubscriptionRequest> = {
  'subscriptionName': [
    { required: true, whitespace: true, message: '请输入订阅名称', trigger: 'blur' },
    { max: 100, message: '订阅名称不能超过100个字符', trigger: 'blur' },
  ],
  'schedule.time': [
    { required: true, message: '请选择发送时间', trigger: 'change' },
    { pattern: /^(?:[01]\d|2[0-3]):[0-5]\d$/, message: '请选择有效的发送时间', trigger: 'change' },
  ],
  'schedule.dayOfWeek': [{ required: true, type: 'number', min: 1, max: 7, message: '请选择星期', trigger: 'change' }],
  'schedule.dayOfMonth': [{ required: true, type: 'number', min: 1, max: 28, message: '请选择1至28日', trigger: 'change' }],
  'scheduleType': [{ required: true, message: '请选择发送频率', trigger: 'change' }],
  'timezone': [{ required: true, message: '请选择时区', trigger: 'change' }],
}

function showDialog(row?: VIS.DashboardSubscriptionInfo) {
  session++
  saving.value = false
  saveError.value = ''
  currentSnapshot.value = props.currentStateJson
  contentMode.value = row?.id ? 'keep' : 'current'
  if (row?.id) {
    editing.value = true
    form.value = {
      id: row.id,
      viewStateJson: row.viewStateJson,
      dashboardId: row.dashboardId || props.dashboardId,
      subscriptionName: row.subscriptionName || defaultForm().subscriptionName,
      scheduleType: row.scheduleType || 'DAILY',
      schedule: {
        time: row.schedule?.time || '09:00',
        dayOfWeek: row.schedule?.dayOfWeek || 1,
        dayOfMonth: row.schedule?.dayOfMonth || 1,
      },
      timezone: row.timezone || 'Asia/Shanghai',
    }
  }
  else {
    editing.value = false
    form.value = defaultForm()
  }
  visible.value = true
  void previewContent()
  nextTick(() => formRef.value?.clearValidate())
}

function close() {
  visible.value = false
}

async function submit() {
  if (saving.value || !visible.value || contentLoading.value || contentError.value)
    return
  const currentSession = session
  const isCurrent = () => visible.value && currentSession === session
  saving.value = true
  saveError.value = ''
  try {
    const valid = await formRef.value?.validate().catch(() => false)
    if (!valid || !isCurrent())
      return
    if (!props.dashboardId || !props.recipientEmail) {
      saveError.value = '请确认看板有效且当前账号已绑定邮箱'
      return
    }
    const payload = {
      ...form.value,
      viewStateJson: contentMode.value === 'keep' ? undefined : contentState.value,
      subscriptionName: form.value.subscriptionName.trim(),
      schedule: { ...form.value.schedule },
    }
    await editDashboardSubscription(payload, { showErrorMessage: false })
    if (!isCurrent()) {
      if (payload.dashboardId === props.dashboardId)
        emit('saved')
      return
    }
    showToast(editing.value ? '订阅已更新' : '订阅已创建')
    close()
    emit('saved')
  }
  catch (error) {
    if (isCurrent())
      saveError.value = subscriptionErrorMessage(error, '订阅保存失败，请重试')
  }
  finally {
    if (isCurrent())
      saving.value = false
  }
}

function cancel() {
  if (!saving.value)
    close()
}

watch(visible, (opened) => {
  if (!opened) {
    session++
    saving.value = false
  }
}, { flush: 'sync' })

onBeforeUnmount(() => session++)

defineExpose({ showDialog, close })
</script>

<template>
  <CustomDialog
    v-model:visible="visible"
    :title="editing ? '编辑订阅' : '新建订阅'"
    size=""
    width="min(600px, calc(100vw - 32px))"
    append-to-body
    destroy-on-close
    is-custom-footer
    :close-on-click-modal="false"
    :close-on-press-escape="!saving"
    :show-close="!saving"
    @closed="formRef?.clearValidate()"
  >
    <template #custom-dialog-body>
      <el-alert v-if="saveError" :title="saveError" type="error" :closable="false" show-icon class="subscription-form-error" />
      <el-form ref="formRef" :model="form" :rules="rules" :disabled="saving" label-position="top" @submit.prevent="submit">
        <el-form-item label="订阅名称" prop="subscriptionName">
          <el-input v-model.trim="form.subscriptionName" maxlength="100" clearable />
        </el-form-item>
        <el-form-item label="订阅内容">
          <template #label>
            <span class="subscription-form-label">订阅内容
              <el-tooltip :content="contentMode === 'keep' && !form.viewStateJson ? '跟随报表的默认筛选，随报表配置变化。' : '订阅会保存所选筛选，修改个人视图不会影响订阅。相对日期按发送当天计算。'" placement="top" :popper-style="{ maxWidth: '280px' }">
                <button type="button" class="subscription-form-help" aria-label="订阅内容说明"><span class="i-mingcute-question-line" /></button>
              </el-tooltip>
            </span>
          </template>
          <el-select v-model="contentMode" @change="previewContent">
            <el-option v-if="editing" :label="form.viewStateJson ? '已保存的筛选' : '跟随默认视图'" value="keep" />
            <el-option label="当前筛选" value="current" />
            <el-option label="默认视图" value="default" />
            <el-option-group v-if="personalViews?.length" label="我的视图">
              <el-option v-for="view in personalViews" :key="view.id" :label="view.viewName" :value="`view:${view.id}`" />
            </el-option-group>
          </el-select>
          <div class="subscription-form-summary" :class="{ 'is-error': contentError }" role="status">
            <span :class="contentLoading ? 'i-svg-spinners-ring-resize' : contentError ? 'i-mingcute-warning-line' : 'i-mingcute-filter-2-line'" />
            <span>{{ contentLoading ? '加载中' : contentError || contentSummary }}</span>
          </div>
        </el-form-item>
        <div class="subscription-form-schedule">
          <el-form-item label="发送频率" prop="scheduleType">
            <el-select v-model="form.scheduleType">
              <el-option label="每天" value="DAILY" />
              <el-option label="周一至周五" value="WEEKDAY" />
              <el-option label="每周" value="WEEKLY" />
              <el-option label="每月" value="MONTHLY" />
            </el-select>
          </el-form-item>
          <el-form-item label="发送时间" prop="schedule.time">
            <el-time-select
              v-model="form.schedule.time"
              start="00:00"
              step="00:15"
              end="23:45"
              placeholder="选择时间"
            />
          </el-form-item>
          <el-form-item v-if="form.scheduleType === 'WEEKLY'" label="星期" prop="schedule.dayOfWeek">
            <el-select v-model="form.schedule.dayOfWeek">
              <el-option v-for="item in subscriptionWeekdayOptions" :key="item.value" v-bind="item" />
            </el-select>
          </el-form-item>
          <el-form-item v-if="form.scheduleType === 'MONTHLY'" label="日期" prop="schedule.dayOfMonth">
            <el-select v-model="form.schedule.dayOfMonth">
              <el-option v-for="day in 28" :key="day" :label="`${day}日`" :value="day" />
            </el-select>
          </el-form-item>
          <el-form-item label="时区" prop="timezone">
            <el-select v-model="form.timezone">
              <el-option label="北京时间" value="Asia/Shanghai" />
              <el-option v-if="form.timezone !== 'Asia/Shanghai'" :label="form.timezone" :value="form.timezone" />
            </el-select>
          </el-form-item>
          <el-form-item label="接收邮箱">
            <div class="subscription-form-recipient">
              <span class="i-mingcute-mail-line" />{{ recipientEmail || '未绑定邮箱' }}
            </div>
          </el-form-item>
        </div>
      </el-form>
    </template>
    <template #custom-dialog-footer>
      <el-button :disabled="saving" @click="cancel">
        取消
      </el-button>
      <el-button type="primary" :loading="saving" :disabled="contentLoading || !!contentError" @click="submit">
        保存
      </el-button>
    </template>
  </CustomDialog>
</template>

<style scoped lang="scss">
.subscription-form-error {
  margin-bottom: 18px;
}

.subscription-form-summary {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  width: 100%;
  padding: 10px 12px;
  margin-top: 8px;
  border-radius: 6px;
  background: var(--el-fill-color-light);
  color: var(--el-text-color-secondary);
  font-size: 12px;
  line-height: 20px;

  > span:first-child {
    flex-shrink: 0;
    margin-top: 3px;
  }

  &.is-error {
    color: var(--el-color-danger);
    background: var(--el-color-danger-light-9);
  }
}
.subscription-form-label,
.subscription-form-recipient {
  display: flex;
  align-items: center;
  gap: 8px;
}
.subscription-form-help {
  display: inline-flex;
  border: 0;
  padding: 0;
  background: none;
  color: var(--el-text-color-secondary);
  font-size: 14px;
  cursor: help;
}
.subscription-form-schedule {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0 16px;
}
.subscription-form-recipient {
  color: var(--el-text-color-secondary);
  overflow-wrap: anywhere;
}

:deep(.el-select),
:deep(.el-time-select) {
  width: 100%;
}
</style>
