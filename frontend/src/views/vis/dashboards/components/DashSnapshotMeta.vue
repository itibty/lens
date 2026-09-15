<script setup lang="ts">
import type { CardQueryStatus } from '../dashQueryStatus'
import { dataTimeText, formatQueryTime } from '@/views/vis/shared/queryTime'

const props = defineProps<{
  cards: Record<string, CardQueryStatus>
  generatedAt?: string
}>()

const sources = computed(() => {
  const unique = new Map<string, { name: string, text: string }>()
  for (const row of Object.values(props.cards)) {
    if (!row.meta)
      continue
    const text = dataTimeText(row.meta)
    if (text)
      unique.set(`${row.meta.datasetId}:${text}`, { name: row.meta.datasetName || '数据集', text })
  }
  return [...unique.values()]
})
</script>

<template>
  <div class="dash-snapshot-meta">
    <span v-if="generatedAt">生成于 {{ formatQueryTime(generatedAt) }}</span>
    <span v-for="source in sources" :key="`${source.name}:${source.text}`">{{ source.name }} · {{ source.text }}</span>
  </div>
</template>

<style scoped lang="scss">
.dash-snapshot-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 16px;
  padding: 10px 0;
  color: var(--dash-content-muted, var(--el-text-color-secondary));
  font-size: 12px;
}
</style>
