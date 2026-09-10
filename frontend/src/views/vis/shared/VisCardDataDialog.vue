<script setup lang="ts">
import type { DetailHit } from './cardDetail'
import type { VisQueryConfig, VisVisualConfig } from './types'
import { useClipboard } from '@vueuse/core'
import { LENS_THEME_KEY } from '@/theme/context'
import { themeCssVars } from '@/theme/cssVars'
import { LIGHT_THEME } from '@/theme/tokens'
import { showToast } from '@/utils/index'
import { contextFromTableRow, isContrastField } from './cardDetail'
import { cardExportFileName, saveBlobFile } from './cardExport'
import { VIS_EMPTY_TEXT } from './emptyState'
import { formatMetricField } from './fieldStyle'
import { listTableFields } from './listTable'
import { metricAlias } from './types'

const props = defineProps<{
  title: string
  query: VisQueryConfig
  visual: VisVisualConfig
  data: VIS.QueryDataResponse
  allowDetail: boolean
  allowDownload: boolean
}>()
const emit = defineEmits<{ openDetail: [hit: DetailHit] }>()
const open = defineModel<boolean>({ default: false })
// 弹窗和溢出提示会 Teleport 到 body，显式携带看板主题，避免回落到全局浅色。
const scopedTheme = inject(LENS_THEME_KEY, null)
const dialogThemeStyle = computed(() => {
  const theme = scopedTheme?.value ?? LIGHT_THEME
  return {
    ...themeCssVars(theme),
    '--el-dialog-header-bg': theme.surface.panel,
    '--el-dialog-bg-color': theme.surface.panel,
    '--el-dialog-box-shadow': theme.shadow.floating,
    'color-scheme': theme.mode,
    'color': theme.text.regular,
  }
})
const tooltipOptions = computed(() => ({ effect: 'light', popperStyle: dialogThemeStyle.value }))
const page = ref(1)
const pageSize = 50
const { copy } = useClipboard({ legacy: true })
const fields = computed(() => listTableFields(props.query, props.data))
const metrics = computed(() => new Set((props.query.metrics ?? []).map(metricAlias)))
const rows = computed(() => props.data.rows ?? [])
const pageRows = computed(() => rows.value.slice((page.value - 1) * pageSize, page.value * pageSize))
watch([open, () => props.data], () => {
  page.value = 1
})

function cellText(row: Record<string, unknown>, field: string) {
  const value = row[field]
  return metrics.value.has(field)
    ? formatMetricField(props.visual, props.query, field, value)
    : value == null ? '—' : String(value)
}

function canDetail(field: string) {
  return props.allowDetail && metrics.value.has(field) && !isContrastField(props.query, field, props.data)
}

function showDetail(row: Record<string, unknown>, field: string) {
  if (!canDetail(field))
    return
  const hit = contextFromTableRow(props.query, row, field, props.data)
  if (hit) {
    open.value = false
    emit('openDetail', hit)
  }
}

function values() {
  return [fields.value, ...rows.value.map(row => fields.value.map(field => cellText(row, field)))]
}

async function copyData() {
  try {
    await copy(values().map(row => row.map(value => String(value).replace(/[\t\r\n]/g, ' ')).join('\t')).join('\n'))
    showToast('已复制当前结果（含表头）', 'success')
  }
  catch {
    showToast('复制失败，请选择表格内容后复制', 'warning')
  }
}

function downloadData() {
  if (!props.allowDownload)
    return
  const csv = values().map(row => row.map((value) => {
    // 防止文本在电子表格中被作为公式执行。
    const text = String(value)
    const safe = /^[=+@\-\t\r]/.test(text) ? `'${text}` : text
    return `"${safe.replace(/"/g, '""')}"`
  }).join(',')).join('\r\n')
  saveBlobFile(new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8' }), `${cardExportFileName(props.title)}.csv`)
}
</script>

<template>
  <CustomDialog
    v-model:visible="open"
    :title="title || '数据'"
    size=""
    width="min(1000px, 94vw)"
    :show-footer="false"
    :style="dialogThemeStyle"
    append-to-body
    destroy-on-close
    class="vis-card-data-dialog"
  >
    <template #custom-dialog-body>
      <div class="data-toolbar">
        <span>当前结果共 {{ rows.length }} 行<span v-if="data.truncated">，仅展示部分结果</span></span>
        <div>
          <el-button :disabled="!rows.length" @click="copyData">
            复制
          </el-button>
          <el-button v-if="allowDownload" :disabled="!rows.length" @click="downloadData">
            下载 CSV
          </el-button>
        </div>
      </div>
      <el-table class="data-table" :data="pageRows" :tooltip-options="tooltipOptions" stripe border max-height="55vh" :empty-text="VIS_EMPTY_TEXT">
        <el-table-column
          v-for="field in fields"
          :key="field"
          :label="field"
          :min-width="160"
          show-overflow-tooltip
        >
          <template #default="{ row }">
            <el-button
              v-if="canDetail(field)"
              class="data-metric-link"
              link
              type="primary"
              :aria-label="`${field}：${cellText(row, field)}，查看明细`"
              title="查看明细"
              @click="showDetail(row, field)"
            >
              {{ cellText(row, field) }}
            </el-button>
            <span v-else>{{ cellText(row, field) }}</span>
          </template>
        </el-table-column>
      </el-table>
      <div v-if="rows.length > pageSize" class="data-footer">
        <el-pagination
          v-model:current-page="page"
          :page-size="pageSize"
          :total="rows.length"
          layout="prev, pager, next"
          small
        />
      </div>
    </template>
  </CustomDialog>
</template>

<style scoped lang="scss">
.data-toolbar,
.data-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
  color: var(--el-text-color-secondary);
  font-size: 13px;
}

.data-toolbar {
  margin-bottom: 12px;
}

.data-footer {
  justify-content: flex-end;
  margin-top: 12px;
}

.data-table :deep(.el-table__body) {
  color: var(--el-table-text-color);
}

.data-metric-link {
  font: inherit;
  text-decoration: underline dotted;
  text-underline-offset: 3px;

  &:hover {
    text-decoration-style: solid;
  }

  &:focus-visible {
    outline: 2px solid var(--el-color-primary);
    outline-offset: 2px;
    border-radius: 2px;
  }
}
</style>
