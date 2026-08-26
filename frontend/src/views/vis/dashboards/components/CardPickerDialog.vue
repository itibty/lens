<!--
 * @Description: 看板选卡弹窗（独立搜索列表，不复用卡片列表页）
-->
<script setup lang="ts">
import { Search } from '@element-plus/icons-vue'
import { pickBy } from 'lodash-es'
import vis from '@/apis/vis/index'
import { isBlank } from '@/utils/validate'
import { CHART_TYPE_OPTIONS } from '@/views/vis/charts'
import { resolveChartTypeCode } from '@/views/vis/shared/types'

const props = defineProps<{
  excludeIds?: string[]
}>()

const emit = defineEmits<{
  confirm: [cards: VIS.VisCardInfo[]]
}>()

const visible = defineModel<boolean>('visible', { required: true })

const keyword = ref('')
const chartType = ref<string>('')
const loading = ref(false)
const pageNumber = ref(1)
const pageSize = 10
const total = ref(0)
const records = ref<VIS.VisCardInfo[]>([])
const selected = ref<VIS.VisCardInfo[]>([])
let requestId = 0

const exclude = computed(() => new Set((props.excludeIds ?? []).map(String)))
const chartTypeLabelMap = computed(() => {
  const map = new Map<string, string>()
  CHART_TYPE_OPTIONS.forEach(item => map.set(item.value, item.label))
  return map
})

function chartTypeLabel(type?: string) {
  if (!type)
    return '-'
  return chartTypeLabelMap.value.get(resolveChartTypeCode(type) ?? '') || type
}

function fetchData() {
  const current = ++requestId
  const params: VIS.QueryVisCardRequest = {
    page: { pageNumber: pageNumber.value, pageSize },
    ...pickBy({
      cardName: keyword.value.trim() || null,
      chartType: chartType.value || null,
    }, value => !isBlank(value)),
  }
  loading.value = true
  vis.card.queryCards(params).then((res) => {
    if (current !== requestId)
      return
    records.value = res.data?.records ?? []
    total.value = res.data?.total ?? 0
  }).finally(() => {
    if (current === requestId)
      loading.value = false
  })
}

function handleQuery() {
  pageNumber.value = 1
  fetchData()
}

function isExcluded(row: VIS.VisCardInfo) {
  return exclude.value.has(String(row.id || ''))
}

function isChecked(row: VIS.VisCardInfo) {
  return selected.value.some(item => item.id === row.id)
}

function toggleRow(row: VIS.VisCardInfo, checked: boolean) {
  if (!row.id || isExcluded(row))
    return
  if (checked) {
    if (!isChecked(row))
      selected.value = [...selected.value, row]
    return
  }
  selected.value = selected.value.filter(item => item.id !== row.id)
}

function onRowClick(row: unknown) {
  const item = row as VIS.VisCardInfo
  toggleRow(item, !isChecked(item))
}

function onClosed() {
  selected.value = []
  keyword.value = ''
  chartType.value = ''
  pageNumber.value = 1
}

function handleCancel() {
  visible.value = false
}

function handleConfirm() {
  emit('confirm', selected.value.filter(item => item.id && !exclude.value.has(String(item.id))))
  visible.value = false
}

watch(visible, (open) => {
  if (open)
    handleQuery()
})
</script>

<template>
  <CustomDialog
    v-model:visible="visible"
    title="添加卡片"
    size="small"
    append-to-body
    destroy-on-close
    :handler-cancel="handleCancel"
    :handler-confirm="handleConfirm"
    @closed="onClosed"
  >
    <template #custom-dialog-body>
      <el-form @submit.prevent>
        <div class="picker-toolbar">
          <el-input
            v-model="keyword"
            class="picker-toolbar__search"
            clearable
            placeholder="搜索卡片名称"
            :prefix-icon="Search"
            @keyup.enter="handleQuery"
            @clear="handleQuery"
          />
          <el-select
            v-model="chartType"
            class="picker-toolbar__type"
            clearable
            placeholder="类型"
            @change="handleQuery"
          >
            <el-option
              v-for="item in CHART_TYPE_OPTIONS"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
          <el-button :icon="Search" @click="handleQuery">
            查询
          </el-button>
        </div>
      </el-form>
      <el-table
        v-spinner="loading"
        class="base-m-t"
        :data="records"
        :max-height="360"
        border
        @row-click="onRowClick"
      >
        <!-- @vue-generic {VIS.VisCardInfo} -->
        <el-table-column width="48" align="center">
          <template #default="{ row }">
            <el-checkbox
              :model-value="isChecked(row) || isExcluded(row)"
              :disabled="isExcluded(row)"
              @click.stop
              @change="(val: boolean | string | number) => toggleRow(row, val === true)"
            />
          </template>
        </el-table-column>
        <el-table-column label="ID" prop="id" width="90" show-overflow-tooltip />
        <el-table-column label="类型" width="100">
          <template #default="{ row }">
            {{ chartTypeLabel(row.chartType) }}
          </template>
        </el-table-column>
        <el-table-column label="名称" min-width="200" show-overflow-tooltip>
          <template #default="{ row }">
            <span class="picker-name">
              <el-tag
                :type="row.status === 'DBL' ? 'info' : 'success'"
                size="small"
              >
                {{ row.status === 'DBL' ? '禁用' : '启用' }}
              </el-tag>
              <span class="picker-name__text">{{ row.cardName }}</span>
            </span>
          </template>
        </el-table-column>
      </el-table>
      <div class="picker-footer">
        <span class="picker-footer__hint">
          已选 {{ selected.length }} 张
        </span>
        <el-pagination
          :current-page="pageNumber"
          layout="total, prev, pager, next"
          :page-size="pageSize"
          :total="total"
          @current-change="(page: number) => { pageNumber = page; fetchData() }"
        />
      </div>
    </template>
  </CustomDialog>
</template>

<style scoped lang="scss">
.picker-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
}

.picker-toolbar__search {
  flex: 1;
}

.picker-toolbar__type {
  width: 140px;
}

.picker-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 12px;
}

.picker-footer__hint {
  color: var(--el-text-color-secondary);
  font-size: 12px;
}

.picker-name {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  max-width: 100%;
}

.picker-name__text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
