<!--
 * @Description: 菜单树
-->
<script setup lang="ts">
import type { ElTree } from 'element-plus'
import { listMenuTree } from '@/apis/admin/menu'

export interface MenuFunctionTreeInstance {
  getCheckedIds: () => string[]
}

export interface MenuFunctionTreeProps {
  showSearch?: boolean
  showCheckbox?: boolean
  checkedKeys?: string[]
}

const props = withDefaults(defineProps<MenuFunctionTreeProps>(), {
  showSearch: true,
  showCheckbox: true,
  checkedKeys: () => [],
})

const states = reactive({
  loading: false,
  filterText: '',
  defaultProps: {
    children: 'children',
    label: 'menuName',
  },
  records: [] as ADMIN.MenuTree[],
})

const treeRef = ref<InstanceType<typeof ElTree>>()
const treeRenderKey = computed(() => {
  const keys = (props.checkedKeys ?? []).map(String).join(',')
  return `${states.records.length}:${keys}`
})
const defaultCheckedKeys = computed(() => (props.checkedKeys ?? []).map(String))

function fetchData() {
  states.loading = true
  listMenuTree()
    .then((res) => {
      states.records = res.data?.list ?? []
    })
    .catch(() => {
      states.records = []
    })
    .finally(() => {
      states.loading = false
    })
}

function filterNode(value: string, data: ADMIN.MenuTree): boolean {
  if (!value)
    return true
  const kw = value.toLowerCase()
  return !!(
    data.menuName?.toLowerCase().includes(kw)
    || data.permCode?.toLowerCase().includes(kw)
    || data.routePath?.toLowerCase().includes(kw)
  )
}

function getCheckedIds(): string[] {
  const allNodes = (treeRef.value?.getCheckedNodes() ?? []) as ADMIN.MenuTree[]
  return allNodes
    .filter(node => node.menuType === 'FUNC')
    .map(node => String(node.id))
    .filter(Boolean)
}

watch(
  () => states.filterText,
  (value) => {
    treeRef.value?.filter(value)
  },
)

onMounted(() => {
  fetchData()
})
defineExpose({
  getCheckedIds,
})
</script>

<template>
  <div v-if="showSearch" class="mb-15px">
    <el-input
      v-model="states.filterText"
      placeholder="输入关键字过滤"
      clearable
    />
  </div>
  <div v-spinner="states.loading">
    <el-tree
      :key="treeRenderKey"
      ref="treeRef"
      class="filter-tree"
      :data="states.records"
      :props="states.defaultProps"
      :show-checkbox="showCheckbox"
      node-key="id"
      default-expand-all
      :default-checked-keys="defaultCheckedKeys"
      :filter-node-method="filterNode"
    >
      <template #default="{ node, data }">
        <span class="custom-tree-node">
          <span>{{ node.label }}</span>
          <span v-if="data.permCode" class="light1 ml-5px">[{{ data.permCode }}]</span>
        </span>
      </template>
    </el-tree>
  </div>
</template>

<style lang="scss" scoped>
.custom-tree-node {
  display: flex;
  align-items: center;
  flex: 1;
}
.light1 {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}
</style>
