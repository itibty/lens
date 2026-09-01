<!--
 * @Description: 看板管理树
-->
<script setup lang="ts">
import type { ElTree, TreeNodeData } from 'element-plus'
import type { DashManageNode, ExplorerCommand } from '../dashManage'
import { Search } from '@element-plus/icons-vue'
import MenuIcon from '@/components/MenuIcon.vue'
import { ROOT_GROUP_ID } from '../dashManage'

export interface DashExplorerTreeInstance {
  setCurrentDashboard: (id?: string) => void
}

interface ExplorerNode extends Omit<DashManageNode, 'children'> {
  key: string
  children: ExplorerNode[]
}

interface TreeNodeLike {
  expanded: boolean
}

const props = defineProps<{
  data: DashManageNode[]
  loading?: boolean
  canWrite?: boolean
}>()

const emit = defineEmits<{
  select: [node: DashManageNode]
  command: [command: ExplorerCommand, node: DashManageNode]
}>()

const treeRef = ref<InstanceType<typeof ElTree>>()
const keyword = ref('')
const currentDashboardKey = ref('')

function toExplorerNode(node: DashManageNode): ExplorerNode {
  return {
    ...node,
    key: `${node.nodeType === 'GROUP' ? 'g' : 'd'}:${node.id}`,
    children: (node.children ?? []).map(toExplorerNode),
  }
}

const treeData = computed(() => props.data.map(toExplorerNode))

const reportCenterNode: DashManageNode = {
  id: ROOT_GROUP_ID,
  pid: ROOT_GROUP_ID,
  nodeType: 'GROUP',
  name: '报表中心',
  virtual: true,
  children: [],
}

function onHeadCommand(command: Extract<ExplorerCommand, 'add-root-group' | 'add-dashboard'>) {
  emit('command', command, reportCenterNode)
}

function filterNode(value: string, data: TreeNodeData) {
  const node = data as ExplorerNode
  return !value || node.name.toLowerCase().includes(value.toLowerCase())
}

function onNodeClick(data: ExplorerNode, node: TreeNodeLike) {
  if (data.nodeType === 'GROUP') {
    node.expanded = !node.expanded
    nextTick(() => treeRef.value?.setCurrentKey(currentDashboardKey.value || undefined))
    return
  }
  currentDashboardKey.value = data.key
  emit('select', data)
}

function onCommand(command: ExplorerCommand, node: ExplorerNode) {
  emit('command', command, node)
}

function setCurrentDashboard(id = '') {
  currentDashboardKey.value = id ? `d:${id}` : ''
  nextTick(() => treeRef.value?.setCurrentKey(currentDashboardKey.value || undefined))
}

function applyFilter() {
  treeRef.value?.filter(keyword.value.trim())
}

function handleKeywordChange(value: string) {
  if (!value)
    treeRef.value?.filter('')
}

defineExpose<DashExplorerTreeInstance>({ setCurrentDashboard })
</script>

