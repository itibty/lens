<!--
 * @Author: Chuang
 * @Date: 2023-09-04 16:52:16
 * @LastEditTime: 2026-05-30 23:58:18
 * @LastEditors: Chuang
 * @Description: 新增或编辑confSql
-->
<script setup lang="ts">
import type { FormInstance, FormRules } from 'element-plus'
import type { CustomDialogProps } from '@/components/CustomDialog.vue'
import { ElMessageBox } from 'element-plus'
import { pickBy } from 'lodash-es'
import vis from '@/apis/vis/index'
import CustomDialog from '@/components/CustomDialog.vue'
import { showToast } from '@/utils/index'
import { createLogger } from '@/utils/logger'
import { isBlank } from '@/utils/validate'

export interface ConfSqlDialogInstance {
  showDialog: (data?: VIS.ConfSqlInfo) => void
}
interface IStates {
  form: VIS.ConfSqlInfoRequest
  dsOptions: Array<VIS.DsOption>
  rules: FormRules<VIS.ConfSqlInfoRequest>
}

const emits = defineEmits<{
  (e: 'fetchData'): void
}>()

const logger = createLogger('CONF_SQL_DIALOG')
const defaultForm: VIS.ConfSqlInfoRequest = {
  sqlName: '',
  sqlDesc: '',
  dsId: '',
  tplEngine: 'ENJOY',
  status: 'EBL',
}

const states = reactive<IStates>({
  form: { ...defaultForm },
  dsOptions: [],
  rules: {
    sqlName: [
      { required: true, trigger: 'blur', message: '请输入数据集名称' },
    ],
    dsId: [
      { required: true, trigger: 'change', message: '请选择数据源' },
    ],
    status: [
      { required: true, trigger: 'change', message: '请选择状态' },
    ],
  },
})

const formRef = ref<FormInstance>()

const dialog = reactive<CustomDialogProps>({
  visible: false,
  size: 'mini',
  title: '新增数据集',
  confirmLoading: false,
  confirmText: '保存',
  handlerCancel: () => {
    dialog.visible = false
  },
  handlerConfirm: () => {
    doSubmit()
  },
})

function handleOpen() {
}
function handleClose() {
  formRef.value?.clearValidate()
}

function showDialog(data?: VIS.ConfSqlInfo) {
  logger.debug('showDialog', data)
  if (data) {
    dialog.title = '编辑数据集'
    states.form = {
      id: data.id,
      sqlName: data.sqlName,
      sqlDesc: data.sqlDesc || '',
      dsId: data.dsId,
      tplEngine: data.tplEngine,
      status: data.status,
    }
  }
  else {
    dialog.title = '新增数据集'
    states.form = {
      ...defaultForm,
    }
  }
  fetchDsOptions()
  dialog.visible = true
}
function fetchDsOptions() {
  vis.datasource.listDatasourceOptions({ dsType: 'RDS' }).then((res) => {
    states.dsOptions = res.data?.list || []
  }).catch(() => {
    states.dsOptions = []
  })
}

function sourceChangeWarning(error: unknown): VIS.DatasetSourceChangeWarning | null {
  if (!error || typeof error !== 'object')
    return null
  const data = (error as { data?: unknown }).data
  if (!data || typeof data !== 'object')
    return null
  const warning = data as Partial<VIS.DatasetSourceChangeWarning>
  if (
    warning.warningType !== 'DATASET_SOURCE_CHANGE'
    || typeof warning.referenceCount !== 'number'
    || !Array.isArray(warning.cards)
  ) {
    return null
  }
  return warning as VIS.DatasetSourceChangeWarning
}

function sourceChangeWarningText(warning: VIS.DatasetSourceChangeWarning) {
  const names = warning.cards
    .map(card => card.cardName)
    .filter(Boolean)
    .join('、')
  const suffix = warning.referenceCount > warning.cards.length ? ' 等' : ''
  const affected = names ? `\n受影响卡片：${names}${suffix}` : ''
  return `该数据集被 ${warning.referenceCount} 张卡片引用。更换数据源后，这些卡片将立即使用新数据源查询；即使字段名相同，数据含义也可能不同。${affected}\n请确认已验证 SQL、字段类型和业务口径。`
}

function errorMessage(error: unknown) {
  if (error && typeof error === 'object' && 'msg' in error) {
    const msg = (error as { msg?: unknown }).msg
    if (typeof msg === 'string' && msg)
      return msg
  }
  return '保存失败'
}

function isMessageBoxCancel(error: unknown) {
  return error === 'cancel' || error === 'close'
}

async function saveInfo(body: VIS.ConfSqlInfoRequest) {
  try {
    return await vis.dataset.editDatasetInfo(body, { showErrorMessage: false })
  }
  catch (error) {
    const warning = sourceChangeWarning(error)
    if (!warning)
      throw error
    await ElMessageBox.confirm(sourceChangeWarningText(warning), '确认更换数据源', {
      confirmButtonText: '确认更换',
      cancelButtonText: '取消',
      closeOnClickModal: false,
      type: 'warning',
    })
    return vis.dataset.editDatasetInfo(
      { ...body, confirmSourceChange: true },
      { showErrorMessage: false },
    )
  }
}

function doSubmit() {
  formRef.value?.validate(async (valid) => {
    if (valid) {
      const body: unknown = pickBy(
        states.form,
        value => typeof value != 'string' || !isBlank(value),
      )
      dialog.confirmLoading = true

      try {
        const res = await saveInfo(body as VIS.ConfSqlInfoRequest)
        const { msg } = res
        showToast(msg, 'success')
        emits('fetchData')
        dialog.visible = false
      }
      catch (error) {
        if (!isMessageBoxCancel(error))
          showToast(errorMessage(error), 'error')
      }
      finally {
        dialog.confirmLoading = false
      }
    }
  })
}

defineExpose<ConfSqlDialogInstance>({
  showDialog,
})
</script>

<template>
  <CustomDialog
    v-bind="{ ...dialog }"
    v-model.visible="dialog.visible"
    @opened="handleOpen"
    @closed="handleClose"
  >
    <template #custom-dialog-body>
      <el-form
        ref="formRef"
        :model="states.form"
        :rules="states.rules"
        label-width="80px"
        label-position="right"
      >
        <el-form-item label="名称" prop="sqlName">
          <el-input
            v-model.trim="states.form.sqlName"
            clearable
            placeholder="请输入数据集名称"
          />
        </el-form-item>
        <el-form-item label="说明" prop="sqlDesc">
          <el-input
            v-model="states.form.sqlDesc"
            type="textarea"
            :rows="2"
            clearable
            placeholder="请输入说明"
          />
        </el-form-item>
        <el-form-item label="数据源" prop="dsId">
          <el-select v-model="states.form.dsId" class="w-full" placeholder="数据源">
            <el-option
              v-for="item in states.dsOptions"
              :key="item.value"
              :label="item.name"
              :value="item.value ?? ''"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="状态" prop="status">
          <el-switch
            v-model="states.form.status"
            inline-prompt
            active-value="EBL"
            inactive-value="DBL"
            inactive-text="禁用"
            active-text="启用"
          />
        </el-form-item>
      </el-form>
    </template>
  </CustomDialog>
</template>

<style lang="scss" scoped>
</style>
