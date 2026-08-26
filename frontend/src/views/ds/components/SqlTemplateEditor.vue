<!--
 * @Description: DS 局部 SQL 模板编辑器（Enjoy 高亮/补全 + 上下文 meta 补全）
-->
<script lang="ts" setup>
import type { Extension } from '@codemirror/state'
import type { Ref } from 'vue'
import type { EnjoyConstantItem, EnjoyMethodItem, SqlKeywordInput } from './sql-editor'
import type { FullWrapInstance } from '@/components/FullWrap.vue'
import { useClipboard, useVModel } from '@vueuse/core'
import { Codemirror } from 'vue-codemirror'
import { useEditorResize } from '@/components/editor/useEditorResize'
import { showToast } from '@/utils'
import { createLogger } from '@/utils/logger'
import { buildSqlTemplateExtensions, formatSqlWithEnjoy, resolveSqlKeywordsByDb } from './sql-editor'

export type { EnjoyConstantItem, EnjoyMethodItem, SqlKeywordInput }

type ToolEnum = 'COPY' | 'FMT' | 'FULL'

interface ToolConfig {
  key: string
  icon: string
  handler: () => void
  name?: string
  title?: string
}

export interface SqlTemplateEditorProps {
  modelValue: string
  sqlMeta?: VIS.SchemaInfo[]
  /** Enjoy 常量；空数组 = 关闭。无内置默认值。 */
  enjoyConstants?: EnjoyConstantItem[]
  /** Enjoy 方法；空数组 = 关闭。无内置默认值。 */
  enjoyMethods?: EnjoyMethodItem[]
  /**
   * SQL 关键字补全（显式优先）。
   * 未传时若有 sqlDb，则按库名映射；都未传 = StandardSQL 默认；[] = 关闭。
   */
  sqlKeywords?: SqlKeywordInput[]
  /**
   * 库类型名（如 meta.dbType: MySQL / PostgreSQL），自动映射常用关键字。
   * 被 sqlKeywords 覆盖。
   */
  sqlDb?: string

  teleportTo?: string
  resize?: boolean
  border?: boolean
  placeholder?: string
  autoFocus?: boolean
  readonly?: boolean

  tools?: Array<ToolEnum>
  toolsClass?: string
  showToolName?: boolean
}

const props = withDefaults(defineProps<SqlTemplateEditorProps>(), {
  readonly: false,
  autoFocus: false,
  placeholder: '请输入sql脚本',
  teleportTo: '#pc-content',
  resize: true,
  border: true,
  sqlMeta: () => [],
  enjoyConstants: () => [],
  enjoyMethods: () => [],
  tools: () => ['COPY', 'FMT', 'FULL'],
  toolsClass: '',
  showToolName: false,
})

const emits = defineEmits<{
  (e: 'update:modelValue', value: string): void
}>()

const logger = createLogger('SQL_TEMPLATE_EDITOR')
const localCode = useVModel(props, 'modelValue', emits)
const { copy, isSupported } = useClipboard({ source: localCode })

/** vue-codemirror 对 Extension 泛型过深，用 any[] 承接 */
const extensions = shallowRef<any[]>([])

/** sqlKeywords 显式传入优先；否则按 sqlDb 映射；都没有 → undefined（方言默认） */
function resolveKeywords(): SqlKeywordInput[] | undefined {
  if (props.sqlKeywords !== undefined)
    return props.sqlKeywords
  return resolveSqlKeywordsByDb(props.sqlDb)
}

/** 只组装一次；运行时词表/meta 经 getter 读取，避免 props 变更整表换 Extension */
function rebuildExtensions() {
  try {
    const exts: Extension[] = buildSqlTemplateExtensions({
      getSqlMeta: () => props.sqlMeta,
      getConstants: () => props.enjoyConstants,
      getMethods: () => props.enjoyMethods,
      getKeywords: () => resolveKeywords(),
    })
    extensions.value = exts
  }
  catch (e) {
    // 曾因 theme 选择器写错导致整组 Extension 挂掉；失败时给用户可见反馈
    logger.error('build extensions failed', e)
    showToast('编辑器初始化失败', 'error')
  }
}

const fullWrapRef = ref<FullWrapInstance>()
const isEditorFull = computed(() => {
  const isFull = fullWrapRef.value?.isFull
  if (typeof isFull === 'boolean')
    return isFull
  return (isFull as Ref<boolean> | undefined)?.value ?? false
})
const canResize = computed(() => !isEditorFull.value && props.resize)
const { wrapRef, resizing, wrapStyle, onResizeStart } = useEditorResize()

function toggleFull() {
  fullWrapRef.value?.toggle()
}

