<script setup lang="ts">
import type { ElTree } from 'element-plus'
import type { EditMenuDialogInstance, MenuType } from './components/EditMenuDialog.vue'
import { Delete, Plus, Search } from '@element-plus/icons-vue'
import { delMenu, listMenuTree } from '@/apis/admin/menu'
import MenuIcon from '@/components/MenuIcon.vue'
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
  treeNodeIcon,
} from './menuAdmin'

const loading = ref(false)
const keyword = ref('')
const selectedId = ref('')
const records = ref<ADMIN.MenuTree[]>([])
const dialogRef = ref<EditMenuDialogInstance>()
const treeRef = ref<InstanceType<typeof ElTree>>()
const menuStore = useMenuStore()

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
  treeRef.value?.filter(keyword.value)
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

function addUnderNode(data: ADMIN.MenuTree) {
  if (!data.id)
    return
  selectNode(data.id)
  addChild(data.id)
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

onMounted(() => fetchData())
</script>

<template>
  <PageCard title="菜单管理" :scroll-content="false">
    <div v-loading="loading" class="menu-admin">
      <aside class="menu-admin__tree">
        <div class="menu-admin__tree-head">
          <el-input
            v-model="keyword"
            clearable
            :prefix-icon="Search"
            placeholder="搜索"
            @keyup.enter="applyFilter"
            @clear="applyFilter"
          />
          <el-button type="primary" :icon="Plus" title="新增" @click="addChild('0')" />
        </div>
        <el-scrollbar class="menu-admin__tree-scroll">
          <el-tree
            v-if="treeRecords.length"
            ref="treeRef"
            :data="treeRecords"
            node-key="id"
            default-expand-all
            highlight-current
            :indent="18"
            :expand-on-click-node="false"
            :filter-node-method="filterNode"
            :props="{ children: 'children', label: 'menuName' }"
            @node-click="onNodeClick"
          >
            <template #default="{ data }">
              <span class="menu-tree-node" :class="{ 'is-current': data.id === selectedId }">
                <MenuIcon
                  :icon="treeNodeIcon(data as ADMIN.MenuTree)"
                  class-name="menu-tree-node__icon"
                />
                <span class="menu-tree-node__name">{{ (data as ADMIN.MenuTree).menuName }}</span>
                <span class="menu-tree-node__ops" @click.stop>
                  <el-button
                    text
                    :icon="Plus"
                    title="增加子菜单"
                    @click="addUnderNode(data as ADMIN.MenuTree)"
                  />
                  <el-button
                    text
                    :icon="Delete"
                    title="删除当前项"
                    @click="removeNode(data as ADMIN.MenuTree)"
                  />
                </span>
              </span>
            </template>
          </el-tree>
          <div v-else class="menu-admin__tree-empty">暂无数据</div>
        </el-scrollbar>
      </aside>
      <section class="menu-admin__main">
        <template v-if="selectedNode">
          <el-scrollbar class="menu-admin__body">
            <div class="menu-admin__body-inner">
              <MenuDetailForm :node="selectedNode" @saved="handleSaved(selectedNode.id)" />
              <MenuButtonsTable
                :buttons="selectedFuncs"
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
  background: var(--el-fill-color-extra-light);

  &__tree {
    display: flex;
    flex-direction: column;
    gap: 12px;
    width: 300px;
    padding: 16px 12px 12px;
    box-sizing: border-box;
    border-right: 1px solid var(--el-border-color-lighter);
    background: var(--el-bg-color);
  }

  &__tree-head {
    display: flex;
    align-items: center;
    gap: 8px;

    :deep(.el-input) {
      flex: 1;
      min-width: 0;
    }
  }

  &__tree-scroll {
    flex: 1;
    min-height: 0;
  }

  &__tree-empty,
  &__empty {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    padding: 24px;
    color: var(--el-text-color-secondary);
    font-size: 13px;
  }

  &__main {
    display: flex;
    flex: 1;
    flex-direction: column;
    min-width: 0;
  }

  &__body {
    flex: 1;
    min-height: 0;
  }

  &__body-inner {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 12px;
  }
}

.menu-tree-node {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  min-width: 0;
  padding-right: 2px;

  &__icon {
    font-size: 15px;
  }

  &__name {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__ops {
    display: none;
    align-items: center;
    flex-shrink: 0;
    gap: 0;

    :deep(.el-button) {
      width: 22px;
      height: 22px;
      min-height: 22px;
      padding: 0;
      font-size: 14px;
      color: var(--el-text-color-secondary);
    }

    :deep(.el-button:hover) {
      color: var(--el-color-primary);
      background: var(--el-color-primary-light-9);
    }
  }

  &:hover &__ops,
  &.is-current &__ops {
    display: inline-flex;
  }
}

:deep(.el-tree-node__content) {
  height: 34px;
  border-radius: 6px;
}

:deep(.el-tree-node__content:hover) {
  background: var(--el-fill-color-light);
}

:deep(.el-tree--highlight-current .el-tree-node.is-current > .el-tree-node__content) {
  background: var(--el-color-primary-light-9);
}
</style>

<style lang="scss">
@use './menu-admin.scss';
</style>
