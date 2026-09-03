<!--
 * @Description: 可视化卡片列表
-->
<script setup name="VisCards" lang="ts">
import { Plus, Search } from '@element-plus/icons-vue'
import { pickBy } from 'lodash-es'
import vis from '@/apis/vis/index'
import { useKeepAlive } from '@/hooks/layout'
import { useAccountStore } from '@/stores/modules/account'
import { getPageAfterDelete, showConfirm, showToast } from '@/utils/index'
import { isBlank } from '@/utils/validate'
import { CHART_TYPE_OPTIONS } from '@/views/vis/charts'
import { resolveChartTypeCode } from '@/views/vis/shared/types'
import { FUNCTION_CARD_CONF } from './config'

defineOptions({ name: 'VisCards' })

interface IStates {
  permission: Record<string, boolean>
  query: Record<string, any>
  loading: boolean
  pageNumber: number
  pageSize: number
  total: number
  records: VIS.VisCardInfo[]
}

const { hasFunction } = useAccountStore()
const router = useRouter()
const states = reactive<IStates>({
  query: {
    id: null,
    cardName: null,
    chartType: null,
    status: null,
  },
  loading: false,
  pageNumber: 1,
  pageSize: 30,
  total: 0,
  records: [],
  permission: {
    write: hasFunction(FUNCTION_CARD_CONF),
  },
})

const chartTypeOptions = CHART_TYPE_OPTIONS

const chartTypeLabelMap = computed(() => {
  const map = new Map<string, string>()
  chartTypeOptions.forEach(item => map.set(item.value, item.label))
  return map
})

let requestId = 0

function chartTypeLabel(type?: string) {
  if (!type)
    return '-'
  return chartTypeLabelMap.value.get(resolveChartTypeCode(type) ?? '') || type
}

