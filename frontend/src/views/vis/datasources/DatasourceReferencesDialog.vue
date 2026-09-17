<script setup lang="ts">
import vis from '@/apis/vis'
import { VIS_DATASET_CONF } from '@/core/permCodes'
import { useAccountStore } from '@/stores/modules/account'

const router = useRouter()
const { hasFunction } = useAccountStore()
const visible = ref(false)
const loading = ref(false)
const failed = ref(false)
const source = ref<VIS.DatasourceInfo>({})
const rows = ref<VIS.DatasourceDatasetInfo[]>([])
const page = ref(1)
const pageSize = 10
const pageRows = computed(() => rows.value.slice((page.value - 1) * pageSize, page.value * pageSize))
let requestId = 0
async function fetchRows() {
  if (!source.value.id)
    return
  const current = ++requestId
  loading.value = true
  failed.value = false
  try {
    const { data } = await vis.datasource.listDatasourceDatasets({ datasourceId: source.value.id }, { showErrorMessage: false })
    if (current === requestId)
      rows.value = data?.list ?? []
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
function show(row: VIS.DatasourceInfo) {
  source.value = row
  rows.value = []
  page.value = 1
  visible.value = true
  void fetchRows()
}
function openDataset(id?: string) {
  if (id)
    window.open(router.resolve({ name: 'VisDatasetEdit', query: { id } }).href, '_blank', 'noopener')
}
defineExpose({ show })
</script>

<template>
  <CustomDialog v-model:visible="visible" :title="`${source.sourceName} · 数据集`" size="mini" append-to-body :show-footer="false" @close="requestId++">
    <template #custom-dialog-body>
      <div v-if="failed">
        <el-text type="info">
          加载失败
        </el-text>
        <el-button link type="primary" @click="fetchRows">
          重试
        </el-button>
      </div>
      <el-table v-else v-spinner="loading" :data="pageRows" empty-text="暂无引用数据集" max-height="400">
        <el-table-column label="数据集" prop="name" min-width="200">
          <template #default="{ row }">
            <el-button v-if="hasFunction(VIS_DATASET_CONF)" link type="primary" @click="openDataset(row.id)">
              {{ row.name }}
            </el-button>
            <span v-else>{{ row.name }}</span>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="90">
          <template #default="{ row }">
            <el-tag :type="row.status === 'EBL' ? 'success' : 'info'" size="small">
              {{ row.status === 'EBL' ? '启用' : '禁用' }}
            </el-tag>
          </template>
        </el-table-column>
      </el-table>
      <el-pagination v-if="!failed && rows.length > pageSize" v-model:current-page="page" class="mt-16px justify-end" :page-size="pageSize" :total="rows.length" layout="total, prev, pager, next" />
    </template>
  </CustomDialog>
</template>
