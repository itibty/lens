<!--
 * @Description: 数据集字段源（按 suggestRole 分类，拖拽到投放区）
-->
<script setup lang="ts">
import type { DatasetField, DatasetFieldDataType } from '@/views/vis/shared/types'
import { Search } from '@element-plus/icons-vue'
import draggable from 'vuedraggable'
import vis from '@/apis/vis/index'
import { cloneDatasetField, DND_GROUP } from '@/views/vis/shared/dnd'
import FieldTypeIcon from '@/views/vis/shared/FieldTypeIcon.vue'
import { DATA_TYPE_OPTIONS } from '@/views/vis/shared/types'
import { fromConfSqlField } from '../cardApi'

const props = withDefaults(defineProps<{
  error?: string
  /** 查询类才回填选中并拉字段；富文本 / 网页只留选择器 */
  needsDataset?: boolean
}>(), {
  needsDataset: true,
})
const datasetId = defineModel<string>('datasetId', { required: true })
const fields = defineModel<DatasetField[]>('fields', { required: true })

const datasets = ref<VIS.VisDatasetInfo[]>([])
const loadingOptions = ref(false)
const loadingFields = ref(false)
const keyword = ref('')
const typeFilter = ref<DatasetFieldDataType | ''>('')
const allDimensionFields = ref<DatasetField[]>([])
const allMetricFields = ref<DatasetField[]>([])

function isMetricField(field: DatasetField) {
  if (field.suggestRole === 'METRIC')
    return true
  if (field.suggestRole === 'DIMENSION')
    return false
  return field.dataType === 'number'
}

function matchField(field: DatasetField) {
  if (typeFilter.value && field.dataType !== typeFilter.value)
    return false
  const q = keyword.value.trim().toLowerCase()
  if (!q)
    return true
  return field.field.toLowerCase().includes(q)
}

const typeOptions = computed(() => {
  const present = new Set<DatasetFieldDataType>()
  for (const field of [...allDimensionFields.value, ...allMetricFields.value]) {
    if (field.dataType)
      present.add(field.dataType)
  }
  return DATA_TYPE_OPTIONS.filter(item => present.has(item.value))
})

const dimensionFields = ref<DatasetField[]>([])
const metricFields = ref<DatasetField[]>([])

const optionIds = computed(() => new Set(datasets.value.map(item => String(item.id))))

function splitFields(list: DatasetField[]) {
  allDimensionFields.value = list.filter(f => !isMetricField(f))
  allMetricFields.value = list.filter(f => isMetricField(f))
}

async function loadOptions() {
  loadingOptions.value = true
  try {
    const res = await vis.dataset.listDatasetOptions()
    datasets.value = res.data?.list ?? []
  }
  finally {
    loadingOptions.value = false
  }
}

async function loadFields(id: string) {
  if (!id) {
    fields.value = []
    splitFields([])
    return
  }
  loadingFields.value = true
  try {
    const res = await vis.dataset.listDatasetFieldsById({ datasetId: id })
    const list = (res.data ?? []).map(fromConfSqlField)
    fields.value = list
    splitFields(list)
  }
  catch {
    fields.value = []
    splitFields([])
  }
  finally {
    loadingFields.value = false
  }
}

watch(
  [datasetId, () => props.needsDataset],
  ([id, need]) => {
    keyword.value = ''
    typeFilter.value = ''
    if (!need) {
      fields.value = []
      splitFields([])
      return
    }
    loadFields(id)
  },
  { immediate: true },
)

watch(
  [allDimensionFields, allMetricFields, keyword, typeFilter],
  () => {
    dimensionFields.value = allDimensionFields.value.filter(matchField)
    metricFields.value = allMetricFields.value.filter(matchField)
  },
  { immediate: true },
)

const hasFields = computed(() =>
  allDimensionFields.value.length + allMetricFields.value.length > 0,
)
const hasMatchedFields = computed(() =>
  dimensionFields.value.length + metricFields.value.length > 0,
)

const fieldGroups = computed(() => [
  { key: 'dimension', label: '维度', fields: dimensionFields.value },
  { key: 'metric', label: '指标', fields: metricFields.value },
].filter(group => group.fields.length))

onMounted(loadOptions)
</script>

