<!--
 * @Description: 按某次运行的结果列确认字段目录（单表，确定后覆盖）
-->
<script setup lang="ts">
import type { CustomDialogProps } from '@/components/CustomDialog.vue'

export interface BindFieldsDialogInstance {
  showDialog: (payload: {
    columns: VIS.DebugSqlColumn[]
    saved?: VIS.ConfSqlFieldInfo[]
  }) => Promise<VIS.ConfSqlFieldItem[] | null>
  showView: (payload: { fields: VIS.ConfSqlFieldInfo[] }) => void
}

type FieldDataType = VIS.ConfSqlFieldItem['dataType']
type FieldRole = VIS.ConfSqlFieldItem['suggestRole']

interface BindFieldRow {
  field: string
  dataType: FieldDataType
  suggestRole: FieldRole
  jdbcType?: string
  remark: string
}

const DATA_TYPE_OPTIONS: Array<{ label: string, value: FieldDataType }> = [
  { label: '字符串', value: 'STRING' },
  { label: '数字', value: 'NUMBER' },
  { label: '日期', value: 'DATE' },
  { label: '日期时间', value: 'DATETIME' },
]

const ROLE_LABELS: Record<FieldRole, string> = {
  DIMENSION: '维度',
  METRIC: '指标',
}

const DATA_TYPE_LABELS: Record<FieldDataType, string> = {
  STRING: '字符串',
  NUMBER: '数字',
  DATE: '日期',
  DATETIME: '日期时间',
}

const mode = ref<'edit' | 'view'>('edit')
const rows = ref<BindFieldRow[]>([])
let settle: ((fields: VIS.ConfSqlFieldItem[] | null) => void) | null = null

const dialog = reactive<CustomDialogProps>({
  visible: false,
  size: '',
  width: '920px',
  title: '绑定字段',
  cancelText: '取消',
  confirmText: '确定',
  appendToBody: true,
  destroyOnClose: true,
  lockScroll: false,
  handlerCancel: closeAsCancel,
  handlerConfirm: confirmEdit,
})

function closeAsCancel() {
  resolvePending(null)
  dialog.visible = false
}

function confirmEdit() {
  resolvePending(collectFields())
  dialog.visible = false
}

function applyEditChrome() {
  mode.value = 'edit'
  dialog.title = '绑定字段'
  dialog.cancelText = '取消'
  dialog.handlerCancel = closeAsCancel
  dialog.handlerConfirm = confirmEdit
}

function applyViewChrome() {
  mode.value = 'view'
  dialog.title = '字段绑定'
  dialog.cancelText = '关闭'
  dialog.handlerCancel = () => {
    dialog.visible = false
  }
  dialog.handlerConfirm = undefined
}

function asDataType(value?: string): FieldDataType {
  if (value === 'NUMBER' || value === 'DATE' || value === 'DATETIME' || value === 'STRING')
    return value
  return 'STRING'
}

function asRole(value?: string): FieldRole {
  if (value === 'METRIC' || value === 'DIMENSION')
    return value
  return 'DIMENSION'
}

function roleLabel(value?: string) {
  return ROLE_LABELS[asRole(value)]
}

function dataTypeLabel(value?: string) {
  return DATA_TYPE_LABELS[asDataType(value)]
}

function toRows(columns: VIS.DebugSqlColumn[], saved: VIS.ConfSqlFieldInfo[] = []): BindFieldRow[] {
  const bySaved = new Map(
    saved.filter(item => item.field).map(item => [item.field, item]),
  )
  return columns
    .filter((item): item is VIS.DebugSqlColumn & { field: string } => !!item.field)
    .map((item) => {
      const exist = bySaved.get(item.field)
      return {
        field: item.field,
        dataType: asDataType(exist?.dataType ?? item.dataType),
        suggestRole: asRole(exist?.suggestRole ?? item.suggestRole),
        jdbcType: item.jdbcType,
        remark: exist?.remark ?? item.remark ?? '',
      }
    })
}

function collectFields(): VIS.ConfSqlFieldItem[] {
  return rows.value.map((row) => {
    const remark = row.remark.trim()
    return {
      field: row.field,
      dataType: row.dataType,
      suggestRole: row.suggestRole,
      ...(remark ? { remark } : {}),
    }
  })
}

function resolvePending(fields: VIS.ConfSqlFieldItem[] | null) {
  const done = settle
  settle = null
  done?.(fields)
}

function showDialog(payload: {
  columns: VIS.DebugSqlColumn[]
  saved?: VIS.ConfSqlFieldInfo[]
}): Promise<VIS.ConfSqlFieldItem[] | null> {
  resolvePending(null)
  applyEditChrome()
  rows.value = toRows(payload.columns, payload.saved)
  dialog.visible = true
  return new Promise((resolve) => {
    settle = resolve
  })
}

function showView(payload: { fields: VIS.ConfSqlFieldInfo[] }) {
  resolvePending(null)
  applyViewChrome()
  rows.value = toRows(payload.fields)
  dialog.visible = true
}

defineExpose<BindFieldsDialogInstance>({
  showDialog,
  showView,
})
</script>

<template>
  <CustomDialog
    v-bind="{ ...dialog }"
    v-model.visible="dialog.visible"
    @closed="resolvePending(null)"
  >
    <template #custom-dialog-body>
      <div class="bind-fields">
        <div
          v-if="!rows.length"
          class="bind-fields__empty"
        >
          {{ mode === 'view' ? '尚未绑定字段，运行并保存后才会写入目录' : '没有可绑定的字段，确定将清空目录' }}
        </div>

        <el-table
          v-else
          :data="rows"
          size="small"
          border
        >
          <el-table-column prop="field" label="列名" width="160" show-overflow-tooltip />
          <el-table-column
            v-if="mode === 'edit'"
            prop="jdbcType"
            label="JDBC"
            show-overflow-tooltip
          />
          <el-table-column label="维度 / 指标" align="center">
            <template #default="{ row }">
              <el-radio-group
                v-if="mode === 'edit'"
                v-model="row.suggestRole"
                size="small"
              >
                <el-radio value="DIMENSION">
                  维度
                </el-radio>
                <el-radio value="METRIC">
                  指标
                </el-radio>
              </el-radio-group>
              <span v-else>{{ roleLabel(row.suggestRole) }}</span>
            </template>
          </el-table-column>
          <el-table-column label="类型" width="128">
            <template #default="{ row }">
              <el-select
                v-if="mode === 'edit'"
                v-model="row.dataType"
                class="w-full"
              >
                <el-option
                  v-for="opt in DATA_TYPE_OPTIONS"
                  :key="opt.value"
                  :label="opt.label"
                  :value="opt.value"
                />
              </el-select>
              <span v-else>{{ dataTypeLabel(row.dataType) }}</span>
            </template>
          </el-table-column>
          <el-table-column label="说明" min-width="180">
            <template #default="{ row }">
              <el-input
                v-if="mode === 'edit'"
                v-model="row.remark"
                maxlength="200"
                placeholder="请输入"
              />
              <span v-else>{{ row.remark || '—' }}</span>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </template>
  </CustomDialog>
</template>

<style scoped lang="scss">
.bind-fields {
  max-height: 60vh;
  overflow: auto;

  &__empty {
    padding: 24px 0;
    text-align: center;
    font-size: 13px;
    color: var(--el-text-color-placeholder);
  }

  :deep(.el-radio) {
    margin-right: 12px;
    height: auto;
  }
}
</style>
