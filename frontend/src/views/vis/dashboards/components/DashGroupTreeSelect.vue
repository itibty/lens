<!--
 * @Description: 看板分组树选择（列表筛选 / 移组 / 编辑页 / 抽屉上级）
-->
<script setup lang="ts">
const props = withDefaults(defineProps<{
  modelValue?: string | null
  data?: VIS.DashGroupInfo[]
  rootLabel?: string
  excludeId?: string
  placeholder?: string
  clearable?: boolean
  disabled?: boolean
}>(), {
  modelValue: null,
  data: () => [],
  rootLabel: '',
  excludeId: '',
  placeholder: '请选择分组',
  clearable: true,
  disabled: false,
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: string | null): void
}>()

function prune(nodes: VIS.DashGroupInfo[], excludeId?: string): VIS.DashGroupInfo[] {
  const out: VIS.DashGroupInfo[] = []
  for (const node of nodes) {
    if (excludeId && node.id === excludeId)
      continue
    out.push({
      ...node,
      children: node.children?.length ? prune(node.children, excludeId) : [],
    })
  }
  return out
}

const treeData = computed(() => {
  const pruned = prune(props.data ?? [], props.excludeId)
  if (!props.rootLabel)
    return pruned
  const root: VIS.DashGroupInfo = {
    id: '0',
    pid: '0',
    groupName: props.rootLabel,
    children: [],
  }
  return [root, ...pruned]
})

function onChange(value: string | null) {
  emit('update:modelValue', value ?? null)
}
</script>

<template>
  <el-tree-select
    class="w-full"
    :model-value="modelValue ?? undefined"
    :data="treeData"
    node-key="id"
    :props="{ label: 'groupName', children: 'children' }"
    :placeholder="placeholder"
    :clearable="clearable"
    :disabled="disabled"
    check-strictly
    filterable
    default-expand-all
    render-after-expand
    @update:model-value="onChange"
  />
</template>
