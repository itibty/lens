<!--
 * @Description: 看板分组树选择。根节点表示报表中心，分组挂在其下。
-->
<script setup lang="ts">
import MenuIcon from '@/components/MenuIcon.vue'

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
  return [{
    id: '0',
    pid: '0',
    groupName: props.rootLabel,
    icon: 'report-line',
    children: pruned,
  }]
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
  >
    <template #default="{ data }">
      <span class="dash-group-option">
        <MenuIcon
          v-if="(data as VIS.DashGroupInfo).icon"
          :icon="(data as VIS.DashGroupInfo).icon"
          class-name="dash-group-option__icon"
        />
        <span>{{ (data as VIS.DashGroupInfo).groupName }}</span>
      </span>
    </template>
  </el-tree-select>
</template>

<style scoped lang="scss">
.dash-group-option {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.dash-group-option__icon {
  font-size: 15px;
}
</style>
