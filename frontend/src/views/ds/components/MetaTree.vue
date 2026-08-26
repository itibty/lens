<!--
 * @Description: 数据源元数据树；弹窗选表确定后整表重置加载
-->
<script setup lang="ts">
import type { ElTree } from 'element-plus'
import type { CustomDialogProps } from '@/components/CustomDialog.vue'
import { Search } from '@element-plus/icons-vue'

export interface IMetaTreeProps {
  infos?: VIS.SchemaInfo[]
  tableOptions?: VIS.OptionString[]
  loadedTables?: string[]
  optionsLoading?: boolean
  metaLoading?: boolean
}

const props = withDefaults(defineProps<IMetaTreeProps>(), {
  infos: () => [],
  tableOptions: () => [],
  loadedTables: () => [],
  optionsLoading: false,
  metaLoading: false,
})

const emits = defineEmits<{
  (e: 'confirm', tables: string[]): void
}>()

const filterKeyword = ref('')
const filterQuery = ref('')
const draftTables = ref<string[]>([])
/** 输入框内容 */
const pickerKeyword = ref('')
/** 已生效的搜索词（Enter 后更新） */
const pickerQuery = ref('')

const pickerDialog = reactive<CustomDialogProps>({
  visible: false,
  size: 'mini',
  title: '选择数据表',
  appendToBody: true,
  destroyOnClose: true,
  // 关弹窗时不要锁/解锁 body，避免整页（含编辑器）跟着抖
  lockScroll: false,
  isCustomFooter: true,
})

interface TableOptionItem {
  value: string
  tip: string
}

const tableOptions = computed<TableOptionItem[]>(() => {
  return props.tableOptions
    .map((opt) => {
      const value = (opt.value || opt.name || '').trim()
      const name = (opt.name || '').trim()
      const tip = name && name !== value ? name : ''
      return { value, tip }
    })
    .filter(item => !!item.value)
})

const filteredOptions = computed(() => {
  const kw = pickerQuery.value.trim().toLowerCase()
  if (!kw)
    return tableOptions.value
  return tableOptions.value.filter(item =>
    item.value.toLowerCase().includes(kw) || item.tip.toLowerCase().includes(kw),
  )
})

const hasMeta = computed(() => props.infos.some(s => (s.tableInfos?.length ?? 0) > 0))
const loadedCount = computed(() => props.loadedTables.length)
const pickTooltip = computed(() => {
  if (props.metaLoading || props.optionsLoading)
    return '加载中…'
  if (loadedCount.value > 0)
    return `已加载 ${loadedCount.value} 张表，点击重新选择`
  return '选择要加载的表'
})
const emptyTip = computed(() => {
  if (props.optionsLoading)
    return '表清单加载中…'
  return props.tableOptions.length ? '点击左侧按钮选择要加载的表' : '暂无表清单'
})

function applyPickerSearch() {
  pickerQuery.value = pickerKeyword.value.trim()
}

function onPickerKeywordClear() {
  pickerKeyword.value = ''
  pickerQuery.value = ''
}

function openPicker() {
  draftTables.value = [...props.loadedTables]
  pickerKeyword.value = ''
  pickerQuery.value = ''
  pickerDialog.visible = true
}

function clearDraft() {
  draftTables.value = []
}

function cancelPicker() {
  pickerDialog.visible = false
}

function confirmPicker() {
  emits('confirm', [...draftTables.value])
  pickerDialog.visible = false
}

interface TreeNodeData {
  key: string
  name?: string
  comment?: string
  path?: string
  infoType?: string
  type?: string
  isPk?: boolean
  isUnique?: boolean
  fieldDesc?: string
  children?: TreeNodeData[]
  [key: string]: unknown
}

function nodeKey(...parts: string[]) {
  return parts.join(':')
}

function filterNode(value: string, data: Record<string, any>): boolean {
  if (!value)
    return true
  return String(data.path || '').includes(value.toLowerCase())
}

function buildTreePath(infos: TreeNodeData[], root?: TreeNodeData) {
  infos.forEach((info) => {
    info.path = `${root?.path || ''}/${info.name}${info.comment ? `_${info.comment}` : ''}`.toLowerCase()
    if (info.children?.length)
      buildTreePath(info.children, info)
  })
}

