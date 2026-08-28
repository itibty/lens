<!--
 * @Description: SQL 编辑页底部输出面板（可折叠 / 拖高）
-->
<script setup lang="ts">
import type { SqlOutputRun } from './debugResult'

const props = withDefaults(defineProps<{
  loading?: boolean
  run?: SqlOutputRun | null
}>(), {
  loading: false,
  run: null,
})
const OUTPUT_HEIGHT_KEY = 'NA:ds-sql-output-height'
const DEFAULT_HEIGHT = 240
const MIN_HEIGHT = 120
const HEADER_HEIGHT = 36

const collapsed = ref(false)
const panelHeight = ref(DEFAULT_HEIGHT)
const dragging = ref(false)

const stackLines = computed(() => {
  const raw = props.run?.errorInfo?.stackTrace
  if (!raw)
    return [] as string[]
  return raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n')
})

function readStoredHeight() {
  const raw = localStorage.getItem(OUTPUT_HEIGHT_KEY)
  const n = raw ? Number(raw) : NaN
  if (Number.isFinite(n) && n >= MIN_HEIGHT)
    panelHeight.value = n
}

function persistHeight() {
  localStorage.setItem(OUTPUT_HEIGHT_KEY, String(panelHeight.value))
}

function toggleCollapse() {
  collapsed.value = !collapsed.value
}

function expand() {
  collapsed.value = false
}

function formatTimeInfo(timeInfo: VIS.Info) {
  return `用时：${timeInfo.time} ms，占比: ${timeInfo.percent}`
}

/** 顶边拖拽改高度；折叠态拖动会先展开 */
function onDragStart(e: MouseEvent) {
  e.preventDefault()
  if (collapsed.value) {
    collapsed.value = false
    panelHeight.value = HEADER_HEIGHT
  }

  dragging.value = true
  const startY = e.clientY
  const startH = panelHeight.value
  const maxH = Math.floor(window.innerHeight * 0.7)

  const onMove = (ev: MouseEvent) => {
    const next = startH + (startY - ev.clientY)
    panelHeight.value = Math.min(maxH, Math.max(HEADER_HEIGHT, next))
  }
  const onUp = () => {
    dragging.value = false
    if (panelHeight.value < MIN_HEIGHT) {
      collapsed.value = true
      readStoredHeight()
    }
    else {
      persistHeight()
    }
    window.removeEventListener('mousemove', onMove)
    window.removeEventListener('mouseup', onUp)
  }
  window.addEventListener('mousemove', onMove)
  window.addEventListener('mouseup', onUp)
}

onMounted(readStoredHeight)

defineExpose({
  expand,
  collapsed,
})
</script>