function fetchData() {
  const currentRequestId = ++requestId
  const params: VIS.QueryVisCardRequest = {
    page: {
      pageNumber: states.pageNumber,
      pageSize: states.pageSize,
    },
    ...pickBy(states.query, value => !isBlank(value)),
  }
  states.loading = true
  vis.card.queryCards(params).then((res) => {
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
  router.push({ name: 'VisCardEdit' })
}

const refDialog = reactive({
  visible: false,
  loading: false,
  cardName: '',
  list: [] as VIS.VisDashboardRefInfo[],
})

function handleEdit(row: VIS.VisCardInfo) {
  router.push({
    name: 'VisCardEdit',
    query: { id: row.id },
  })
}

function handleViewRefs(row: VIS.VisCardInfo) {
  if (!row.id)
    return
  refDialog.visible = true
  refDialog.cardName = row.cardName || String(row.id)
  refDialog.loading = true
  refDialog.list = []
  vis.card.listCardDashboards({ cardId: row.id }).then((res) => {
    refDialog.list = res.data?.list ?? []
  }).finally(() => {
    refDialog.loading = false
  })
}

function openDashPreview(row: { id?: string | number }) {
  const href = router.resolve({
    name: 'VisDashboardView',
    query: { id: String(row.id || '') },
  }).href
  window.open(href, '_blank')
}

function handleToggleStatus(row: VIS.VisCardInfo) {
  if (!row.id)
    return
  const statusTxt = row.status === 'EBL' ? '禁用' : '启用'
  showConfirm(
    `您确定要${statusTxt}卡片「${row.cardName || row.id}」吗？`,
    `${statusTxt}确认`,
    'warning',
    () => {
      vis.card.toggleCardStatus({ cardId: row.id! }).then((res) => {
        showToast(res.msg)
        fetchData()
      })
    },
  )
}

function handleDelete(row: VIS.VisCardInfo) {
  if (!row.id)
    return
  showConfirm(`确定删除卡片「${row.cardName || row.id}」吗？`, '删除确认', 'warning', () => {
    vis.card.delCard({ ids: [row.id!] }).then((res) => {
      showToast(res.msg)
      states.pageNumber = getPageAfterDelete(states.pageNumber, states.pageSize, states.total)
      fetchData()
    })
  })
}

useKeepAlive(['VisCardEdit'], fetchData)

onMounted(() => {
  handleQuery()
})
</script>

<template>
  <div class="h-full">
    <PageCard>
      <template #extra>
        <el-button
          v-if="states.permission.write"
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
              <el-input v-model="states.query.cardName" placeholder="名称" clearable />
            </el-col>
            <el-col :span="3">
              <el-select v-model="states.query.chartType" class="w-full" placeholder="图表类型" clearable>
                <el-option
                  v-for="item in chartTypeOptions"
                  :key="item.value"
                  :label="item.label"
                  :value="item.value"
                />
              </el-select>
            </el-col>
            <el-col :span="3">
              <el-select v-model="states.query.status" class="w-full" placeholder="状态" clearable>
                <el-option label="启用" value="EBL" />
                <el-option label="禁用" value="DBL" />
              </el-select>
            </el-col>
            <el-col :span="3">
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
          <el-table-column label="ID" prop="id" width="100" show-overflow-tooltip />
          <el-table-column label="类型" width="100">
            <template #default="{ row }">
              {{ chartTypeLabel(row.chartType) }}
            </template>
          </el-table-column>
          <el-table-column label="名称" prop="cardName" show-overflow-tooltip />
          <el-table-column label="描述" prop="cardDesc" show-overflow-tooltip />
          <el-table-column label="状态" width="80" align="center" prop="status">
            <template #default="{ row }">
              <el-tag v-if="row.status === 'EBL'" type="success">
                启用
              </el-tag>
              <el-tag v-else-if="row.status === 'DBL'" type="info">
                禁用
              </el-tag>
              <span v-else>-</span>
            </template>
          </el-table-column>
          <el-table-column label="修改时间" prop="modifyAt" width="180" show-overflow-tooltip />
          <!-- @vue-generic {VIS.VisCardInfo} -->
          <el-table-column label="操作" width="220" fixed="right">
            <template #default="{ row }">
              <el-button
                size="small"
                type="primary"
                link
                @click="handleEdit(row)"
              >
                编辑
              </el-button>
              <el-button
                v-if="states.permission.write"
                size="small"
                type="primary"
                link
                @click="handleToggleStatus(row)"
              >
                {{ row.status === 'EBL' ? '禁用' : '启用' }}
              </el-button>
              <el-button
                v-if="states.permission.write"
                size="small"
                type="primary"
                link
                @click="handleDelete(row)"
              >
                删除
              </el-button>
              <el-button
                size="small"
                type="primary"
                link
                @click="handleViewRefs(row)"
              >
                看板
              </el-button>
            </template>
          </el-table-column>
        </el-table>
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

    <CustomDialog
      v-model.visible="refDialog.visible"
      :title="`引用「${refDialog.cardName}」的看板`"
      size="small"
      :show-footer="false"
      destroy-on-close
    >
      <template #custom-dialog-body>
        <el-table
          v-spinner="refDialog.loading"
          :data="refDialog.list"
          :border="true"
          max-height="420"
          empty-text="暂无引用该卡片的看板"
        >
          <el-table-column label="名称" prop="dashName" min-width="160" show-overflow-tooltip>
            <template #default="{ row }">
              <el-button
                type="primary"
                link
                @click="openDashPreview(row)"
              >
                {{ row.dashName || row.id }}
              </el-button>
            </template>
          </el-table-column>
          <el-table-column label="状态" width="80" align="center">
            <template #default="{ row }">
              <el-tag v-if="row.status === 'EBL'" type="success">
                启用
              </el-tag>
              <el-tag v-else-if="row.status === 'DBL'" type="info">
                禁用
              </el-tag>
              <span v-else>-</span>
            </template>
          </el-table-column>
          <el-table-column label="修改时间" prop="modifyAt" width="180" show-overflow-tooltip />
        </el-table>
      </template>
    </CustomDialog>
  </div>
</template>
