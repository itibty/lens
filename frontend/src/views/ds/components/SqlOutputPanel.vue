<!--
 * @Description: SQL 编辑页底部输出面板（可折叠 / 拖高；结果 Tabs）
-->
<script setup lang="ts">
import type { SqlOutputTab } from './debugResult'

const props = withDefaults(defineProps<{
  loading?: boolean
  tabs?: SqlOutputTab[]
  activeTabId?: string
}>(), {
  loading: false,
  tabs: () => [],
  activeTabId: '',
})
const emit = defineEmits<{
  'update:activeTabId': [id: string]
  'closeTab': [id: string]
}>()
const OUTPUT_HEIGHT_KEY = 'NA:ds-sql-output-height'
const DEFAULT_HEIGHT = 240
const MIN_HEIGHT = 120
const HEADER_HEIGHT = 36

const collapsed = ref(false)
const panelHeight = ref(DEFAULT_HEIGHT)
const dragging = ref(false)

/** 当前激活 Tab；id 失效时回退到最后一个 */
const activeTab = computed(() =>
  props.tabs.find(tab => tab.id === props.activeTabId) || props.tabs[props.tabs.length - 1],
)

const stackLines = computed(() => {
  const raw = activeTab.value?.errorInfo?.stackTrace
  if (!raw)
    return [] as string[]
  return raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n')
})

function selectTab(id: string) {
  if (id !== props.activeTabId)
    emit('update:activeTabId', id)
}

function closeTab(id: string, e: MouseEvent) {
  e.stopPropagation()
  emit('closeTab', id)
}

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
      <template v-if="!tabs.length">
        <div class="sql-output__empty">
          点击「运行」查看输出
        </div>
      </template>

      <template v-else>
        <div class="sql-output__tabs">
          <div
            v-for="tab in tabs"
            :key="tab.id"
            class="sql-output__tab"
            :class="{ 'is-active': tab.id === activeTab?.id }"
            @click="selectTab(tab.id)"
          >
            <span class="sql-output__tab-title">{{ tab.title }}</span>
            <span
              class="sql-output__tab-close"
              title="关闭"
              @click="closeTab(tab.id, $event)"
            >
              <span class="i-mingcute-close-line text-12px" />
            </span>
          </div>
        </div>

        <el-scrollbar class="sql-output__scroll">
          <div class="sql-output__content">
            <template v-if="activeTab?.errorInfo">
              <div class="debug-error">
                <pre
                  v-if="activeTab.errorInfo.error"
                  class="debug-error__block debug-error__summary"
                >{{ activeTab.errorInfo.error }}</pre>
                <div
                  v-if="activeTab.errorInfo.stackTrace"
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
                  v-if="!activeTab.errorInfo.error && !activeTab.errorInfo.stackTrace && activeTab.errorInfo.fallback"
                  class="debug-error__block debug-error__summary"
                >{{ activeTab.errorInfo.fallback }}</pre>
              </div>
            </template>

            <template v-else>
              <div class="pb-10px">
                <ListTable
                  :key="activeTab.id"
                  layout="fixed"
                  :columns="activeTab.columns"
                  :records="activeTab.records"
                  :border="true"
                  :page-size="5"
                  show-export
                  show-filter
                  sortable
                  :export-name="`sql-result-${activeTab.title}`"
                />
              </div>
              <el-descriptions
                v-if="activeTab?.debugInfo"
                :border="true"
                :column="1"
                class="custom-el-desc"
              >
                <el-descriptions-item>
                  <template #label>
                    执行脚本
                  </template>
                  <span>{{ activeTab.debugInfo.sql }}</span>
                </el-descriptions-item>
                <el-descriptions-item label="执行参数">
                  {{ activeTab.debugInfo.params }}
                </el-descriptions-item>
                <el-descriptions-item
                  v-for="(timeInfo, index) in activeTab.debugInfo.timeInfos"
                  :key="index"
                  :label="timeInfo.taskName"
                >
                  {{ formatTimeInfo(timeInfo) }}
                </el-descriptions-item>
              </el-descriptions>
              <div
                v-if="activeTab && !activeTab.records.length && !activeTab.debugInfo"
                class="sql-output__empty"
              >
                暂无数据
              </div>
            </template>
          </div>
        </el-scrollbar>
      </template>
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

  &__tabs {
    flex-shrink: 0;
    display: flex;
    align-items: flex-end;
    gap: 4px;
    padding: 6px 8px 0;
    overflow-x: auto;
    background: #f5f7fa;
    // 用 inset 画底边，避免 overflow 裁切负 margin
    box-shadow: inset 0 -1px 0 var(--el-border-color-lighter);
  }

  &__tab {
    position: relative;
    flex-shrink: 0;
    display: inline-flex;
    align-items: center;
    gap: 4px;
    height: 28px;
    padding: 0 8px 0 10px;
    border: 1px solid transparent;
    border-bottom: none;
    border-radius: 4px 4px 0 0;
    color: var(--el-text-color-regular);
    font-size: 12px;
    line-height: 1;
    cursor: pointer;
    user-select: none;

    &:hover {
      color: var(--el-text-color-primary);
      background: color-mix(in srgb, #fff 70%, transparent);
    }

    &.is-active {
      z-index: 1;
      color: var(--el-color-primary);
      background: #fff;
      border-color: var(--el-border-color-lighter);
      border-bottom: none;
      font-weight: 500;

      // 盖住 tab 栏底边线，与下方内容连通
      &::after {
        content: '';
        position: absolute;
        left: 0;
        right: 0;
        bottom: 0;
        height: 1px;
        background: #fff;
      }
    }
  }

  &__tab-title {
    max-width: 120px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__tab-close {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 16px;
    height: 16px;
    border-radius: 2px;
    color: var(--el-text-color-secondary);

    &:hover {
      color: var(--el-color-danger);
      background: var(--el-fill-color);
    }
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
