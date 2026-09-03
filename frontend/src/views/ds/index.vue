<!--
 * @Author: Chuang
 * @Date: 2024-08-05
 * @LastEditTime: 2026-05-30 23:47:54
 * @LastEditors: Chuang
 * @Description: 数据源管理
-->
<script setup name="VisDatasets" lang="ts">
import type { BindFieldsDialogInstance } from './components/BindFieldsDialog.vue'
import type { ConfSqlDialogInstance } from './components/ConfSqlDialog.vue'
import { Plus, Search } from '@element-plus/icons-vue'
import { pickBy } from 'lodash-es'
import vis from '@/apis/vis/index'
import { useKeepAlive } from '@/hooks/layout'
import { useAccountStore } from '@/stores/modules/account'
import { getPageAfterDelete, showAlert, showConfirm, showToast } from '@/utils/index'
import { isBlank } from '@/utils/validate'
import BindFieldsDialog from './components/BindFieldsDialog.vue'
import { FUNCTION_DATASET_CONF } from './components/config'
import ConfSqlDialog from './components/ConfSqlDialog.vue'

interface IOption {
  name: string
  value: string
}
interface IStates {
  permission: Record<string, boolean>
  query: Record<string, any>
  loading: boolean
  pageNumber: number
  pageSize: number
  total: number
  records: VIS.ConfSqlInfo[]
  statusOptions: Array<IOption>
}

const { hasFunction } = useAccountStore()
const states = reactive<IStates>({
  query: {
    id: null,
    sqlName: null,
    sqlDesc: null,
    status: null,
  },
  loading: false,
  pageNumber: 1,
  pageSize: 15,
  total: 0,
  records: [],
  permission: {
    conf: hasFunction(FUNCTION_DATASET_CONF),
  },
  statusOptions: [
    {
      name: '启用',
      value: 'EBL',
    },
    {
      name: '禁用',
      value: 'DBL',
    },
  ],
})

const confSqlDialogRef = ref<ConfSqlDialogInstance>()
const bindFieldsDialogRef = ref<BindFieldsDialogInstance>()
const viewingSqlId = ref('')
const checkingDatasetId = ref('')
let requestId = 0

function fetchData() {
  const currentRequestId = ++requestId
  const params: VIS.QueryConfSqlRequest = {
    page: {
      pageNumber: states.pageNumber,
      pageSize: states.pageSize,
    },
    ...pickBy(states.query, value => !isBlank(value)),
  }
  states.loading = true
  vis.dataset.queryDatasets(params).then((res) => {
    if (currentRequestId !== requestId)
      return

    const { data } = res
    states.records = data?.records ?? []
    states.total = data?.total ?? 0
  }).finally(() => {
    if (currentRequestId === requestId)
      states.loading = false
  })
}

function handleQuery() {
  states.pageNumber = 1
  fetchData()
}

function handleCurrentChange(pageNumber: number) {
  states.pageNumber = pageNumber
  fetchData()
}

function handleAdd() {
  confSqlDialogRef.value?.showDialog()
}

function handleEdit(row: VIS.ConfSqlInfo) {
  confSqlDialogRef.value?.showDialog(row)
}

async function handleDelete(row: VIS.ConfSqlInfo) {
  if (!row.id)
    return
  checkingDatasetId.value = row.id
  try {
    const res = await vis.dataset.listDatasetCards({ datasetId: row.id })
    const cards = res.data?.list ?? []
    if (cards.length) {
      const names = cards.slice(0, 5).map(card => card.cardName).join('、')
      const suffix = cards.length > 5 ? ' 等' : ''
      showAlert(
        `该数据集被 ${cards.length} 张卡片引用，请先处理卡片：${names}${suffix}`,
        '无法删除数据集',
      )
      return
    }
    showConfirm('您确定要删除此数据集吗?', '删除确认', 'warning', () => {
      vis.dataset.delDataset({ ids: [row.id!] }).then((deleteRes) => {
        showToast(deleteRes.msg)
        states.pageNumber = getPageAfterDelete(states.pageNumber, states.pageSize, states.total)
        fetchData()
      })
    })
  }
  finally {
    checkingDatasetId.value = ''
  }
}

