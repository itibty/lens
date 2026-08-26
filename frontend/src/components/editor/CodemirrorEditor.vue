<!--
 * @Author: Chuang
 * @Date: 2021-09-29 15:35:22
 * @LastEditTime: 2026-03-20
 * @LastEditors: Chuang
 * @Description: codemirror封装
-->

<script lang="ts" setup>
import type { Ref } from 'vue'
import type { FullWrapInstance } from '@/components/FullWrap.vue'
import { javascript } from '@codemirror/lang-javascript'
import { json } from '@codemirror/lang-json'
import { sql } from '@codemirror/lang-sql'

import { useClipboard, useVModel } from '@vueuse/core'

import { Codemirror } from 'vue-codemirror'
import { showToast } from '@/utils'
import { formatCode } from '@/utils/code'
import { createLogger } from '@/utils/logger'
import { useEditorResize } from './useEditorResize'

export type LangEnum = 'js' | 'json' | 'sql'

type ToolEnum = 'COPY' | 'FMT' | 'EXEC' | 'SAVE' | 'FULL'
interface ToolConfig {
  key: string
  icon: string
  handler: () => void
  name?: string
  title?: string
}

export interface CodemirrorEditorProps {
  modelValue: string
  lang: LangEnum // 语言

  teleportTo?: string // 全屏容器
  resize?: boolean // 是否可调高度
  border?: boolean // 是否border

  initFmt?: boolean // 初始化是格式化
  placeholder?: string
  autoFocus?: boolean // 自动focus
  readonly?: boolean // 是否只读

  // 工具列表
  tools?: Array<ToolEnum>
  toolsClass?: string
  showToolName?: boolean
  toolNameMap?: Record<string, string>
  toolTitleMap?: Record<string, string>

  // sql 编辑器 配置 (数据库名、表名、字段名)
  // 考虑更通用的方案
  sqlMeta?: VIS.SchemaInfo[]
}

const props = withDefaults(defineProps<CodemirrorEditorProps>(), {
  readonly: false,
  autoFocus: false,
  placeholder: '请输入',
  initFmt: false,
  teleportTo: '#pc-content',
  resize: true,
  border: true,

  tools: () => ['COPY', 'FMT', 'EXEC', 'SAVE', 'FULL'],
  toolsClass: '',
  showToolName: false,
  toolNameMap: () => { return {} },
  toolTitleMap: () => { return {} },
})

const emits = defineEmits<{
  (e: 'update:modelValue', value: string): void
  (e: 'doExec', value: string): void
  (e: 'doSave', value: string): void
}>()

const TAG = 'CodemirrorEditor:'
const logger = createLogger('CODEMIRROR_EDITOR')

const localCode = useVModel(props, 'modelValue', emits)
const { copy, isSupported } = useClipboard({ source: localCode })
const extensions = ref<any[]>([])

function getLangExtensions(lang: LangEnum): any[] {
  if (lang === 'sql') {
    const schema: Record<string, string[]> = {}
    props.sqlMeta?.forEach((schemaInfo) => {
      schemaInfo.tableInfos?.forEach((table) => {
        schema[table.name] = table.fieldInfos?.map(f => f.name || '') || []
      })
    })
    return [sql(Object.keys(schema).length > 0 ? { schema } : {})]
  }
  else if (lang === 'js') {
    const jsLang = javascript({ jsx: false, typescript: false })
    return [jsLang]
  }
  else if (lang === 'json') {
    const jsonLang = json()
    return [jsonLang]
  }
  else {
    return []
  }
}

const fullWrapRef = ref<FullWrapInstance>()
function getFullWrapState(): boolean {
  const isFull = fullWrapRef.value?.isFull
  if (typeof isFull === 'boolean')
    return isFull

  return (isFull as Ref<boolean> | undefined)?.value ?? false
}

