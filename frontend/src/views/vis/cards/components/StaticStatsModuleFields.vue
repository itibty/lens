<!--
 * @Description: 文本卡数字组模块
-->
<script setup lang="ts">
import type { VisVisualConfig } from '@/views/vis/shared/types'
import { STAT_GROUP_MAX, STAT_GROUP_MIN } from '@/views/vis/shared/staticModules'
import VisStaticStat from '@/views/vis/shared/VisStaticStat.vue'
import StaticStatItemRow from './StaticStatItemRow.vue'

const props = defineProps<{
  index: number
}>()

const visual = defineModel<VisVisualConfig>('visual', { required: true })

const mod = computed(() => {
  const item = visual.value.richtext?.modules?.[props.index]
  return item?.type === 'stats' ? item : null
})

const items = computed(() => mod.value?.items ?? [])

function addItem() {
  if (!mod.value || items.value.length >= STAT_GROUP_MAX)
    return
  mod.value.items.push({ label: '', value: 0 })
}

function removeItem(itemIndex: number) {
  if (!mod.value || items.value.length <= STAT_GROUP_MIN)
    return
  mod.value.items.splice(itemIndex, 1)
}
</script>

<template>
  <div
    v-if="mod"
    class="static-stats-fields"
  >
    <div class="static-stats-fields__preview">
      <VisStaticStat :items="items" />
    </div>
    <StaticStatItemRow
      v-for="(_item, itemIndex) in items"
      :key="itemIndex"
      v-model:visual="visual"
      :module-index="index"
      :item-index="itemIndex"
      @remove="removeItem"
    />
    <el-button
      v-if="items.length < STAT_GROUP_MAX"
      size="small"
      text
      @click="addItem"
    >
      添加一项
    </el-button>
  </div>
</template>

<style scoped lang="scss">
.static-stats-fields {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.static-stats-fields__preview {
  padding: 8px 10px;
  border: 1px solid var(--el-border-color-extra-light);
  border-radius: 8px;
  background: var(--el-bg-color);
}
</style>
