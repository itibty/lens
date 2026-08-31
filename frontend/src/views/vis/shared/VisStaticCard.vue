<!--
 * @Description: 纯前端卡片预览（文本模块栈 / 套用网页）
-->
<script setup lang="ts">
import type { VisVisualConfig } from './types'
import { sanitizeRichText } from './sanitizeRichText'
import { hasStaticContent, resolveStaticUrl } from './staticCard'
import {
  resolveCalloutTone,
  resolveStaticModules,
  staticProgressView,
  staticProgressVisual,
} from './staticModules'
import VisProgressCard from './VisProgressCard.vue'
import VisStaticCallout from './VisStaticCallout.vue'
import VisStaticStat from './VisStaticStat.vue'

const props = defineProps<{
  visual: VisVisualConfig
  emptyText?: string
}>()

const isHtml = computed(() => props.visual.chartType === 'richtext')
const ready = computed(() => hasStaticContent(props.visual.chartType, props.visual))
const pageUrl = computed(() => resolveStaticUrl(props.visual))
const stack = computed(() => resolveStaticModules(props.visual).map((mod, index) => {
  if (mod.type === 'progress') {
    const progressVisual = staticProgressVisual(props.visual, !!mod.label?.trim())
    return {
      key: mod._uid || `progress-${index}`,
      kind: 'progress' as const,
      progressVisual,
      progressView: staticProgressView(mod, progressVisual),
    }
  }
  if (mod.type === 'stat') {
    return {
      key: mod._uid || `stat-${index}`,
      kind: 'stat' as const,
      items: [mod],
    }
  }
  if (mod.type === 'stats') {
    return {
      key: mod._uid || `stats-${index}`,
      kind: 'stats' as const,
      items: mod.items,
    }
  }
  if (mod.type === 'callout') {
    return {
      key: mod._uid || `callout-${index}`,
      kind: 'callout' as const,
      tone: resolveCalloutTone(mod.tone),
      title: mod.title,
      text: mod.text,
    }
  }
  const rawHtml = mod.html ?? ''
  return {
    key: mod._uid || `richtext-${index}`,
    kind: 'richtext' as const,
    html: sanitizeRichText(rawHtml),
    fullDoc: /<html[\s>]/i.test(rawHtml),
  }
}))

function srcdocOf(html: string) {
  if (/<html[\s>]/i.test(html))
    return html
  return `<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;padding:8px;box-sizing:border-box;font:13px/1.55 system-ui,sans-serif;color:#303133;}</style></head><body>${html}</body></html>`
}
</script>

<template>
  <div class="vis-static-card">
    <el-empty
      v-if="!ready"
      :description="emptyText || (isHtml ? '请输入正文' : '请输入网页地址')"
      :image-size="64"
    />
    <div
      v-else-if="isHtml"
      class="vis-static-card__stack"
    >
      <template
        v-for="item in stack"
        :key="item.key"
      >
        <iframe
          v-if="item.kind === 'richtext' && item.fullDoc"
          class="vis-static-card__doc"
          :srcdoc="srcdocOf(item.html)"
          sandbox=""
          title="富文本预览"
        />
        <div
          v-else-if="item.kind === 'richtext' && item.html"
          class="vis-static-card__html"
          v-html="item.html"
        />
        <div
          v-else-if="item.kind === 'stat' || item.kind === 'stats'"
          class="vis-static-card__stat"
        >
          <VisStaticStat :items="item.items" />
        </div>
        <div
          v-else-if="item.kind === 'progress'"
          class="vis-static-card__progress"
        >
          <VisProgressCard
            :visual="item.progressVisual"
            :view="item.progressView"
          />
        </div>
        <VisStaticCallout
          v-else-if="item.kind === 'callout'"
          :tone="item.tone"
          :title="item.title"
          :text="item.text"
        />
      </template>
    </div>
    <iframe
      v-else
      class="vis-static-card__frame"
      :src="pageUrl"
      title="网页预览"
      sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-popups-to-escape-sandbox"
      referrerpolicy="no-referrer-when-downgrade"
    />
  </div>
</template>

<style scoped lang="scss">
.vis-static-card {
  width: 100%;
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;

  &__stack {
    flex: 1 1 0;
    min-height: 0;
    overflow: auto;
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 8px;
    box-sizing: border-box;
  }

  &__html {
    min-width: 0;
    font:
      13px / 1.55 system-ui,
      sans-serif;
    color: var(--vis-content-color, #303133);

    :deep(ul) {
      margin: 0 0 0 1.25em;
      padding: 0;
      list-style: disc;
    }

    :deep(a) {
      color: var(--el-color-primary);
    }

    :deep(p) {
      margin: 0 0 0.6em;

      &:last-child {
        margin-bottom: 0;
      }
    }
  }

  &__stat,
  &__progress {
    flex-shrink: 0;
    min-width: 0;
    padding: 2px 0;
  }

  &__doc,
  &__frame {
    flex: 1 1 0;
    width: 100%;
    min-height: 160px;
    border: 0;
    background: transparent;
  }

  &__frame {
    min-height: 0;
  }
}
</style>