function nodeTitle(data: TreeNodeData): string {
  const name = data.name || ''
  if (data.infoType === 'FIELD')
    return `${data.isPk ? '[主键] ' : ''}${name}${data.comment || ''}\n类型：${data.type || ''}`
  if (data.infoType === 'INDEX')
    return `${name}${data.isUnique ? ' [unique]' : ''}\n字段：${data.fieldDesc || ''}`
  return `${name} ${data.comment || ''}`.trim()
}

const metaInfos = computed(() => {
  const infos: TreeNodeData[] = props.infos.map((schema) => {
    const sName = schema.name
    return {
      key: nodeKey('schema', sName),
      name: schema.name,
      comment: schema.comment,
      infoType: schema.infoType,
      dbType: schema.dbType,
      children: schema.tableInfos?.map((table) => {
        const tName = table.name
        return {
          key: nodeKey('table', sName, tName),
          name: table.name,
          comment: table.comment,
          infoType: table.infoType,
          children: [
            {
              key: nodeKey('type', sName, tName, 'FIELD'),
              name: '字段',
              infoType: 'TYPE',
              type: 'FIELD',
              children: table.fieldInfos?.map(info => ({
                key: nodeKey('field', sName, tName, info.name || ''),
                ...info,
              })),
            },
            {
              key: nodeKey('type', sName, tName, 'INDEX'),
              name: '索引',
              infoType: 'TYPE',
              type: 'INDEX',
              children: table.indexInfos?.map(info => ({
                key: nodeKey('index', sName, tName, info.name || ''),
                ...info,
              })),
            },
          ],
        }
      }),
    }
  })
  buildTreePath(infos)
  return infos
})

const treeRef = ref<InstanceType<typeof ElTree>>()
watch(filterQuery, (value) => {
  treeRef.value?.filter(value)
})

function applyTreeSearch() {
  filterQuery.value = filterKeyword.value.trim()
}

function onTreeSearchClear() {
  filterKeyword.value = ''
  filterQuery.value = ''
}
</script>

<template>
  <div class="comp-panel">
    <div class="toolbar">
      <el-tooltip :content="pickTooltip" placement="top" :show-after="300">
        <span class="pick-btn-wrap">
          <el-button
            text
            bg
            class="pick-btn"
            :loading="optionsLoading || metaLoading"
            :disabled="optionsLoading || metaLoading || !tableOptions.length"
            @click="openPicker"
          >
            <span class="pick-btn-icon i-mingcute-settings-3-line" />
            <span class="pick-btn-count">{{ loadedCount > 0 ? loadedCount : '-' }}</span>
          </el-button>
        </span>
      </el-tooltip>
      <el-input
        v-model="filterKeyword"
        :prefix-icon="Search"
        placeholder="关键字搜索"
        clearable
        class="borderless-input toolbar-search"
        :disabled="!hasMeta"
        @keyup.enter="applyTreeSearch"
        @clear="onTreeSearchClear"
      />
    </div>

    <div class="tree-wrap" :class="{ 'is-refreshing': metaLoading }">
      <el-scrollbar v-if="hasMeta" style="padding-right: 10px;">
        <el-tree
          ref="treeRef"
          class="filter-tree"
          :data="metaInfos"
          :props="{ children: 'children', label: 'name' }"
          node-key="key"
          :default-expanded-keys="metaInfos.length > 0 ? [metaInfos[0]!.key] : []"
          :filter-node-method="filterNode"
        >
          <template #default="{ data }">
            <div
              class="custom-tree-node"
              :class="{ 'text-12px': data.infoType === 'FIELD' || data.infoType === 'INDEX' }"
              :title="nodeTitle(data)"
            >
              <el-icon class="type-icon">
                <i-ant-design-database-outlined v-if="data.infoType === 'SCHEMA'" />
                <i-ant-design-table-outlined v-else-if="data.infoType === 'TABLE'" />
                <i-mingcute-key-2-line v-else-if="data.infoType === 'FIELD' && data.isPk" />
                <i-mingcute-column-line v-else-if="data.infoType === 'FIELD' || data.type === 'FIELD'" />
                <i-mingcute-az-sort-ascending-letters-line v-else />
              </el-icon>
              {{ data.name }}
            </div>
          </template>
        </el-tree>
      </el-scrollbar>
      <div v-else class="empty-tip">
        {{ emptyTip }}
      </div>
    </div>

    <CustomDialog
      v-bind="{ ...pickerDialog }"
      v-model.visible="pickerDialog.visible"
    >
      <template #custom-dialog-body>
        <div class="picker-body">
          <el-row :gutter="12" align="middle">
            <el-col :span="20">
              <el-input
                v-model="pickerKeyword"
                clearable
                :prefix-icon="Search"
                placeholder="搜索表名，回车确认"
                @keyup.enter="applyPickerSearch"
                @clear="onPickerKeywordClear"
              />
            </el-col>
            <el-col :span="4">
              <div class="picker-count">
                已选 {{ draftTables.length }} / {{ tableOptions.length }}
              </div>
            </el-col>
          </el-row>
          <el-scrollbar class="picker-list">
            <el-checkbox-group v-if="filteredOptions.length" v-model="draftTables" class="picker-checks">
              <el-checkbox
                v-for="item in filteredOptions"
                :key="item.value"
                :value="item.value"
                class="picker-check-item"
              >
                <span class="check-row">
                  <span class="check-label" :title="item.value">{{ item.value }}</span>
                  <el-tooltip
                    v-if="item.tip"
                    effect="dark"
                    :content="item.tip"
                    placement="top"
                  >
                    <el-icon class="check-tip-icon" color="#999" @click.stop>
                      <i-ep-question-filled />
                    </el-icon>
                  </el-tooltip>
                </span>
              </el-checkbox>
            </el-checkbox-group>
            <div v-else class="picker-empty">
              无匹配表
            </div>
          </el-scrollbar>
        </div>
      </template>
      <template #custom-dialog-footer>
        <div class="picker-footer">
          <el-button @click="clearDraft">
            清空
          </el-button>
          <div class="picker-footer-right">
            <el-button @click="cancelPicker">
              取消
            </el-button>
            <el-button type="primary" @click="confirmPicker">
              确定
            </el-button>
          </div>
        </div>
      </template>
    </CustomDialog>
  </div>
