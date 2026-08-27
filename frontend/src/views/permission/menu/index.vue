<script setup lang="ts">
import type { ElTree } from 'element-plus'
import type { EditMenuDialogInstance, MenuType } from './components/EditMenuDialog.vue'
import { Search } from '@element-plus/icons-vue'
import { delMenu, listMenuTree } from '@/apis/admin/menu'
import MenuIcon from '@/components/MenuIcon.vue'
import { menuIconClass } from '@/core/menuIcons'
import { SYS_MENU_WRITE } from '@/core/permCodes'
import { useAccountStore } from '@/stores/modules/account'
import { useMenuStore } from '@/stores/modules/menu'
import { showConfirm, showToast } from '@/utils/index'
import EditMenuDialog from './components/EditMenuDialog.vue'
import MenuButtonsTable from './components/MenuButtonsTable.vue'
import MenuDetailForm from './components/MenuDetailForm.vue'
import {
  findNode,
  firstNodeId,
  isFunc,
  listFuncs,
  selectableId,
  stripFuncs,
} from './menuAdmin'

type MenuCommand = 'add-root' | 'add-child' | 'add-func' | 'delete'

const loading = ref(false)
const keyword = ref('')
const selectedId = ref('')
const records = ref<ADMIN.MenuTree[]>([])
const dialogRef = ref<EditMenuDialogInstance>()
const treeRef = ref<InstanceType<typeof ElTree>>()
const menuStore = useMenuStore()
const { hasFunction } = useAccountStore()
const canWrite = hasFunction(SYS_MENU_WRITE)

const treeRecords = computed(() => stripFuncs(records.value))
const selectedNode = computed(() => findNode(records.value, selectedId.value))
const selectedFuncs = computed(() => listFuncs(selectedNode.value))

function selectNode(id: string) {
  selectedId.value = id
  nextTick(() => treeRef.value?.setCurrentKey(id || undefined))
}

function onNodeClick(data: ADMIN.MenuTree) {
  selectedId.value = data.id || ''
}

function filterNode(value: string, data: ADMIN.MenuTree) {
  if (!value)
    return true
  const kw = value.toLowerCase()
  return !!(
    data.menuName?.toLowerCase().includes(kw)
    || data.icon?.toLowerCase().includes(kw)
    || data.routePath?.toLowerCase().includes(kw)
    || data.permCode?.toLowerCase().includes(kw)
  )
}

function applyFilter() {
  treeRef.value?.filter(keyword.value.trim())
}

function handleKeywordChange(value: string) {
  if (!value)
    treeRef.value?.filter('')
}

async function fetchData(preferId?: string) {
  loading.value = true
  try {
    const res = await listMenuTree()
    records.value = res.data?.list ?? []
    const nextId = [selectableId(records.value, preferId), selectableId(records.value, selectedId.value), firstNodeId(treeRecords.value)]
      .find(id => !!id && findNode(treeRecords.value, id)) || ''
    selectNode(nextId)
    nextTick(applyFilter)
    await menuStore.fetchUserMenus()
  }
  finally {
    loading.value = false
  }
}

function handleSaved(id?: string) {
  fetchData(id)
}

function addChild(pid: string, menuType?: MenuType) {
  dialogRef.value?.showAdd({ pid, menuType })
}

function addUnderNode(data: ADMIN.MenuTree, menuType?: MenuType) {
  if (!data.id)
    return
  selectNode(data.id)
  addChild(data.id, menuType)
}

function addUnderSelected(menuType: MenuType) {
  if (!selectedNode.value?.id)
    return
  addChild(selectedNode.value.id, menuType)
}

function removeNode(row: ADMIN.MenuTree) {
  if (!row.id)
    return
  showConfirm(`删除「${row.menuName}」？`, '删除确认', 'warning', () => {
    delMenu({ menuId: row.id! }).then(() => {
      showToast('已删除')
      const prefer = isFunc(row) ? selectedId.value : row.pid
      fetchData(prefer)
    })
  })
}

function onHeadCommand(command: Extract<MenuCommand, 'add-root'>) {
  if (command === 'add-root')
    addChild('0')
}

function onNodeCommand(command: MenuCommand, node: ADMIN.MenuTree) {
  if (command === 'add-child')
    addUnderNode(node)
  else if (command === 'add-func')
    addUnderNode(node, 'FUNC')
  else if (command === 'delete')
    removeNode(node)
}

onMounted(() => fetchData())
</script>

