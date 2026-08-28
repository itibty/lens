<script setup lang="ts">
import { Plus } from '@element-plus/icons-vue'

defineProps<{
  buttons: ADMIN.MenuTree[]
  canWrite?: boolean
}>()

const emits = defineEmits<{
  (e: 'add'): void
  (e: 'edit', row: ADMIN.MenuTree): void
  (e: 'remove', row: ADMIN.MenuTree): void
}>()
</script>

<template>
  <section class="menu-panel">
    <div class="menu-panel__head">
      <div class="menu-panel__title">
        功能点
      </div>
      <el-button
        v-if="canWrite"
        size="small"
        :icon="Plus"
        @click="emits('add')"
      >
        新增
      </el-button>
    </div>
    <el-table
      :data="buttons"
      row-key="id"
      border
      empty-text="暂无功能点"
    >
      <el-table-column prop="menuName" label="名称" min-width="140" />
      <el-table-column prop="permCode" label="权限码" min-width="180" show-overflow-tooltip />
      <el-table-column prop="sortNum" label="排序" width="72" />
      <el-table-column v-if="canWrite" label="操作" width="120">
        <template #default="{ row }">
          <el-button
            size="small"
            type="primary"
            link
            @click="emits('edit', row as ADMIN.MenuTree)"
          >
            编辑
          </el-button>
          <el-button
            size="small"
            type="primary"
            link
            @click="emits('remove', row as ADMIN.MenuTree)"
          >
            删除
          </el-button>
        </template>
      </el-table-column>
    </el-table>
  </section>
</template>