<template>
  <div class="field-panel">
    <div class="field-panel__header">
      <el-select
        v-model="datasetId"
        class="w-full"
        :class="{ 'is-error': !!error }"
        filterable
        clearable
        :loading="loadingOptions"
        placeholder="选择数据集"
      >
        <el-option
          v-if="datasetId && !optionIds.has(datasetId)"
          :key="datasetId"
          :label="datasetId"
          :value="datasetId"
        />
        <el-option
          v-for="item in datasets"
          :key="item.id"
          :label="item.sqlName"
          :value="String(item.id)"
        />
      </el-select>
      <div v-if="error" class="field-panel__error">
        {{ error }}
      </div>
      <div
        v-if="datasetId && hasFields"
        class="field-panel__filters"
      >
        <el-input
          v-model="keyword"
          class="field-panel__search"
          clearable
          placeholder="筛选字段"
          :prefix-icon="Search"
        />
        <el-select
          v-model="typeFilter"
          class="field-panel__types"
          clearable
          placeholder="类型"
        >
          <el-option
            v-for="item in typeOptions"
            :key="item.value"
            :label="item.label"
            :value="item.value"
          />
        </el-select>
      </div>
    </div>

    <div v-spinner="loadingFields" class="field-panel__scroll">
      <div class="field-panel__body">
        <el-empty
          v-if="!needsDataset"
          description="此类型无需字段"
          :image-size="56"
        />
        <el-empty
          v-else-if="!datasetId"
          description="请先选择数据集"
          :image-size="56"
        />
        <el-empty
          v-else-if="!hasFields"
          description="暂无字段"
          :image-size="56"
        />
        <el-empty
          v-else-if="!hasMatchedFields"
          description="无匹配字段"
          :image-size="56"
        />

        <template v-else>
          <div
            v-for="group in fieldGroups"
            :key="group.key"
            class="field-group"
            :class="`is-${group.key}`"
          >
            <div class="field-group__title">
              <span class="field-group__dot" />
              {{ group.label }}
              <span class="field-group__count">({{ group.fields.length }})</span>
            </div>
            <draggable
              class="field-list"
              :list="group.fields"
              :group="{ name: DND_GROUP, pull: 'clone', put: false }"
              :clone="cloneDatasetField"
              :sort="false"
              item-key="field"
            >
              <template #item="{ element }">
                <div class="field-source">
                  <div class="field-source__pill">
                    <span class="field-source__name ellipsis">{{ element.field }}</span>
                    <FieldTypeIcon :data-type="element.dataType" />
                  </div>
                </div>
              </template>
            </draggable>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.field-panel {
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-sizing: border-box;

  /* 固定头自带横向 padding；滚动条贴面板边缘 */
  &__header {
    flex-shrink: 0;
    padding: 12px 12px 0;
  }

  &__filters {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-top: 8px;
  }

  &__types {
    flex: 0 0 96px;
    width: 96px;
  }

  &__search {
    flex: 1 1 0;
    min-width: 0;
  }

  &__error {
    margin-top: 6px;
    font-size: 12px;
    line-height: 1.4;
    color: var(--el-color-danger);
  }

  :deep(.el-select.is-error .el-select__wrapper) {
    box-shadow: 0 0 0 1px var(--el-color-danger) inset;
  }

  &__scroll {
    flex: 1 1 0;
    min-height: 0;
    overflow: auto;
  }

  /* padding 放在滚动内容上，避免条被包进内边距 */
  &__body {
    padding: 10px 8px 12px;
    box-sizing: border-box;
  }
}

.field-group {
  padding: 8px;
  border-radius: 6px;
  background: var(--el-fill-color-lighter);

  & + & {
    margin-top: 8px;
  }

  &.is-dimension .field-group__dot {
    background: var(--el-color-primary-light-3);
  }

  &.is-metric .field-group__dot {
    background: var(--el-color-success-light-3);
  }

  &__title {
    position: sticky;
    top: 0;
    z-index: 1;
    display: flex;
    align-items: center;
    gap: 6px;
    margin: -8px -8px 8px;
    padding: 8px;
    background: var(--el-fill-color-lighter);
    font-size: 12px;
    font-weight: 500;
    line-height: 1.3;
    color: var(--el-text-color-secondary);
  }

  &__count {
    font-size: 12px;
    font-weight: 400;
    color: var(--el-text-color-placeholder);
  }

  &__dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    flex-shrink: 0;
  }
}

.field-source {
  margin-bottom: 4px;
  cursor: grab;

  &:last-child {
    margin-bottom: 0;
  }

  &:active {
    cursor: grabbing;
  }

  &__pill {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 10px;
    border-radius: 4px;
    border: 1px solid transparent;
    background: var(--el-fill-color-light);
    color: var(--el-text-color-regular);
    transition:
      border-color 0.15s ease,
      background 0.15s ease,
      box-shadow 0.15s ease;

    &:hover {
      background: var(--el-bg-color);
      border-color: var(--el-border-color);
      box-shadow: 0 1px 2px rgb(0 0 0 / 6%);
      color: var(--el-text-color-primary);
    }
  }

  &__name {
    flex: 1;
    min-width: 0;
    font-size: 12px;
    color: var(--el-text-color-regular);
  }
}

:deep(.sortable-ghost) {
  opacity: 0.45;
}
</style>