<template>
  <PageCard
    :show-header="false"
    :scroll-content="false"
    :provide-scope="false"
  >
    <div v-loading="loading" class="menu-admin">
      <aside class="menu-admin__tree">
        <div class="menu-admin__head">
          <el-input
            v-model="keyword"
            class="menu-admin__search"
            clearable
            :prefix-icon="Search"
            placeholder="搜索菜单"
            @keyup.enter="applyFilter"
            @clear="applyFilter"
            @update:model-value="handleKeywordChange"
          />
          <el-dropdown
            v-if="canWrite"
            trigger="click"
            @command="onHeadCommand"
          >
            <el-button class="menu-admin__more">
              <span class="menu-tree-node__more-icon i-mingcute-more-2-line" />
            </el-button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="add-root">
                  <span class="menu-drop__icon i-mingcute-add-circle-line" />
                  子菜单
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
        <el-scrollbar class="menu-admin__tree-scroll">
          <el-tree
            v-if="treeRecords.length"
            ref="treeRef"
            :data="treeRecords"
            node-key="id"
            default-expand-all
            highlight-current
            :indent="16"
            :expand-on-click-node="false"
            :filter-node-method="filterNode"
            :props="{ children: 'children', label: 'menuName' }"
            @node-click="onNodeClick"
          >
            <template #default="{ data }">
              <div class="menu-tree-node">
                <MenuIcon
                  v-if="menuIconClass((data as ADMIN.MenuTree).icon)"
                  :icon="(data as ADMIN.MenuTree).icon"
                  class-name="menu-tree-node__icon"
                />
                <span class="menu-tree-node__name" :title="(data as ADMIN.MenuTree).menuName">
                  {{ (data as ADMIN.MenuTree).menuName }}
                </span>
                <span v-if="canWrite" class="menu-tree-node__ops" @click.stop>
                  <el-dropdown
                    trigger="click"
                    @command="(command: MenuCommand) => onNodeCommand(command, data as ADMIN.MenuTree)"
                  >
                    <el-button link>
                      <span class="menu-tree-node__more-icon i-mingcute-more-2-line" />
                    </el-button>
                    <template #dropdown>
                      <el-dropdown-menu>
                        <el-dropdown-item command="add-child">
                          <span class="menu-drop__icon i-mingcute-add-circle-line" />
                          子菜单
                        </el-dropdown-item>
                        <el-dropdown-item command="add-func">
                          <span class="menu-drop__icon i-mingcute-add-square-line" />
                          功能点
                        </el-dropdown-item>
                        <el-dropdown-item command="delete" divided>
                          <span class="menu-drop__icon i-mingcute-delete-2-line" />
                          删除
                        </el-dropdown-item>
                      </el-dropdown-menu>
                    </template>
                  </el-dropdown>
                </span>
              </div>
            </template>
          </el-tree>
          <div v-else class="menu-admin__tree-empty">
            暂无数据
          </div>
        </el-scrollbar>
      </aside>
      <section class="menu-admin__main">
        <template v-if="selectedNode">
          <el-scrollbar class="menu-admin__body">
            <div class="menu-admin__body-inner">
              <MenuDetailForm :node="selectedNode" :can-write="canWrite" @saved="handleSaved(selectedNode.id)" />
              <MenuButtonsTable
                :buttons="selectedFuncs"
                :can-write="canWrite"
                @add="addUnderSelected('FUNC')"
                @edit="row => dialogRef?.showEdit(row)"
                @remove="removeNode"
              />
            </div>
          </el-scrollbar>
        </template>
        <div v-else class="menu-admin__empty">
          从左侧选择，或先新增
        </div>
      </section>
    </div>
    <EditMenuDialog ref="dialogRef" @saved="handleSaved" />
  </PageCard>
</template>

<style scoped lang="scss">
.menu-admin {
  display: flex;
  height: 100%;
  min-height: 0;
  overflow: hidden;
}

.menu-admin__tree {
  display: flex;
  flex: 0 0 292px;
  flex-direction: column;
  width: 292px;
  min-height: 0;
  padding: 12px;
  box-sizing: border-box;
  border-right: 1px solid var(--el-border-color-lighter);
  background: var(--el-bg-color);
}

.menu-admin__head {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-bottom: 8px;
}

.menu-admin__search {
  flex: 1;
  min-width: 0;
}

.menu-admin__more {
  width: 32px;
  padding: 0;
}

.menu-admin__tree-scroll {
  flex: 1;
  min-height: 0;
}

.menu-admin__tree-empty,
.menu-admin__empty {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 24px;
  color: var(--el-text-color-secondary);
  font-size: 13px;
}

.menu-admin__main {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  background: var(--el-fill-color-lighter);
}

.menu-admin__body {
  flex: 1;
  min-height: 0;
}

.menu-admin__body-inner {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 12px;
}

.menu-tree-node {
  display: flex;
  flex: 1;
  align-items: center;
  gap: 6px;
  min-width: 0;
  padding-right: 4px;
}

.menu-tree-node__icon {
  flex-shrink: 0;
  font-size: 15px;
}

.menu-tree-node__name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.menu-tree-node__ops {
  margin-left: auto;
  flex-shrink: 0;
  opacity: 0;
}

.menu-tree-node__more-icon,
.menu-drop__icon {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}

.menu-drop__icon {
  margin-right: 7px;
}

.menu-tree-node:hover .menu-tree-node__ops,
.menu-tree-node__ops:focus-within {
  opacity: 1;
}

:deep(.el-tree-node__content) {
  height: 34px;
  transition: none;
}

:deep(.el-tree-node.is-current > .el-tree-node__content) {
  color: var(--el-color-primary);
  font-weight: 600;
}
</style>

<style lang="scss">
@use './menu-admin.scss';
</style>