</template>

<style lang="scss" scoped>
.comp-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.toolbar {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 6px;
  border-bottom: 1px solid var(--el-border-color-lighter, #ebeef5);
}

.pick-btn-wrap {
  display: inline-flex;
  flex-shrink: 0;
  height: var(--el-component-size, 32px);
}

.pick-btn {
  height: var(--el-component-size, 32px);
  padding: 0 10px;
}

.pick-btn-icon {
  font-size: 16px;
  margin-right: 4px;
}

.pick-btn-count {
  font-size: 13px;
  line-height: 1;
  min-width: 1em;
  text-align: center;
}

.toolbar-search {
  flex: 1;
  min-width: 0;
}

.tree-wrap {
  flex: 1;
  overflow-y: auto;
  min-height: 0;

  &.is-refreshing {
    opacity: 0.55;
    pointer-events: none;
    transition: opacity 0.15s ease;
  }
}

.empty-tip {
  padding: 24px 12px;
  text-align: center;
  font-size: 13px;
  color: var(--el-text-color-secondary, #909399);
}

.custom-tree-node {
  display: flex;
  align-items: center;
  width: 100%;
}

.type-icon {
  margin-right: 2px;
  font-size: 16px;
  color: #999;
}

.picker-body {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.picker-count {
  text-align: right;
  font-size: 12px;
  line-height: 32px;
  color: var(--el-text-color-secondary, #909399);
  white-space: nowrap;
}

.picker-list {
  height: min(50vh, 360px);
  border: 1px solid var(--el-border-color-lighter, #ebeef5);
  border-radius: 4px;
  box-sizing: border-box;
}

.picker-checks {
  display: flex;
  flex-direction: column;
  padding: 4px 0;
  width: 100%;
}

.picker-check-item {
  margin: 0 !important;
  padding: 6px 12px;
  height: auto;
  width: 100%;
  box-sizing: border-box;

  &:hover {
    background: var(--el-fill-color-light, #f5f7fa);
  }

  :deep(.el-checkbox__label) {
    display: flex;
    flex: 1;
    width: 100%;
    overflow: hidden;
    padding-left: 8px;
  }
}

.check-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  width: 100%;
}

.check-label {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 13px;
}

.check-tip-icon {
  flex-shrink: 0;
  cursor: help;
  font-size: 14px;
}

.picker-empty {
  padding: 28px 12px;
  text-align: center;
  font-size: 13px;
  color: var(--el-text-color-secondary, #909399);
}

.picker-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}

.picker-footer-right {
  display: flex;
  gap: 8px;
}
</style>