<template>
  <div
    class="sql-output"
    :class="{ 'is-collapsed': collapsed, 'is-resizing': dragging }"
    :style="{ height: collapsed ? `${HEADER_HEIGHT}px` : `${panelHeight}px` }"
  >
    <div
      class="resize-handle resize-handle--row resize-handle--top"
      title="拖动调整高度"
      @mousedown="onDragStart"
    />
    <div class="sql-output__header">
      <div class="sql-output__actions">
        <slot name="actions" />
      </div>
      <div
        class="sql-output__fold clickable"
        :title="collapsed ? '展开' : '折叠'"
        @click="toggleCollapse"
      >
        <i-mingcute-down-line v-if="collapsed" />
        <i-mingcute-up-line v-else />
      </div>
    </div>
    <div v-show="!collapsed" v-spinner="loading" class="sql-output__body">
      <template v-if="!run">
        <div class="sql-output__empty">
          点击「运行」查看输出
        </div>
      </template>

      <el-scrollbar v-else class="sql-output__scroll">
        <div class="sql-output__content">
          <template v-if="run.errorInfo">
            <div class="debug-error">
              <pre
                v-if="run.errorInfo.error"
                class="debug-error__block debug-error__summary"
              >{{ run.errorInfo.error }}</pre>
              <div
                v-if="run.errorInfo.stackTrace"
                class="debug-error__block debug-error__stack"
              >
                <div
                  v-for="(line, index) in stackLines"
                  :key="index"
                  class="debug-error__line"
                >
                  <span class="debug-error__lineno">{{ index + 1 }}</span>
                  <span class="debug-error__code">{{ line || ' ' }}</span>
                </div>
              </div>
              <pre
                v-if="!run.errorInfo.error && !run.errorInfo.stackTrace && run.errorInfo.fallback"
                class="debug-error__block debug-error__summary"
              >{{ run.errorInfo.fallback }}</pre>
            </div>
          </template>

          <template v-else>
            <div class="pb-10px">
              <ListTable
                :key="run.id"
                layout="fixed"
                :columns="run.columns"
                :records="run.records"
                :border="true"
                :page-size="5"
                show-export
                show-filter
                sortable
                export-name="sql-result"
              />
            </div>
            <el-descriptions
              v-if="run.debugInfo"
              :border="true"
              :column="1"
              class="custom-el-desc"
            >
              <el-descriptions-item>
                <template #label>
                  执行脚本
                </template>
                <span>{{ run.debugInfo.sql }}</span>
              </el-descriptions-item>
              <el-descriptions-item label="执行参数">
                {{ run.debugInfo.params }}
              </el-descriptions-item>
              <el-descriptions-item
                v-for="(timeInfo, index) in run.debugInfo.timeInfos"
                :key="index"
                :label="timeInfo.taskName"
              >
                {{ formatTimeInfo(timeInfo) }}
              </el-descriptions-item>
            </el-descriptions>
            <div
              v-if="!run.records.length && !run.debugInfo"
              class="sql-output__empty"
            >
              暂无数据
            </div>
          </template>
        </div>
      </el-scrollbar>
    </div>
  </div>
</template>

<style scoped lang="scss">
$sql-output-header-h: 36px;

.sql-output {
  position: relative;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  border-top: 1px solid var(--el-border-color-lighter);
  background: #fff;
  overflow: hidden;

  &__header {
    flex-shrink: 0;
    height: $sql-output-header-h;
    padding: 0 8px;
    display: flex;
    align-items: center;
    gap: 8px;
    background: #f5f7fa;
    border-bottom: 1px solid var(--el-border-color-lighter);
  }

  &__actions {
    display: flex;
    align-items: center;
    gap: 8px;
    padding-left: 20px;
  }

  &__fold {
    margin-left: auto;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    border-radius: 4px;
    color: var(--el-text-color-secondary);
    font-size: 16px;

    &:hover {
      background: var(--el-fill-color);
      color: var(--el-text-color-primary);
    }
  }

  &__body {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  &__scroll {
    flex: 1;
    min-height: 0;
    background: #fff;
  }

  &__content {
    padding: 10px;
  }

  &__empty {
    padding: 28px 12px;
    text-align: center;
    color: var(--el-text-color-secondary);
    font-size: 13px;
  }
}

.debug-error {
  border-radius: 4px;
  overflow: hidden;
  border: 1px solid var(--el-border-color-lighter);
  background: #fafafa;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;

  &__block {
    margin: 0;
    padding: 10px 12px;
    border: none;
    background: transparent;
    color: var(--el-text-color-regular);
    font-family: inherit;
    font-size: 12px;
    line-height: 1.65;
    tab-size: 2;
    white-space: pre-wrap;
    word-break: break-word;
    user-select: text;
  }

  &__summary {
    color: var(--el-color-danger);
    background: var(--el-color-danger-light-9);
    border-bottom: 1px solid var(--el-color-danger-light-7);
    border-left: 3px solid var(--el-color-danger);
  }

  &__stack {
    padding: 6px 0;
    color: #57606a;
    border-left: 3px solid #d0d7de;
  }

  &__line {
    display: flex;
    align-items: flex-start;
    min-height: 1.65em;
  }

  &__lineno {
    flex-shrink: 0;
    width: 40px;
    padding: 0 8px 0 0;
    text-align: right;
    color: #8c959f;
    user-select: none;
  }

  &__code {
    flex: 1;
    min-width: 0;
    padding-right: 12px;
    white-space: pre-wrap;
    word-break: break-word;
  }
}
</style>
