<script setup lang="ts">
import dayjs from 'dayjs'
import { listPersonalReports, setReportFavorite } from '@/apis/vis/personalReport'
import SvgIcon from '@/components/SvgIcon.vue'
import { formatQueryTime } from '@/views/vis/shared/queryTime'
import { apiErrorMessage } from '@/views/vis/shared/visRequest'

const rows = ref<VIS.PersonalReportInfo[]>([])
const loading = ref(false)
const error = ref('')
const busyIds = ref(new Set<string>())
const groups = computed(() => [
  { key: 'favorite', title: '收藏', empty: '暂无收藏', rows: rows.value.filter(row => row.favorite) },
  { key: 'recent', title: '最近访问', empty: '暂无访问记录', rows: rows.value.filter(row => row.lastViewedAt) },
])
let seq = 0

async function load() {
  const current = ++seq
  loading.value = true
  error.value = ''
  try {
    const result = await listPersonalReports({ showErrorMessage: false })
    if (current === seq)
      rows.value = result.data?.list || []
  }
  catch (e) {
    if (current === seq)
      error.value = apiErrorMessage(e, '报表加载失败')
  }
  finally {
    if (current === seq)
      loading.value = false
  }
}
async function favorite(row: VIS.PersonalReportInfo) {
  if (!row.dashboardId || busyIds.value.has(row.dashboardId))
    return
  busyIds.value.add(row.dashboardId)
  try {
    await setReportFavorite({ dashboardId: row.dashboardId, favorite: !row.favorite })
    row.favorite = !row.favorite
  }
  catch (e) {
    error.value = apiErrorMessage(e, '收藏操作失败')
  }
  finally {
    busyIds.value.delete(row.dashboardId)
  }
}
function viewedAt(value: string) {
  const date = dayjs(value)
  const now = dayjs()
  if (date.isSame(now, 'day'))
    return `今天 ${date.format('HH:mm')}`
  if (date.isSame(now.subtract(1, 'day'), 'day'))
    return `昨天 ${date.format('HH:mm')}`
  return date.format(date.isSame(now, 'year') ? 'MM-DD HH:mm' : 'YYYY-MM-DD')
}
onMounted(load)
onActivated(() => {
  if (!loading.value)
    void load()
})
onBeforeUnmount(() => seq++)
</script>

<template>
  <div v-spinner="loading" class="personal-reports">
    <div class="personal-reports__illustration" aria-hidden="true">
      <SvgIcon icon="index" class-name="personal-reports__art" />
    </div>
    <el-alert v-if="error" :title="error" type="error" :closable="false" class="personal-reports__error">
      <el-button text @click="load">
        重试
      </el-button>
    </el-alert>
    <div class="personal-reports__sections">
      <section v-for="group in groups" :key="group.key" class="report-list" :aria-labelledby="`report-list-${group.key}`">
        <header class="report-list__header">
          <h2 :id="`report-list-${group.key}`">
            {{ group.title }}
          </h2>
          <span class="report-list__count">{{ group.rows.length }}</span>
        </header>
        <ul v-if="group.rows.length" class="report-list__items">
          <li v-for="row in group.rows" :key="row.dashboardId" class="report-list__row">
            <RouterLink :to="{ name: 'ReportView', params: { id: row.dashboardId } }" class="report-list__link">
              <span class="report-list__name" :title="row.dashboardName">{{ row.dashboardName }}</span>
              <time v-if="group.key === 'recent' && row.lastViewedAt" :datetime="row.lastViewedAt" :title="formatQueryTime(row.lastViewedAt)">{{ viewedAt(row.lastViewedAt) }}</time>
            </RouterLink>
            <button
              type="button" class="report-list__favorite"
              :class="{ 'is-favorite': row.favorite }"
              :disabled="busyIds.has(row.dashboardId || '')"
              :aria-label="(row.favorite ? '取消收藏' : '收藏') + row.dashboardName"
              :title="row.favorite ? '取消收藏' : '收藏'" :aria-pressed="!!row.favorite"
              @click="favorite(row)"
            >
              <span :class="busyIds.has(row.dashboardId || '') ? 'i-svg-spinners-ring-resize' : row.favorite ? 'i-mingcute-star-fill' : 'i-mingcute-star-line'" />
            </button>
          </li>
        </ul>
        <div v-else-if="!loading && !error" class="report-list__empty">
          {{ group.empty }}
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use '@/theme/presentation.scss' as ui;

.personal-reports {
  padding: clamp(24px, 5vh, 56px) 28px 40px;
  max-width: 820px;
  margin: 0 auto;
  box-sizing: border-box;
}
.personal-reports__illustration {
  display: flex;
  justify-content: center;
  margin-bottom: 20px;

  :deep(.personal-reports__art) {
    width: clamp(180px, 25vh, 240px);
    height: clamp(180px, 25vh, 240px);
  }
}
.personal-reports__error {
  margin-bottom: 16px;
}
.personal-reports__sections {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  align-items: start;
  gap: 20px;
}
.report-list {
  min-width: 0;
  padding: 0 16px 8px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
  background: var(--el-bg-color);
}
.report-list__header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 14px 0 10px;
  border-bottom: 1px solid var(--el-border-color-lighter);

  h2 {
    margin: 0;
    font-size: 14px;
    font-weight: 600;
  }
}
.report-list__count {
  color: var(--el-text-color-placeholder);
  font-size: 12px;
  font-variant-numeric: tabular-nums;
}
.report-list__items {
  list-style: none;
  padding: 4px 0 0;
  margin: 0;
  max-height: 288px;
  overflow-y: auto;
}
.report-list__row {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 40px;
  border-radius: 4px;

  &:hover,
  &:focus-within {
    background: var(--el-fill-color-lighter);
  }
}
.report-list__link {
  display: flex;
  flex: 1;
  align-items: center;
  gap: 12px;
  min-width: 0;
  min-height: 40px;
  color: var(--el-text-color-primary);
  text-decoration: none;
  font-size: 13px;
  @include ui.focus-ring;

  &:hover {
    color: var(--el-color-primary);
  }

  time {
    flex-shrink: 0;
    margin-left: auto;
    color: var(--el-text-color-secondary);
    font-size: 12px;
    font-variant-numeric: tabular-nums;
  }
}
.report-list__name {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.report-list__favorite {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 28px;
  height: 32px;
  padding: 0;
  border: 0;
  background: none;
  color: var(--el-text-color-placeholder);
  font-size: 14px;
  cursor: pointer;
  @include ui.focus-ring;

  &.is-favorite {
    color: var(--el-color-warning);
  }
  &:disabled {
    cursor: wait;
  }
}
.report-list__empty {
  padding: 36px 0;
  text-align: center;
  color: var(--el-text-color-placeholder);
  font-size: 13px;
}
@media (max-width: 640px) {
  .personal-reports {
    padding: 20px;
  }
  .personal-reports__sections {
    grid-template-columns: minmax(0, 1fr);
    gap: 16px;
  }
  .personal-reports__illustration {
    margin-bottom: 20px;

    :deep(.personal-reports__art) {
      width: 180px;
      height: 180px;
    }
  }
}
</style>
