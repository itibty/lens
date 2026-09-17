<script setup lang="ts">
import { MoreFilled, Plus, Search } from '@element-plus/icons-vue'
import { ElMessageBox } from 'element-plus'
import vis from '@/apis/vis'
import { showToast } from '@/utils'
import { apiErrorMessage } from '@/views/vis/shared/visRequest'
import DatasourceEditDialog from './DatasourceEditDialog.vue'
import { DATABASE_TYPES, databaseTypeLabel, isDialogCancel, withImpactConfirmation } from './datasourceModel'
import DatasourceReferencesDialog from './DatasourceReferencesDialog.vue'

defineOptions({ name: 'VisDatasources' })
const query = reactive({ keyword: '', dbType: '', status: '' })
const rows = ref<VIS.DatasourceInfo[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = 15
const loading = ref(false)
const failed = ref(false)
type DatasourceAction = 'test' | 'status' | 'delete'
const pendingAction = ref<{ id: string, action: DatasourceAction }>()
const busy = computed(() => !!pendingAction.value)
const results = ref<Record<string, VIS.DatasourceTestResult>>({})
const editRef = ref<InstanceType<typeof DatasourceEditDialog>>()
const referencesRef = ref<InstanceType<typeof DatasourceReferencesDialog>>()
let requestId = 0
async function fetchRows() {
  const current = ++requestId
  loading.value = true
  failed.value = false
  try {
    const { data } = await vis.datasource.queryDatasources({
      page: { pageNumber: page.value, pageSize },
      keyword: query.keyword.trim() || undefined,
      dbType: query.dbType || undefined,
      status: query.status || undefined,
    }, { showErrorMessage: false })
    if (current === requestId) {
      rows.value = data?.records ?? []
      total.value = data?.total ?? 0
    }
  }
  catch {
    if (current === requestId)
      failed.value = true
  }
  finally {
    if (current === requestId)
      loading.value = false
  }
}
function search() {
  page.value = 1
  void fetchRows()
}
function onSaved() {
  results.value = {}
  void fetchRows()
}
async function testConnection(row: VIS.DatasourceInfo) {
  if (!row.id || busy.value)
    return
  pendingAction.value = { id: row.id, action: 'test' }
  delete results.value[row.id]
  try {
    const { data: source } = await vis.datasource.getDatasourceDetail({ datasourceId: row.id }, { showErrorMessage: false })
    if (!source?.dbType || !source.jdbcUrl || !source.username)
      throw new Error('数据源不存在')
    const { data } = await vis.datasource.testDatasource({ id: row.id, dbType: source.dbType, jdbcUrl: source.jdbcUrl, username: source.username }, { showErrorMessage: false })
    if (data)
      results.value[row.id] = data
  }
  catch (error) {
    results.value[row.id] = { success: false, message: apiErrorMessage(error, '测试失败') }
  }
  finally {
    pendingAction.value = undefined
  }
}
async function handleCommand(action: Exclude<DatasourceAction, 'test'>, row: VIS.DatasourceInfo) {
  if (!row.id || busy.value)
    return
  const id = row.id
  pendingAction.value = { id, action }
  try {
    if (action === 'delete') {
      await ElMessageBox.confirm(`删除数据源「${row.sourceName}」？`, '删除数据源', { type: 'warning' })
      await vis.datasource.delDatasource({ datasourceId: id }, { showErrorMessage: false })
      if (rows.value.length === 1 && page.value > 1)
        page.value--
    }
    else {
      const status = row.status === 'EBL' ? 'DBL' : 'EBL'
      await withImpactConfirmation(confirmImpact => vis.datasource.setDatasourceStatus({ id, status, confirmImpact }, { showErrorMessage: false }))
    }
    delete results.value[id]
    showToast('操作成功', 'success')
    await fetchRows()
  }
  catch (error) {
    if (!isDialogCancel(error))
      showToast(apiErrorMessage(error, '操作失败'), 'error')
  }
  finally {
    pendingAction.value = undefined
  }
}
onMounted(fetchRows)
</script>

<template>
  <PageCard>
    <template #extra>
      <el-button type="primary" :icon="Plus" @click="editRef?.show()">
        新增
      </el-button>
    </template>
    <template #default="scope">
      <el-form class="source-filters" :model="query" inline @submit.prevent="search">
        <el-form-item>
          <el-input v-model="query.keyword" placeholder="名称" clearable :maxlength="50" />
        </el-form-item>
        <el-form-item>
          <el-select v-model="query.dbType" placeholder="类型" clearable class="!w-150px">
            <el-option v-for="type in DATABASE_TYPES" :key="type.value" :value="type.value" :label="type.label" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-select v-model="query.status" placeholder="状态" clearable class="!w-120px">
            <el-option value="EBL" label="启用" />
            <el-option value="DBL" label="禁用" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button :icon="Search" native-type="submit">
            查询
          </el-button>
        </el-form-item>
      </el-form>
      <div v-if="failed" class="source-error">
        加载失败
        <el-button link type="primary" @click="fetchRows">
          重试
        </el-button>
      </div>
      <el-table v-else v-spinner="loading" :data="rows" :max-height="scope.info.heightL1" border>
        <el-table-column prop="sourceName" label="名称" min-width="160" show-overflow-tooltip />
        <el-table-column label="类型" width="120">
          <template #default="{ row }">
            {{ databaseTypeLabel(row.dbType) }}
          </template>
        </el-table-column>
        <el-table-column prop="jdbcUrl" label="连接地址" min-width="260" show-overflow-tooltip>
          <template #default="{ row }">
            <div class="source-url">
              {{ row.jdbcUrl }}
            </div>
            <el-tooltip v-if="results[row.id]" :content="results[row.id]?.message" placement="top">
              <span class="source-test" :class="{ 'is-error': !results[row.id]?.success }">
                {{ results[row.id]?.success ? '连接成功' : '连接失败' }}<template v-if="results[row.id]?.elapsedMs != null"> · {{ results[row.id]?.elapsedMs }} ms</template>
              </span>
            </el-tooltip>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="90">
          <template #default="{ row }">
            <el-tag :type="row.status === 'EBL' ? 'success' : 'info'" size="small">
              {{ row.status === 'EBL' ? '启用' : '禁用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="数据集" width="90" align="center">
          <template #default="{ row }">
            <el-button link type="primary" @click="referencesRef?.show(row)">
              {{ row.datasetCount ?? 0 }}
            </el-button>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="205" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" :disabled="busy" @click="editRef?.show(row.id)">
              编辑
            </el-button>
            <el-button link type="primary" :loading="pendingAction?.action === 'test' && pendingAction.id === row.id" :disabled="busy" @click="testConnection(row)">
              测试连接
            </el-button>
            <el-dropdown trigger="click" :disabled="busy" @command="handleCommand($event, row)">
              <el-button class="source-more" link :icon="MoreFilled" aria-label="更多操作" />
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="status">
                    {{ row.status === 'EBL' ? '禁用' : '启用' }}
                  </el-dropdown-item>
                  <el-dropdown-item command="delete" divided :disabled="!!row.datasetCount">
                    删除
                  </el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </template>
        </el-table-column>
      </el-table>
      <DatasourceEditDialog ref="editRef" @saved="onSaved" />
      <DatasourceReferencesDialog ref="referencesRef" />
    </template>
    <template #footer>
      <el-pagination v-model:current-page="page" class="justify-end mtb-8px" :page-size="pageSize" :total="total" layout="total, prev, pager, next" @current-change="fetchRows" />
    </template>
  </PageCard>
</template>

<style scoped lang="scss">
.source-filters :deep(.el-form-item) {
  margin-right: 16px;
}
.source-url {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.source-test {
  color: var(--el-color-success);
  font-size: 12px;
  &.is-error {
    color: var(--el-color-danger);
  }
}
.source-more {
  margin-left: 12px;
}
.source-error {
  padding: 32px;
  text-align: center;
  color: var(--el-text-color-secondary);
}
</style>