const router = useRouter()
function toEditScript(row: VIS.ConfSqlInfo) {
  router.push({
    name: 'VisDatasetEdit',
    query: {
      id: row.id,
    },
  })
}

async function handleViewFields(row: VIS.ConfSqlInfo) {
  viewingSqlId.value = row.id
  try {
    const res = await vis.dataset.listDatasetFields({ sqlId: row.id })
    bindFieldsDialogRef.value?.showView({
      fields: res.data ?? [],
    })
  }
  finally {
    viewingSqlId.value = ''
  }
}

useKeepAlive(['VisDatasetEdit'], fetchData)

onMounted(() => {
  handleQuery()
})
</script>

<template>
  <PageCard>
    <template #extra>
      <el-button
        v-if="states.permission.conf"
        :icon="Plus"
        type="primary"
        @click="handleAdd"
      >
        新增
      </el-button>
    </template>
    <template #default="scope">
      <el-form :model="states.query" @submit.prevent>
        <el-row :gutter="16">
          <el-col :span="3">
            <el-input v-model="states.query.id" placeholder="ID" clearable />
          </el-col>
          <el-col :span="3">
            <el-input v-model="states.query.sqlName" placeholder="名称" clearable />
          </el-col>
          <el-col :span="3">
            <el-select v-model="states.query.status" class="w-full" placeholder="状态" clearable>
              <el-option
                v-for="item in states.statusOptions"
                :key="item.value"
                :label="item.name"
                :value="item.value"
              />
            </el-select>
          </el-col>
          <el-col :span="3">
            <el-input v-model="states.query.sqlDesc" placeholder="备注" clearable />
          </el-col>
          <el-col :span="3" class="justify-between !flex">
            <el-button native-type="submit" :icon="Search" @click="handleQuery">
              查询
            </el-button>
          </el-col>
        </el-row>
      </el-form>
      <el-table
        v-spinner="states.loading"
        class="base-m-t"
        :border="true"
        :data="states.records"
        :max-height="scope.info.heightL1"
      >
        <el-table-column label="ID" width="100" prop="id" show-overflow-tooltip />
        <el-table-column label="名称" prop="sqlName" width="100" show-overflow-tooltip />
        <el-table-column label="数据源" width="100" prop="dsName" show-overflow-tooltip />
        <!-- @vue-generic {VIS.ConfSqlInfo} -->
        <el-table-column label="状态" width="80" align="center" prop="status">
          <template #default="{ row }">
            <el-tag v-if="row.status === 'EBL'" type="success">
              启用
            </el-tag>
            <el-tag v-else-if="row.status === 'DBL'" type="info">
              禁用
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="备注" prop="sqlDesc" show-overflow-tooltip />
        <!-- @vue-generic {VIS.ConfSqlInfo} -->
        <el-table-column label="操作" width="240" fixed="right">
          <template #default="{ row }">
            <el-button
              v-if="states.permission.conf"
              size="small"
              type="primary"
              link
              @click="handleEdit(row)"
            >
              编辑
            </el-button>
            <el-button
              v-if="states.permission.conf"
              size="small"
              type="primary"
              link
              @click="toEditScript(row)"
            >
              编辑脚本
            </el-button>
            <el-button
              v-if="states.permission.conf"
              size="small"
              type="primary"
              link
              :loading="viewingSqlId === row.id"
              @click="handleViewFields(row)"
            >
              字段
            </el-button>
            <el-button
              v-if="states.permission.conf"
              size="small"
              type="primary"
              link
              :loading="checkingDatasetId === row.id"
              @click="handleDelete(row)"
            >
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>
      <ConfSqlDialog ref="confSqlDialogRef" @fetch-data="fetchData" />
      <BindFieldsDialog ref="bindFieldsDialogRef" />
    </template>
    <template #footer>
      <el-pagination
        class="justify-end mtb-8px"
        :current-page="states.pageNumber"
        layout="total, prev, pager, next"
        :page-size="states.pageSize"
        :total="states.total"
        @current-change="handleCurrentChange"
      />
    </template>
  </PageCard>
</template>

<style lang="scss" scoped>
</style>
