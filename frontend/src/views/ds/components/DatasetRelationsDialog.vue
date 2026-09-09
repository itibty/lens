<script setup lang="ts">
import { listDatasetCards, listDatasetDashboards } from '@/apis/vis/dataset'
import CustomDialog from '@/components/CustomDialog.vue'
import { VIS_CARD_CONF, VIS_DASHBOARD_CONF } from '@/core/permCodes'
import { useAccountStore } from '@/stores/modules/account'

const { hasFunction } = useAccountStore()
const router = useRouter()
const visible = ref(false)
const dataset = reactive({ id: '', name: '' })
const activeTab = ref('cards')
const cards = ref<VIS.VisCardRefInfo[]>([])
const dashboards = ref<VIS.DatasetDashboardRefInfo[]>([])
const loading = reactive({ cards: false, dashboards: false })
const errors = reactive({ cards: false, dashboards: false })
const loaded = reactive({ cards: false, dashboards: false })
const pages = reactive({ cards: 1, dashboards: 1 })
const pageSize = 10
let session = 0
const cardRows = computed(() => cards.value.slice((pages.cards - 1) * pageSize, pages.cards * pageSize))
const dashboardRows = computed(() => dashboards.value.slice((pages.dashboards - 1) * pageSize, pages.dashboards * pageSize))
const referenceLabels: Record<string, string> = { CARD: '卡片', FILTER: '筛选条件', OPTIONS: '下拉选项' }

async function fetchTab(tab: 'cards' | 'dashboards') {
  if (loading[tab])
    return
  const current = session
  const id = dataset.id
  loading[tab] = true
  errors[tab] = false
  try {
    if (tab === 'cards') {
      const res = await listDatasetCards({ datasetId: id }, { showErrorMessage: false })
      if (current === session)
        cards.value = res.data?.list ?? []
    }
    else {
      const res = await listDatasetDashboards({ datasetId: id }, { showErrorMessage: false })
      if (current === session)
        dashboards.value = res.data?.list ?? []
    }
    if (current === session)
      loaded[tab] = true
  }
  catch {
    if (current === session)
      errors[tab] = true
  }
  finally {
    if (current === session)
      loading[tab] = false
  }
}

function showDialog(row: { id?: string, sqlName?: string }) {
  if (!row.id)
    return
  session++
  dataset.id = row.id
  dataset.name = row.sqlName || '未命名数据集'
  cards.value = []
  dashboards.value = []
  Object.assign(loading, { cards: false, dashboards: false })
  Object.assign(errors, { cards: false, dashboards: false })
  Object.assign(loaded, { cards: false, dashboards: false })
  Object.assign(pages, { cards: 1, dashboards: 1 })
  activeTab.value = 'cards'
  visible.value = true
  void fetchTab('cards')
  void fetchTab('dashboards')
}

function openItem(name: string, id?: string) {
  if (id)
    window.open(router.resolve({ name, query: { id } }).href, '_blank', 'noopener')
}

function groupedReferences(row: VIS.DatasetDashboardRefInfo) {
  return Object.entries(referenceLabels).flatMap(([type, label]) => {
    const names = [...new Set((row.references ?? []).filter(ref => ref.type === type).map(ref => ref.name).filter(Boolean))]
    return names.length ? [{ type, label, names: names.join('、') }] : []
  })
}

defineExpose({ showDialog })
</script>

<template>
  <CustomDialog
    v-model.visible="visible"
    :title="`「${dataset.name}」的关联`"
    size="big"
    :show-footer="false"
    append-to-body
    destroy-on-close
    @close="session++"
  >
    <template #custom-dialog-body>
      <el-tabs v-model="activeTab">
        <el-tab-pane :label="loaded.cards ? `关联卡片 (${cards.length})` : '关联卡片'" name="cards">
          <div v-if="errors.cards" class="relation-empty">
            <span>加载失败</span>
            <el-button link type="primary" @click="fetchTab('cards')">
              重试
            </el-button>
          </div>
          <el-table v-else v-spinner="loading.cards" :data="cardRows" max-height="420" empty-text="暂无关联卡片">
            <el-table-column prop="cardName" label="卡片名称" min-width="240" show-overflow-tooltip>
              <template #default="{ row }">
                <el-button v-if="hasFunction(VIS_CARD_CONF)" class="relation-link" link type="primary" @click="openItem('VisCardEdit', row.id)">
                  {{ row.cardName }}
                </el-button>
                <span v-else>{{ row.cardName }}</span>
              </template>
            </el-table-column>
            <el-table-column label="状态" width="100">
              <template #default="{ row }">
                <el-tag :type="row.status === 'EBL' ? 'success' : 'info'" size="small" effect="light">
                  {{ row.status === 'EBL' ? '启用' : '禁用' }}
                </el-tag>
              </template>
            </el-table-column>
          </el-table>
          <el-pagination v-if="!errors.cards && cards.length > pageSize" v-model:current-page="pages.cards" class="relation-pagination" :page-size="pageSize" :total="cards.length" layout="total, prev, pager, next" />
        </el-tab-pane>
        <el-tab-pane :label="loaded.dashboards ? `关联看板 (${dashboards.length})` : '关联看板'" name="dashboards">
          <div v-if="errors.dashboards" class="relation-empty">
            <span>加载失败</span>
            <el-button link type="primary" @click="fetchTab('dashboards')">
              重试
            </el-button>
          </div>
          <el-table v-else v-spinner="loading.dashboards" :data="dashboardRows" max-height="420" empty-text="暂无关联看板">
            <el-table-column prop="dashName" label="看板名称" min-width="170" show-overflow-tooltip>
              <template #default="{ row }">
                <el-button v-if="hasFunction(VIS_DASHBOARD_CONF)" class="relation-link" link type="primary" @click="openItem('VisDashboards', row.id)">
                  {{ row.dashName }}
                </el-button>
                <span v-else>{{ row.dashName }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="groupName" label="所属分组" min-width="120" show-overflow-tooltip />
            <el-table-column label="关联内容" min-width="280">
              <template #default="{ row }">
                <div v-for="reference in groupedReferences(row)" :key="reference.type" class="reference-row">
                  <el-tag size="small" type="info" effect="plain">
                    {{ reference.label }}
                  </el-tag>
                  <span>{{ reference.names }}</span>
                </div>
              </template>
            </el-table-column>
            <el-table-column label="状态" width="80">
              <template #default="{ row }">
                <el-tag :type="row.status === 'EBL' ? 'success' : 'info'" size="small" effect="light">
                  {{ row.status === 'EBL' ? '启用' : '禁用' }}
                </el-tag>
              </template>
            </el-table-column>
          </el-table>
          <el-pagination v-if="!errors.dashboards && dashboards.length > pageSize" v-model:current-page="pages.dashboards" class="relation-pagination" :page-size="pageSize" :total="dashboards.length" layout="total, prev, pager, next" />
        </el-tab-pane>
      </el-tabs>
    </template>
  </CustomDialog>
</template>

<style scoped lang="scss">
.relation-empty {
  min-height: 160px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: var(--el-text-color-secondary);
}
.relation-pagination {
  justify-content: flex-end;
  margin-top: 16px;
}
.relation-link {
  max-width: 100%;
  white-space: normal;
  text-align: left;
  overflow-wrap: anywhere;
}
.reference-row {
  display: flex;
  align-items: baseline;
  gap: 8px;
  padding: 3px 0;
  overflow-wrap: anywhere;
  .el-tag {
    flex-shrink: 0;
  }
}
</style>