<template>
  <aside class="explorer">
    <div class="explorer__head">
      <el-input
        v-model="keyword"
        class="explorer__search borderless-input"
        clearable
        :prefix-icon="Search"
        placeholder="请输入关键词"
        @keyup.enter="applyFilter"
        @clear="applyFilter"
        @update:model-value="handleKeywordChange"
      />
      <el-dropdown
        v-if="canWrite"
        trigger="click"
        @command="onHeadCommand"
      >
        <el-button class="explorer__more" text>
          <span class="explorer-node__more-icon i-mingcute-more-2-line" />
        </el-button>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item command="add-root-group">
              <span class="explorer-menu__icon i-mingcute-new-folder-line" />
              子组
            </el-dropdown-item>
            <el-dropdown-item command="add-dashboard">
              <span class="explorer-menu__icon i-mingcute-add-square-line" />
              看板
            </el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
    </div>
    <el-scrollbar v-spinner="loading" class="explorer__scroll">
      <el-tree
        ref="treeRef"
        :data="treeData"
        :props="{ children: 'children', label: 'name' }"
        node-key="key"
        default-expand-all
        highlight-current
        :expand-on-click-node="false"
        :filter-node-method="filterNode"
        :indent="16"
        empty-text="暂无看板"
        @node-click="onNodeClick"
      >
        <template #default="{ data: treeNode }">
          <div
            class="explorer-node"
            :class="{
              'is-disabled': treeNode.status === 'DBL',
              'is-dashboard': treeNode.nodeType === 'DASH',
            }"
          >
            <MenuIcon
              v-if="treeNode.icon"
              :icon="treeNode.icon"
              class-name="explorer-node__icon"
            />
            <span class="explorer-node__name" :title="treeNode.name">{{ treeNode.name }}</span>
            <span v-if="canWrite" class="explorer-node__ops" @click.stop>
              <el-dropdown
                trigger="click"
                @command="(command: ExplorerCommand) => onCommand(command, treeNode)"
              >
                <el-button link>
                  <span class="explorer-node__more-icon i-mingcute-more-2-line" />
                </el-button>
                <template #dropdown>
                  <el-dropdown-menu v-if="treeNode.nodeType === 'GROUP'">
                    <template v-if="canWrite">
                      <el-dropdown-item command="add-child-group">
                        <span class="explorer-menu__icon i-mingcute-new-folder-line" />
                        子组
                      </el-dropdown-item>
                      <el-dropdown-item command="add-dashboard">
                        <span class="explorer-menu__icon i-mingcute-add-square-line" />
                        看板
                      </el-dropdown-item>
                      <el-dropdown-item v-if="!treeNode.virtual" command="edit-group">
                        <span class="explorer-menu__icon i-mingcute-edit-3-line" />
                        编辑
                      </el-dropdown-item>
                      <el-dropdown-item v-if="!treeNode.virtual" command="toggle-group">
                        <span
                          class="explorer-menu__icon"
                          :class="treeNode.status === 'EBL'
                            ? 'i-mingcute-toggle-left-line'
                            : 'i-mingcute-toggle-right-line'"
                        />
                        {{ treeNode.status === 'EBL' ? '禁用' : '启用' }}
                      </el-dropdown-item>
                      <el-dropdown-item v-if="!treeNode.virtual" command="delete-group" divided>
                        <span class="explorer-menu__icon i-mingcute-delete-2-line" />
                        删除
                      </el-dropdown-item>
                    </template>
                  </el-dropdown-menu>
                  <el-dropdown-menu v-else>
                    <el-dropdown-item command="edit-dashboard">
                      <span class="explorer-menu__icon i-mingcute-edit-3-line" />
                      编辑
                    </el-dropdown-item>
                    <el-dropdown-item command="move-dashboard">
                      <span class="explorer-menu__icon i-mingcute-transfer-horizontal-line" />
                      移动
                    </el-dropdown-item>
                    <el-dropdown-item command="toggle-dashboard">
                      <span
                        class="explorer-menu__icon"
                        :class="treeNode.status === 'EBL'
                          ? 'i-mingcute-toggle-left-line'
                          : 'i-mingcute-toggle-right-line'"
                      />
                      {{ treeNode.status === 'EBL' ? '禁用' : '启用' }}
                    </el-dropdown-item>
                    <el-dropdown-item command="delete-dashboard" divided>
                      <span class="explorer-menu__icon i-mingcute-delete-2-line" />
                      删除
                    </el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
            </span>
          </div>
        </template>
      </el-tree>
    </el-scrollbar>
  </aside>
</template>

<style scoped lang="scss">
.explorer {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  min-height: 0;
  padding: 12px 4px 12px 8px;
  box-sizing: border-box;
  background: var(--el-bg-color);
  contain: layout paint;
  isolation: isolate;
}

.explorer__head {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-bottom: 8px;
}

.explorer__search {
  flex: 1;
  min-width: 0;
}

.explorer__more {
  width: 32px;
  padding: 0;
}

.explorer__scroll {
  flex: 1;
  min-height: 0;
}

.explorer-node {
  display: flex;
  flex: 1;
  align-items: center;
  gap: 6px;
  min-width: 0;
  padding-right: 2px;

  &.is-disabled {
    color: var(--el-text-color-placeholder);
  }
}

.explorer-node__icon {
  flex-shrink: 0;
  font-size: 15px;
}

.explorer-node__name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.explorer-node__ops {
  margin-left: auto;
  flex-shrink: 0;
  opacity: 0;
}

.explorer-node__more-icon,
.explorer-menu__icon {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}

.explorer-menu__icon {
  margin-right: 7px;
}

.explorer-node:hover .explorer-node__ops,
.explorer-node__ops:focus-within {
  opacity: 1;
}

:deep(.el-tree-node__content) {
  height: 34px;
  border-radius: 6px;
  transition: none;
}

:deep(.el-tree-node.is-current > .el-tree-node__content) {
  color: var(--el-color-primary);
  font-weight: 600;
}
</style>
