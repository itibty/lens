<script setup lang="ts">
import { getDatasetDataTime, saveDatasetDataTime, testDatasetDataTime } from '@/apis/vis/dataset'
import CustomDialog from '@/components/CustomDialog.vue'
import { showToast } from '@/utils'
import { dataTimeText } from '@/views/vis/shared/queryTime'
import { apiErrorMessage } from '@/views/vis/shared/visRequest'

const props = defineProps<{ datasetId?: string }>()
const visible = ref(false)
const busy = ref(false)
const loaded = ref(false)
const error = ref('')
const result = ref('')
const resultFailed = ref(false)
const action = ref<'test' | 'save'>()
const form = ref<VIS.DataTimeConfig>({ enabled: false, kind: 'updatedAt', precision: 'datetime', timezone: 'Asia/Shanghai', sql: '' })
let session = 0

async function open() {
  if (!props.datasetId)
    return
  const current = ++session
  visible.value = true
  busy.value = true
  action.value = undefined
  error.value = ''
  result.value = ''
  loaded.value = false
  try {
    const response = await getDatasetDataTime({ datasetId: props.datasetId }, { showErrorMessage: false })
    if (current === session) {
      form.value = response.data || form.value
      loaded.value = true
    }
  }
  catch (e) {
    if (current === session)
      error.value = apiErrorMessage(e, '配置加载失败')
  }
  finally {
    if (current === session)
      busy.value = false
  }
}

async function submit(test = false) {
  if (!props.datasetId || busy.value || !loaded.value)
    return
  const current = session
  busy.value = true
  action.value = test ? 'test' : 'save'
  error.value = ''
  result.value = ''
  try {
    if (test) {
      const response = await testDatasetDataTime({ datasetId: props.datasetId }, form.value, { showErrorMessage: false })
      if (current === session) {
        result.value = dataTimeText({ dataTime: response.data }) || '时间配置未启用'
        resultFailed.value = response.data?.status !== 'ok'
      }
    }
    else {
      await saveDatasetDataTime({ datasetId: props.datasetId }, form.value, { showErrorMessage: false })
      if (current === session) {
        showToast('数据更新时间配置已保存')
        visible.value = false
      }
    }
  }
  catch (e) {
    if (current === session)
      error.value = apiErrorMessage(e, '操作失败')
  }
  finally {
    if (current === session) {
      busy.value = false
      action.value = undefined
    }
  }
}
watch(form, () => result.value = '', { deep: true })
watch(() => props.datasetId, () => {
  session++
  visible.value = false
  busy.value = false
})
watch(visible, (opened) => {
  if (!opened) {
    session++
    busy.value = false
    action.value = undefined
  }
})
onScopeDispose(() => session++)
defineExpose({ open })
</script>

<template>
  <CustomDialog v-model:visible="visible" title="数据更新时间" width="min(640px, 94vw)" size="" append-to-body is-custom-footer :close-on-click-modal="false">
    <template #custom-dialog-body>
      <el-alert v-if="error" :title="error" type="error" :closable="false" class="mb-4" />
      <el-form label-position="top" :disabled="busy || !loaded">
        <div class="data-time-toggle">
          <span>在报表中显示</span>
          <el-switch v-model="form.enabled" aria-label="在报表中显示数据更新时间" />
        </div>
        <template v-if="form.enabled">
          <div class="data-time-options">
            <el-form-item label="时间口径">
              <template #label>
                <span class="data-time-label">时间口径
                  <el-tooltip content="更新时间表示最近一次数据变更；数据截至表示数据已完整覆盖到该时间。" placement="top">
                    <button type="button" class="data-time-help" aria-label="时间口径说明"><span class="i-mingcute-question-line" /></button>
                  </el-tooltip>
                </span>
              </template>
              <el-radio-group v-model="form.kind">
                <el-radio value="updatedAt">
                  数据更新于
                </el-radio><el-radio value="coverageEnd">
                  数据截至
                </el-radio>
              </el-radio-group>
            </el-form-item>
            <el-form-item label="显示格式">
              <el-radio-group v-model="form.precision">
                <el-radio value="datetime">
                  日期时间
                </el-radio><el-radio value="date">
                  日期
                </el-radio>
              </el-radio-group>
            </el-form-item>
          </div>
          <el-form-item label="源时间时区">
            <el-select v-model="form.timezone" filterable allow-create default-first-option aria-label="源时间时区">
              <el-option label="北京时间 · Asia/Shanghai" value="Asia/Shanghai" />
              <el-option label="UTC" value="UTC" />
              <el-option v-if="form.timezone && !['Asia/Shanghai', 'UTC'].includes(form.timezone)" :label="form.timezone" :value="form.timezone" />
            </el-select>
          </el-form-item>
          <el-form-item label="取值 SQL">
            <template #label>
              <span class="data-time-label">取值 SQL
                <el-tooltip content="使用当前数据源查询，返回一行一列时间；不随报表筛选变化。" placement="top">
                  <button type="button" class="data-time-help" aria-label="取值 SQL 说明"><span class="i-mingcute-question-line" /></button>
                </el-tooltip>
              </span>
            </template>
            <el-input v-model="form.sql" type="textarea" :rows="5" placeholder="SELECT MAX(updated_at) FROM your_table" class="data-time-sql" />
          </el-form-item>
          <div v-if="result" class="data-time-result" :class="{ 'is-error': resultFailed }" role="status">
            <span :class="resultFailed ? 'i-mingcute-warning-line' : 'i-mingcute-check-circle-line'" />{{ result }}
          </div>
        </template>
      </el-form>
    </template>
    <template #custom-dialog-footer>
      <el-button :disabled="busy" @click="visible = false">
        取消
      </el-button>
      <el-button :disabled="busy || !form.enabled || !loaded || !form.sql?.trim()" :loading="action === 'test'" @click="submit(true)">
        测试查询
      </el-button>
      <el-button type="primary" :disabled="busy || !loaded" :loading="action === 'save'" @click="submit()">
        保存
      </el-button>
    </template>
  </CustomDialog>
</template>

<style scoped lang="scss">
.data-time-help {
  display: inline-flex;
  border: 0;
  background: none;
  padding: 0;
  color: var(--el-text-color-secondary);
  cursor: help;
  font-size: 14px;
}
.data-time-label {
  display: flex;
  align-items: center;
  gap: 6px;
}
.data-time-toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 18px;
}
.data-time-options {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}
.data-time-result {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 6px;
  background: var(--el-color-success-light-9);
  color: var(--el-color-success);
  font-size: 13px;

  &.is-error {
    background: var(--el-color-warning-light-9);
    color: var(--el-color-warning);
  }
}
.data-time-sql :deep(textarea) {
  font-family: monospace;
}
@media (max-width: 480px) {
  .data-time-options {
    grid-template-columns: minmax(0, 1fr);
    gap: 0;
  }
}
</style>
