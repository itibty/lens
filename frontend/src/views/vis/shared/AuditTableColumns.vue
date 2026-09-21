<template>
  <el-table-column prop="createByName" label="创建人" min-width="120" show-overflow-tooltip>
    <template #default="{ row }">
      {{ row.createByName || '—' }}
    </template>
  </el-table-column>
  <el-table-column prop="createAt" label="创建时间" width="180">
    <template #default="{ row }">
      {{ row.createAt || '—' }}
    </template>
  </el-table-column>
  <el-table-column prop="modifyByName" label="更新人" min-width="120" show-overflow-tooltip>
    <template #default="{ row }">
      {{ row.modifyByName || '—' }}
    </template>
  </el-table-column>
  <el-table-column prop="modifyAt" label="更新时间" width="180">
    <template #default="{ row }">
      {{ row.modifyAt || '—' }}
    </template>
  </el-table-column>
</template>
