<!--
 * @Description: 调用参数示例；可在弹窗内预览渲染后的 SQL
-->
<script setup lang="ts">
import type { SqlOutputErrorInfo } from './debugResult'
import type { CustomDialogProps } from '@/components/CustomDialog.vue'
import { useVModel } from '@vueuse/core'
import vis from '@/apis/vis/index'
import { showToast } from '@/utils/index'
import { extractDebugErrorInfo, hasDebugBusinessError } from './debugResult'

export interface DebugParamsDialogInstance {
  showDialog: () => void
}

const props = defineProps<{
  modelValue: string
  sqlContent: string
  datasetId?: string
}>()

const emits = defineEmits<{
  (e: 'update:modelValue', value: string): void
}>()

const jsonCode = useVModel(props, 'modelValue', emits)
const draft = ref('')
const previewInfo = ref<VIS.DebugSqlResponse>()
const previewError = ref<SqlOutputErrorInfo>()
const previewLoading = ref(false)

const dialog = reactive<CustomDialogProps>({
  visible: false,
  size: 'small',
  title: '参数示例',
  isCustomFooter: true,
  appendToBody: true,
  destroyOnClose: true,
  lockScroll: false,
})

function closeDialog() {
  dialog.visible = false
}

dialog.handlerCancel = closeDialog

function confirmParams() {
  try {
    const next = draft.value.trim() || '{}'
    JSON.parse(next)
    jsonCode.value = next
    dialog.visible = false
  }
  catch {
    showToast('参数格式错误', 'error')
  }
}

function resetPreview() {
  previewInfo.value = undefined
  previewError.value = undefined
}

function parseDraftParams(): Record<string, any> | null {
  try {
    return draft.value.trim() ? JSON.parse(draft.value) : {}
  }
  catch {
    showToast('参数格式错误', 'error')
    return null
  }
}

function formatPreviewTime(timeInfo: VIS.Info) {
  if (timeInfo.taskName === '模板解析')
    return `用时：${timeInfo.time} ms`
  return `用时：${timeInfo.time} ms，占比: ${timeInfo.percent}`
}

async function handlePreview() {
  const params = parseDraftParams()
  if (params === null)
    return
  if (!props.sqlContent.trim()) {
    showToast('请先填写 SQL 脚本', 'warning')
    return
  }
  if (!props.datasetId) {
    showToast('数据集不存在，无法预览', 'error')
    return
  }

  previewLoading.value = true
  resetPreview()
  try {
    const res = await vis.dataset.debugDataset({
      sqlContent: props.sqlContent,
      execSql: false,
      params,
      id: props.datasetId,
    })
    if (hasDebugBusinessError(res.data)) {
      previewError.value = {
        error: res.data?.error,
        stackTrace: res.data?.stackTrace,
      }
      return
    }
    previewInfo.value = res.data
  }
  catch (err) {
    previewError.value = extractDebugErrorInfo(err)
  }
  finally {
    previewLoading.value = false
  }
}

function showDialog() {
  draft.value = jsonCode.value || '{}'
  resetPreview()
  dialog.visible = true
}

watch(draft, () => {
  if (previewInfo.value || previewError.value)
    resetPreview()
})

defineExpose({
  showDialog,
})
</script>

<template>
  <CustomDialog
    v-bind="{ ...dialog }"
    v-model.visible="dialog.visible"
  >
    <template #custom-dialog-body>
      <div class="params-dialog">
        <div style="--ets-wrap-height: 240px; --ets-header-bg: #f5f7fa;">
          <CodemirrorEditor
            v-model="draft"
            lang="json"
            :tools="['COPY', 'FMT']"
            :border="true"
            placeholder="调用参数示例，JSON 格式"
          >
            <template #tools-prefix>
              <span class="mr-auto pl-5px text-14px color-#303133">运行参数</span>
            </template>
          </CodemirrorEditor>
        </div>

        <div
          v-if="previewError"
          class="params-dialog__error"
        >
          <pre v-if="previewError.error">{{ previewError.error }}</pre>
          <pre v-else-if="previewError.fallback">{{ previewError.fallback }}</pre>
        </div>

        <el-descriptions
          v-else-if="previewInfo"
          :border="true"
          :column="1"
          class="custom-el-desc"
        >
          <el-descriptions-item>
            <template #label>
              执行脚本
            </template>
            <span>{{ previewInfo.sql }}</span>
          </el-descriptions-item>
          <el-descriptions-item label="执行参数">
            {{ previewInfo.params }}
          </el-descriptions-item>
          <el-descriptions-item
            v-for="(timeInfo, index) in previewInfo.timeInfos"
            :key="index"
            :label="timeInfo.taskName"
          >
            {{ formatPreviewTime(timeInfo) }}
          </el-descriptions-item>
        </el-descriptions>
      </div>
    </template>
    <template #custom-dialog-footer>
      <div class="params-dialog__footer">
        <el-button
          :loading="previewLoading"
          @click="handlePreview"
        >
          预览
        </el-button>
        <div class="params-dialog__footer-right">
          <el-button @click="closeDialog">
            取消
          </el-button>
          <el-button
            type="primary"
            @click="confirmParams"
          >
            确定
          </el-button>
        </div>
      </div>
    </template>
  </CustomDialog>
</template>

<style scoped lang="scss">
.params-dialog {
  display: flex;
  flex-direction: column;
  gap: 12px;

  &__error {
    border-radius: 4px;
    overflow: hidden;
    border: 1px solid var(--el-color-danger-light-7);
    background: var(--el-color-danger-light-9);

    pre {
      margin: 0;
      padding: 10px 12px;
      color: var(--el-color-danger);
      font-size: 12px;
      line-height: 1.65;
      white-space: pre-wrap;
      word-break: break-word;
    }
  }

  &__footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
  }

  &__footer-right {
    display: flex;
    gap: 8px;
  }
}
</style>
