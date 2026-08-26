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
  retKey: '',
  dsId: '',
  tplEngine: 'ENJOY',
  status: 'EBL',
  execRoles: '',
  execUsers: '',
}

const states = reactive<IStates>({
  form: { ...defaultForm },
  dsOptions: [],
  rules: {
    sqlName: [
      { required: true, trigger: 'blur', message: '请输入数据集名称' },
    ],
    retKey: [
      { required: true, trigger: 'blur', message: '请输入响应字段名' },
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
      retKey: data.retKey,
      dsId: data.dsId,
      tplEngine: data.tplEngine,
      status: data.status,
      execRoles: data.execRoles || '',
      execUsers: data.execUsers || '',
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
function doSubmit() {
  formRef.value?.validate(async (valid) => {
    if (valid) {
      const body: unknown = pickBy(
        states.form,
        value => typeof value != 'string' || !isBlank(value),
      )
      dialog.confirmLoading = true

      vis.dataset.editDatasetInfo(body as VIS.ConfSqlInfoRequest).then((res) => {
        const { msg } = res
        showToast(msg, 'success')
        emits('fetchData')
        dialog.visible = false
      }).finally(() => {
        dialog.confirmLoading = false
      })
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
        <el-form-item label="结果字段" prop="retKey">
          <el-input
            v-model.trim="states.form.retKey"
            clearable
            placeholder="请输入结果字段"
          />
        </el-form-item>
        <el-form-item label="限制角色" prop="execRoles">
          <el-input
            v-model="states.form.execRoles"
            clearable
            placeholder="角色编码,多个用英文逗号分隔"
            type="textarea"
            :rows="3"
          />
        </el-form-item>
        <el-form-item label="限制用户" prop="execUsers">
          <el-input
            v-model="states.form.execUsers"
            clearable
            placeholder="用户ID,多个用英文逗号分隔"
            type="textarea"
            :rows="3"
          />
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
