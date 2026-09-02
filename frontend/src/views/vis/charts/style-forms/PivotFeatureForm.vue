<!--
 * @Description: 透视表功能设置（通用 / 树形 / 合计位置 / 数据标注）
-->
<script setup lang="ts">
import type { DatasetField, VisPivotPlace, VisQueryConfig, VisVisualConfig } from '@/views/vis/shared/types'
import { PIVOT_PLACE_DEFAULT, TABLE_FEATURE_TIPS, TABLE_STYLE_DEFAULTS } from '@/views/vis/shared/tableStyle'
import { useVisualBranch } from './composables/useVisualBranch'
import FieldStyleShelf from './FieldStyleShelf.vue'
import StyleFormLabel from './StyleFormLabel.vue'
import StyleFormSection from './StyleFormSection.vue'
import StyleFormShell from './StyleFormShell.vue'
import TableMarkSection from './TableMarkSection.vue'
import TitleStyleFields from './TitleStyleFields.vue'

defineProps<{
  query?: VisQueryConfig
  fields?: DatasetField[]
}>()

const TOTAL_OPTIONS = [
  {
    key: 'rowSubtotal',
    placeKey: 'rowSubtotalPlace',
    label: '行小计',
    tip: TABLE_FEATURE_TIPS.rowSubtotal,
    hidePlaceWhenTree: true,
    places: [
      { value: 'start', label: '组前' },
      { value: 'end', label: '组后' },
    ],
  },
  {
    key: 'rowTotal',
    placeKey: 'rowTotalPlace',
    label: '行总计',
    tip: undefined,
    places: [
      { value: 'start', label: '顶部' },
      { value: 'end', label: '底部' },
    ],
  },
  {
    key: 'columnSubtotal',
    placeKey: 'columnSubtotalPlace',
    label: '列小计',
    tip: TABLE_FEATURE_TIPS.columnSubtotal,
    places: [
      { value: 'start', label: '组左' },
      { value: 'end', label: '组右' },
    ],
  },
  {
    key: 'columnTotal',
    placeKey: 'columnTotalPlace',
    label: '列总计',
    tip: undefined,
    places: [
      { value: 'start', label: '左侧' },
      { value: 'end', label: '右侧' },
    ],
  },
] as const

const visual = defineModel<VisVisualConfig>('visual', { required: true })
const openSections = ref(['common', 'interaction', 'display', 'fieldStyle', 'totals', 'marks'])
const branch = useVisualBranch(visual, 'table')
const treeDisplay = branch.boolField('treeDisplay', TABLE_STYLE_DEFAULTS.treeDisplay)
const sortColumn = branch.boolField('sortColumn', TABLE_STYLE_DEFAULTS.sortColumn)
const striped = branch.boolField('striped', TABLE_STYLE_DEFAULTS.striped)
const rowTotalPlace = branch.valueField<VisPivotPlace>('rowTotalPlace', PIVOT_PLACE_DEFAULT)
const columnTotalPlace = branch.valueField<VisPivotPlace>('columnTotalPlace', PIVOT_PLACE_DEFAULT)
const rowSubtotalPlace = branch.valueField<VisPivotPlace>('rowSubtotalPlace', PIVOT_PLACE_DEFAULT)
const columnSubtotalPlace = branch.valueField<VisPivotPlace>('columnSubtotalPlace', PIVOT_PLACE_DEFAULT)

const placeModel = {
  rowTotalPlace,
  columnTotalPlace,
  rowSubtotalPlace,
  columnSubtotalPlace,
} as const

function isTotalOn(key: typeof TOTAL_OPTIONS[number]['key']) {
  return !!visual.value[key]
}

function setTotal(key: typeof TOTAL_OPTIONS[number]['key'], value: boolean) {
  if (value)
    visual.value[key] = true
  else
    delete visual.value[key]
}

function showPlace(item: typeof TOTAL_OPTIONS[number]) {
  if (!isTotalOn(item.key))
    return false
  if ('hidePlaceWhenTree' in item && item.hidePlaceWhenTree && treeDisplay.value)
    return false
  return true
}

function placeOf(key: keyof typeof placeModel) {
  return placeModel[key].value
}

function setPlace(key: keyof typeof placeModel, value: string | number | boolean | undefined) {
  if (value === 'start' || value === 'end')
    placeModel[key].value = value
}
</script>

<template>
  <StyleFormShell v-model="openSections">
    <StyleFormSection
      title="通用"
      name="common"
    >
      <TitleStyleFields v-model:visual="visual" />
    </StyleFormSection>

    <StyleFormSection
      title="交互"
      name="interaction"
    >
      <div class="vis-style-form__row">
        <StyleFormLabel :tip="TABLE_FEATURE_TIPS.treeDisplay">
          行维树形
        </StyleFormLabel>
        <el-switch v-model="treeDisplay" size="small" />
      </div>
      <div class="vis-style-form__row">
        <StyleFormLabel>
          排序
        </StyleFormLabel>
        <el-switch v-model="sortColumn" size="small" />
      </div>
    </StyleFormSection>

    <StyleFormSection
      title="展示"
      name="display"
    >
      <div class="vis-style-form__row">
        <StyleFormLabel>
          斑马纹
        </StyleFormLabel>
        <el-switch v-model="striped" size="small" />
      </div>
    </StyleFormSection>

    <FieldStyleShelf
      v-model:visual="visual"
      v-model:open-sections="openSections"
      :query="query"
    />

    <StyleFormSection
      title="合计"
      name="totals"
    >
      <template
        v-for="item in TOTAL_OPTIONS"
        :key="item.key"
      >
        <div class="vis-style-form__row">
          <StyleFormLabel :tip="item.tip">
            {{ item.label }}
          </StyleFormLabel>
          <el-switch
            size="small"
            :model-value="isTotalOn(item.key)"
            @update:model-value="setTotal(item.key, !!$event)"
          />
        </div>

        <div
          v-if="showPlace(item)"
          class="vis-style-form__row"
        >
          <div class="vis-style-form__label">
            位置
          </div>
          <el-radio-group
            size="small"
            class="vis-style-form__segmented"
            :model-value="placeOf(item.placeKey)"
            @update:model-value="setPlace(item.placeKey, $event)"
          >
            <el-radio-button
              v-for="place in item.places"
              :key="place.value"
              :value="place.value"
            >
              {{ place.label }}
            </el-radio-button>
          </el-radio-group>
        </div>
      </template>
    </StyleFormSection>

    <TableMarkSection
      v-model:visual="visual"
      v-model:open-sections="openSections"
      :query="query"
      :fields="fields"
    />
  </StyleFormShell>
</template>