const isEditorFull = computed(() => getFullWrapState())
const canResize = computed(() => !isEditorFull.value && props.resize)
const { wrapRef, resizing, wrapStyle, onResizeStart } = useEditorResize()
const toolsConfigMap: Record<string, ToolConfig> = {
  COPY: {
    key: 'COPY',
    icon: 'i-mingcute-copy-2-line',
    title: '复制',
    name: '复制',
    handler: () => {
      logger.debug(TAG, '复制')
      if (!isSupported.value) {
        showToast('不支持复制', 'error')
        return
      }
      if (!localCode.value) {
        return
      }
      copy().then(() => {
        showToast('已复制!')
      })
    },
  },
  FMT: {
    key: 'FMT',
    icon: 'i-mingcute-align-left-line',
    title: '格式化',
    name: '格式化',
    handler: () => {
      handleFormat()
    },
  },
  EXEC: {
    key: 'EXEC',
    icon: 'i-mingcute-play-line',
    title: '运行',
    name: '运行',
    handler: () => {
      logger.debug(TAG, '运行')
      emits('doExec', localCode.value)
    },
  },
  SAVE: {
    key: 'SAVE',
    icon: 'i-mingcute-save-2-line',
    title: '保存',
    name: '保存',
    handler: () => {
      logger.debug(TAG, '保存')
      emits('doSave', localCode.value)
    },
  },
  FULL: {
    key: 'FULL',
    icon: 'i-mingcute-fullscreen-line',
    title: '全屏',
    name: '全屏',
    handler: () => {
      logger.debug(TAG, '全屏')
      fullWrapRef.value?.toggle()
    },
  },
  EXT_FULL: {
    key: 'EXT_FULL',
    icon: 'i-mingcute-fullscreen-exit-line',
    title: '退出全屏',
    name: '退出全屏',
    handler: () => {
      logger.debug(TAG, '取消全屏')
      fullWrapRef.value?.toggle()
    },
  },
}

const editorTools = computed(() => {
  const tools: ToolConfig[] = []
  props.tools?.forEach((item) => {
    const config = toolsConfigMap[item]
    if (config) {
      if (item === 'FULL') { // 全屏按钮 切换
        const activeCode = isEditorFull.value ? 'EXT_FULL' : 'FULL'
        const activeConfig = toolsConfigMap[activeCode]!
        tools.push({
          ...config,
          icon: activeConfig.icon,
          title: props.toolTitleMap[activeCode] || activeConfig.title,
          name: props.toolNameMap[activeCode] || activeConfig.name,
        })
      }
      else {
        tools.push({
          ...config,
          title: props.toolTitleMap[item] || config.title,
          name: props.toolNameMap[item] || config.name,
        })
      }
    }
  })
  return tools
})

async function handleFormat() {
  logger.debug(TAG, '格式化')
  if (!localCode.value) {
    return
  }
  localCode.value = await formatCode(localCode.value, props.lang, (_err) => {
    showToast('格式化失败', 'error')
  })
}

watch([() => props.lang, () => props.sqlMeta], () => {
  logger.debug(TAG, 'Watch')
  extensions.value = getLangExtensions(props.lang)
}, {
  immediate: false,
})

onMounted(async () => {
  logger.debug(TAG, 'Mounted')
  extensions.value = getLangExtensions(props.lang)
  props.initFmt && handleFormat()
})
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
      <div v-if="props.tools?.length > 0 || $slots['tools-prefix'] || $slots['tools-suffix']" class="tools-header" :class="toolsClass">
        <slot name="tools-prefix" />
        <template v-for="(item) in editorTools" :key="item.key">
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
          :style="{
            height: '100%',
          }"
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

  &.floating {
    position: absolute;
    z-index: 2;
    right: var(--ets-tools-float-right, 5px);
    top: var(--ets-tools-float-bottom, 5px);
    background: transparent;
    border-bottom: none;
  }

  .tool-item {
    padding: 4px 4px;
    box-sizing: border-box;
    display: flex;
    align-items: center;
    box-sizing: border-box;
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

.floating + .editor-body {
  height: 100% !important;
}
</style>
