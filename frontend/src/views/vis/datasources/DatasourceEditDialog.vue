<script setup lang="ts">
import type { FormInstance, FormRules } from 'element-plus'
import type { DatasourceDraft } from './datasourceModel'
import vis from '@/apis/vis'
import { showToast } from '@/utils'
import { apiErrorMessage } from '@/views/vis/shared/visRequest'
import { connectionRequest, DATABASE_TYPES, isDialogCancel, withImpactConfirmation } from './datasourceModel'

const emit = defineEmits<{ saved: [] }>()
const visible = ref(false)
const loading = ref(false)
const submitting = ref(false)
const testing = ref(false)
const busy = computed(() => loading.value || submitting.value || testing.value)
const formRef = ref<FormInstance>()
const form = reactive<DatasourceDraft>({ sourceName: '', dbType: 'MYSQL', jdbcUrl: '', username: '', password: '' })
const changePassword = ref(true)
const passwordSet = ref(false)
const result = ref<VIS.DatasourceTestResult>()
const placeholder = computed(() => DATABASE_TYPES.find(type => type.value === form.dbType)?.placeholder)
const rules: FormRules<DatasourceDraft> = {
  sourceName: [{ required: true, whitespace: true, message: '请输入名称', trigger: 'blur' }],
  dbType: [{ required: true, message: '请选择类型', trigger: 'change' }],
  jdbcUrl: [{ required: true, whitespace: true, message: '请输入 JDBC URL', trigger: 'blur' }],
  username: [{ required: true, whitespace: true, message: '请输入用户名', trigger: 'blur' }],
}
let requestId = 0
watch(() => [form.dbType, form.jdbcUrl, form.username, form.password, changePassword.value], () => {
  result.value = undefined
})

async function show(id?: string) {
  const current = ++requestId
  Object.assign(form, { id, sourceName: '', dbType: 'MYSQL', jdbcUrl: '', username: '', password: '' })
  changePassword.value = !id
  passwordSet.value = false
  result.value = undefined
  visible.value = true
  loading.value = !!id
  await nextTick()
  formRef.value?.clearValidate()
  if (!id)
    return
  try {
    const { data } = await vis.datasource.getDatasourceDetail({ datasourceId: id }, { showErrorMessage: false })
    if (current !== requestId)
      return
    if (!data)
      throw new Error('数据源不存在')
    Object.assign(form, { sourceName: data.sourceName, dbType: data.dbType, jdbcUrl: data.jdbcUrl, username: data.username })
    passwordSet.value = !!data.passwordSet
  }
  catch (error) {
    if (current === requestId) {
      showToast(apiErrorMessage(error, '加载失败'), 'error')
      visible.value = false
    }
  }
  finally {
    if (current === requestId)
      loading.value = false
  }
}

async function testConnection() {
  if (busy.value || !formRef.value)
    return
  testing.value = true
  result.value = undefined
  try {
    if (!(await formRef.value.validateField(['dbType', 'jdbcUrl', 'username']).catch(() => false)))
      return
    const { data } = await vis.datasource.testDatasource(connectionRequest(form, changePassword.value), { showErrorMessage: false })
    result.value = data
  }
  catch (error) {
    result.value = { success: false, message: apiErrorMessage(error, '测试失败') }
  }
  finally {
    testing.value = false
  }
}

async function save() {
  if (busy.value || !formRef.value)
    return
  submitting.value = true
  try {
    if (!(await formRef.value.validate().catch(() => false)))
      return
    const body = { ...connectionRequest(form, changePassword.value), sourceName: form.sourceName.trim() }
    await withImpactConfirmation(confirmImpact => vis.datasource.editDatasource({ ...body, confirmImpact }, { showErrorMessage: false }))
    showToast('保存成功', 'success')
    visible.value = false
    emit('saved')
  }
  catch (error) {
    if (!isDialogCancel(error))
      showToast(apiErrorMessage(error, '保存失败'), 'error')
  }
  finally {
    submitting.value = false
  }
}

function onClosed() {
  requestId++
  form.password = ''
  result.value = undefined
}

defineExpose({ show })
</script>

<template>
  <CustomDialog
    v-model:visible="visible" :title="form.id ? '编辑数据源' : '新增数据源'" size="mini" append-to-body
    is-custom-footer :show-close="!busy" :close-on-click-modal="!busy" :close-on-press-escape="!busy"
    @closed="onClosed"
  >
    <template #custom-dialog-body>
      <el-form ref="formRef" v-spinner="loading" :model="form" :rules="rules" :disabled="busy" label-position="top">
        <el-form-item label="名称" prop="sourceName">
          <el-input v-model="form.sourceName" :maxlength="50" clearable />
        </el-form-item>
        <el-form-item label="类型" prop="dbType">
          <el-radio-group v-model="form.dbType">
            <el-radio-button v-for="type in DATABASE_TYPES" :key="type.value" :value="type.value">
              {{ type.label }}
            </el-radio-button>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="JDBC URL" prop="jdbcUrl">
          <el-input v-model="form.jdbcUrl" :placeholder="placeholder" type="textarea" :rows="2" :maxlength="500" />
        </el-form-item>
        <el-form-item label="用户名" prop="username">
          <el-input v-model="form.username" :maxlength="100" autocomplete="off" />
        </el-form-item>
        <el-form-item label="密码" prop="password">
          <div class="password-field">
            <el-checkbox v-if="form.id" v-model="changePassword">
              修改密码
            </el-checkbox>
            <el-input v-if="changePassword" v-model="form.password" type="password" show-password :maxlength="200" placeholder="留空使用空密码" autocomplete="new-password" />
            <el-text v-else type="info" size="small">
              {{ passwordSet ? '已设置' : '空密码' }}
            </el-text>
          </div>
        </el-form-item>
      </el-form>
      <div v-if="result" class="test-result" :class="{ 'is-error': !result.success }" role="status">
        <span>{{ result.message }}</span>
        <span v-if="result.elapsedMs != null">{{ result.elapsedMs }} ms</span>
      </div>
    </template>
    <template #custom-dialog-footer>
      <div class="dialog-actions">
        <el-button :loading="testing" :disabled="loading || submitting" @click="testConnection">
          测试连接
        </el-button>
        <div>
          <el-button :disabled="busy" @click="visible = false">
            取消
          </el-button>
          <el-button type="primary" :loading="submitting" :disabled="loading || testing" @click="save">
            保存
          </el-button>
        </div>
      </div>
    </template>
  </CustomDialog>
</template>

<style scoped lang="scss">
.password-field {
  display: flex;
  gap: 12px;
  align-items: center;
  width: 100%;
}
.dialog-actions {
  display: flex;
  justify-content: space-between;
}
.test-result {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  color: var(--el-color-success);
  font-size: 13px;
  &.is-error {
    color: var(--el-color-danger);
  }
}
</style>