async function handleCopy() {
  if (!isSupported.value) {
    showToast('不支持复制', 'error')
    return
  }
  if (!localCode.value)
    return
  await copy()
  showToast('已复制!')
}

async function handleFormat() {
  if (!localCode.value)
    return
  localCode.value = await formatSqlWithEnjoy(localCode.value, () => {
    showToast('格式化失败', 'error')
  })
}

const toolsConfigMap: Record<string, ToolConfig> = {
  COPY: { key: 'COPY', icon: 'i-mingcute-copy-2-line', title: '复制', name: '复制', handler: () => { void handleCopy() } },
  FMT: { key: 'FMT', icon: 'i-mingcute-align-left-line', title: '格式化', name: '格式化', handler: () => { void handleFormat() } },
  FULL: { key: 'FULL', icon: 'i-mingcute-fullscreen-line', title: '全屏', name: '全屏', handler: toggleFull },
  EXT_FULL: { key: 'EXT_FULL', icon: 'i-mingcute-fullscreen-exit-line', title: '退出全屏', name: '退出全屏', handler: toggleFull },
}

const editorTools = computed(() => {
  return (props.tools ?? []).flatMap((item) => {
    if (item === 'FULL') {
      const active = isEditorFull.value ? 'EXT_FULL' : 'FULL'
      return [toolsConfigMap[active]!]
    }
    const config = toolsConfigMap[item]
    return config ? [config] : []
  })
})

// 同步构建，避免空 extensions 首屏；getter 已覆盖运行时词表
rebuildExtensions()
</script>

<template>
  <FullWrap ref="fullWrapRef" :teleport-to="teleportTo">
    <div
      ref="wrapRef"
      class="editor-wrap relative h-full"
      :class="{
        'resize-v': canResize,
        'is-resizing': resizing,
        'no-border': isEditorFull || !props.border,
      }"
      :style="canResize ? wrapStyle : undefined"
    >
      <div
        v-if="props.tools?.length > 0 || $slots['tools-prefix'] || $slots['tools-suffix']"
        class="tools-header"
        :class="toolsClass"
      >
        <slot name="tools-prefix" />
        <template v-for="item in editorTools" :key="item.key">
          <div v-throttle="item.handler" class="clickable tool-item" :title="item.title">
            <span :class="item.icon" class="icon" />
            <span v-if="props.showToolName" class="txt">{{ item.name }}</span>
          </div>
        </template>
        <slot name="tools-suffix" />
      </div>
      <div class="editor-body">
        <Codemirror
          v-model="localCode"
          :placeholder="placeholder"
          :style="{ height: '100%' }"
          :disabled="readonly"
          :autofocus="autoFocus"
          :indent-with-tab="true"
          :tab-size="2"
          :extensions="extensions"
        />
      </div>
      <div
        v-if="canResize"
        class="resize-handle resize-handle--row resize-handle--bottom resize-handle--fade"
        title="拖动调整高度"
        @mousedown="onResizeStart"
      />
    </div>
  </FullWrap>
</template>

<style lang="scss" scoped>
$toolsHeaderHeight: 32px;

.editor-wrap {
  width: 100%;
  min-height: calc($toolsHeaderHeight + 30px);
  border: 1px solid var(--ets-border-color, #ddd);
  border-radius: var(--el-border-radius-base, 2px);
  overflow: hidden;
  background-color: #fff;
  position: relative;
  box-sizing: border-box;

  &.resize-v {
    height: var(--ets-wrap-height, 200px);
    overflow: hidden;
  }

  &.no-border {
    border: none;
    border-radius: 0;
  }
}

.tools-header {
  height: $toolsHeaderHeight;
  display: flex;
  justify-content: var(--ets-tools-justify-content, flex-start);
  gap: 8px;
  align-items: center;
  padding: 0 4px;
  background-color: var(--ets-header-bg, #f5f6f7);
  border-bottom: 1px solid var(--ets-header-border-color, #ddd);
  box-sizing: border-box;

  .tool-item,
  :slotted(.tool-item) {
    padding: 4px 4px;
    box-sizing: border-box;
    display: flex;
    align-items: center;
    transition: 0.1s;
    border: 1px solid transparent;
    border-radius: var(--el-border-radius-base, 4px);
    color: var(--ets-tool-color, #797a7b);

    &:hover {
      background-color: var(--ets-tool-hover-bg, #dddee1);
    }

    .icon {
      font-size: 17px;
    }

    .txt {
      line-height: 1;
      margin-left: 3px;
      font-size: 12px;
    }
  }
}

.editor-body {
  height: 100%;
}

.tools-header + .editor-body {
  height: calc(100% - 32px);
}
</style>
