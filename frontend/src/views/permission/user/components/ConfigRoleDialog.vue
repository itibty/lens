<!--
 * @Description: 账号配置角色（含有效期）
-->
<script setup lang="ts">
import type { FormInstance, FormRules } from 'element-plus'
import type { CustomDialogProps } from '@/components/CustomDialog.vue'
import { toRaw } from 'vue'
import { queryRoles } from '@/apis/admin/role'
import { resetUserRoles } from '@/apis/admin/user'
import CustomDialog from '@/components/CustomDialog.vue'
import TableForm from '@/components/form/TableForm.vue'
import { showToast } from '@/utils/index'
import { isBlank } from '@/utils/validate'

export interface ConfigRoleDialogInstance {
  showDialog: (row: ADMIN.UserInfo) => void
}

type RoleRow = ADMIN.UserRoleInfo & { dateRange?: number[] }

interface IStates {
  form: ADMIN.ResetRolesRequest
  dataLoading: boolean
  roleOptions: ADMIN.RoleInfo[]
  roleTpl: RoleRow
  rules: FormRules<ADMIN.ResetRolesRequest>
}

const emits = defineEmits<{
  (e: 'fetchData'): void
}>()

const defaultForm: ADMIN.ResetRolesRequest = {
  userId: '',
  roleInfos: [],
}

const states = reactive<IStates>({
  form: { ...defaultForm },
  dataLoading: false,
  roleOptions: [],
  roleTpl: {
    roleId: '',
    roleName: '',
    startAt: undefined,
    endAt: undefined,
  },
  rules: {
    roleInfos: [
      {
        validator: (_rule, value: RoleRow[] | null, callback: (error?: Error) => void) => {
          if (!value?.length) {
            callback()
            return
          }
          if (value.some(item => isBlank(String(item.roleId || '')))) {
            callback(new Error('请选择角色'))
            return
          }
          callback()
        },
        trigger: 'change',
      },
    ],
  },
})

const defaultTimeRange: [Date, Date] = [
  new Date(2000, 1, 1, 0, 0, 0),
  new Date(2000, 1, 1, 23, 59, 59),
]

const formRef = ref<FormInstance>()
let requestId = 0
const dialog = reactive<CustomDialogProps>({
  visible: false,
  size: 'small',
  title: '配置角色',
  confirmLoading: false,
  cancelText: '取消',
  confirmText: '保存',
  handlerCancel: () => {
    dialog.visible = false
  },
  handlerConfirm: () => {
    doSubmit()
  },
})

function toMillis(value?: string | number) {
  if (value === undefined || value === null || value === '')
    return undefined
  const n = Number(value)
  return Number.isFinite(n) ? n : undefined
}

function handleClose() {
  requestId += 1
  states.dataLoading = false
  states.roleOptions = []
  states.form = { ...defaultForm }
  formRef.value?.clearValidate()
}

async function fetchOptions() {
  const currentRequestId = ++requestId
  states.dataLoading = true
  try {
    const res = await queryRoles({ page: { pageNumber: 1, pageSize: 200 }, status: 'EBL' })
    if (currentRequestId !== requestId)
      return
    states.roleOptions = res.data?.records ?? []
  }
  finally {
    if (currentRequestId === requestId)
      states.dataLoading = false
  }
}

function showDialog(row: ADMIN.UserInfo) {
  states.form.userId = row.id || ''
  states.form.roleInfos = (row.roleInfos ?? (row.roleIds ?? []).map(roleId => ({ roleId }))).map((item) => {
    const startAt = toMillis('startAt' in item ? item.startAt : undefined)
    const endAt = toMillis('endAt' in item ? item.endAt : undefined)
    return {
      ...item,
      dateRange: startAt && endAt ? [startAt, endAt] : undefined,
    } as RoleRow
  })
  dialog.visible = true
  void fetchOptions()
}

function doSubmit() {
  formRef.value?.validate(async (valid) => {
    if (!valid)
      return
    dialog.confirmLoading = true
    const body = structuredClone(toRaw(states.form))
    for (const item of (body.roleInfos ?? []) as RoleRow[]) {
      const dateRange = item.dateRange
      if (dateRange && dateRange.length === 2) {
        item.startAt = dateRange[0]
        item.endAt = dateRange[1]
      }
      else {
        delete item.startAt
        delete item.endAt
      }
      const matched = states.roleOptions.find(option => String(option.id) === String(item.roleId))
      if (!matched || matched.status === 'DBL') {
        showToast(`角色已被禁用或删除，请重新配置`, 'warning')
        dialog.confirmLoading = false
        return
      }
      item.roleName = matched.roleName
      delete item.dateRange
    }
    resetUserRoles(body)
      .then((res) => {
        showToast(res.msg, 'success')
        emits('fetchData')
        dialog.visible = false
      })
      .finally(() => {
        dialog.confirmLoading = false
      })
  })
}

defineExpose({
  showDialog,
})
</script>

<template>
  <CustomDialog
    v-bind="{ ...dialog }"
    v-model.visible="dialog.visible"
    @closed="handleClose"
  >
    <template #custom-dialog-body>
      <el-form ref="formRef" :model="states.form" :rules="states.rules">
        <el-form-item prop="roleInfos">
          <TableForm
            v-model="states.form.roleInfos"
            :add-template="states.roleTpl"
            drag-sort
          >
            <el-table-column prop="roleId" label="角色" width="180">
              <template #default="scope">
                <el-select
                  v-model="scope.row.roleId"
                  clearable
                  filterable
                  placeholder="请选择角色"
                >
                  <el-option
                    v-for="item in states.roleOptions"
                    :key="item.id"
                    :label="item.roleName"
                    :disabled="item.status === 'DBL'"
                    :value="item.id!"
                  />
                </el-select>
              </template>
            </el-table-column>
            <el-table-column prop="startAt" label="有效期">
              <template #default="scope">
                <el-date-picker
                  v-model="scope.row.dateRange"
                  type="datetimerange"
                  value-format="x"
                  range-separator="至"
                  start-placeholder="开始日期"
                  end-placeholder="结束日期"
                  :default-time="defaultTimeRange"
                />
              </template>
            </el-table-column>
          </TableForm>
        </el-form-item>
      </el-form>
    </template>
  </CustomDialog>
</template>
