<script setup lang="ts">
import { Plus } from '@element-plus/icons-vue'

defineProps<{
  buttons: ADMIN.MenuTree[]
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
      <div class="menu-panel__title">功能点</div>
      <el-button type="primary" :icon="Plus" title="新增功能点" @click="emits('add')" />
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
      <el-table-column label="操作" width="120" align="right">
        <template #default="{ row }">
          <el-button link type="primary" @click="emits('edit', row as ADMIN.MenuTree)">编辑</el-button>
          <el-button link type="danger" @click="emits('remove', row as ADMIN.MenuTree)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>
  </section>
</template>
