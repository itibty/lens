<script setup lang="ts" name="PageCard">
import type { ScrollbarInstance } from 'element-plus'
import { useResizeObserver } from '@vueuse/core'
import { UIConfig } from '@/core/config'
import { getRouteScrollKey } from '@/router'
import { useKeepPageStore } from '@/stores/modules/keepPage'
import { createLogger } from '@/utils/logger'

export interface PageCardInstance {
  setScrollTop: (top: number) => void // body滚动到顶部制定位置
}

export interface PageCardProps {
  showHeader?: boolean
  title?: string
  titleAry?: string[] // 标题列表(面包屑)
  subTitle?: string
  containerStyle?: string // 页面样式

  hiddenBack?: boolean // 子页面是否隐藏返回按钮
  beforeBack?: Function // 返回按钮回调前调函数，返回false阻止返回
  provideScope?: boolean
  scrollContent?: boolean
  onBodyScroll?: (e: BodyScrollEvent) => void
}

interface BodyScrollEvent {
  scrollTop: number
  scrollLeft: number
}

const props = withDefaults(defineProps<PageCardProps>(), {
  showHeader: true,
  hiddenBack: false,
  containerStyle: '',
  provideScope: true,
  scrollContent: true,
})

const TAG = 'PageCard:'
const logger = createLogger('PAGE_CARD')
const route = useRoute()
const keepPageStore = useKeepPageStore()
const metaInfo = computed(() => {
  return route.matched.at(-1)?.meta || {}
})
const componentName = computed(() => {
  return (route.meta?.componentName || route.name || '') as string
})
const pageTitle = computed<string>(() => {
  return (
    ((props.title
      || metaInfo.value.title
      || metaInfo.value.menuName) as string) || ''
  )
})
const showBack = computed<boolean>(() => {
  return !props.hiddenBack && metaInfo.value.rootMenuId !== undefined && metaInfo.value.rootMenuId !== null
})

const router = useRouter()
function handleBack() {
  if (props.beforeBack && props.beforeBack() === false)
    return
  router.back()
}

const contentDivRef = ref<HTMLElement | null>(null)
const contentHeight = ref<number>(0)
function setDomObserver() {
  useResizeObserver(contentDivRef, (entries) => {
    const entry = entries[0]!
    const { height } = entry.contentRect
    logger.debug(TAG, 'content_h', height)
    contentHeight.value = height
  })
}

const slotInfo = computed(() => {
  if (!props.provideScope) {
    return {}
  }
  return {
    paddingSize: UIConfig.paddingSize,
    height: contentHeight.value, // contentHeight
    heightL1: contentHeight.value - UIConfig.paddingSize * 3 - 32, // 1行搜索框 + 表格
  }
})

const bodyScrollbarRef = ref<ScrollbarInstance>()
function setScrollTop(top: number) {
  if (!props.scrollContent) {
    return
  }
  bodyScrollbarRef.value?.setScrollTop(top)
}

function restoreScrollTop() {
  if (!props.scrollContent || !keepPageStore.pages.includes(componentName.value))
    return

  const scrollTop = keepPageStore.getScrollTop(getRouteScrollKey(route))
  nextTick(() => setScrollTop(scrollTop))
}

function handleBodyScroll(event: BodyScrollEvent) {
  keepPageStore.setScrollTop(getRouteScrollKey(route), event.scrollTop)
  props.onBodyScroll?.(event)
}

onMounted(() => {
  props.provideScope && setDomObserver()
  restoreScrollTop()
})

onActivated(() => {
  restoreScrollTop()
})

defineExpose({
  setScrollTop,
})
</script>

<template>
  <div class="page-card-container" :style="containerStyle">
    <div v-if="showHeader" class="page-header">
      <template v-if="showBack">
        <div
          class="clickable link back flex items-center"
          @click="handleBack()"
        >
          <IEpBack class="mr-5px" /> 返回
        </div>
        <el-divider direction="vertical" />
      </template>
      <slot name="title">
        <div class="title">
          <template v-if="titleAry && titleAry.length > 0">
            <span v-for="(item, index) in titleAry" :key="index">
              <template v-if="index > 0 && titleAry.length > 1"> / </template>
              {{ item }}
            </span>
          </template>
          <template v-else>
            <span>{{ pageTitle }}</span>
          </template>
        </div>
      </slot>
      <slot name="subTitle">
        <div class="sub-title">
          {{ subTitle }}
        </div>
      </slot>
      <div v-if="$slots.extra" id="pch-extra" class="ml-auto">
        <slot name="extra" />
      </div>
    </div>
    <div
      id="pc-content"
      ref="contentDivRef"
      v-watermark
      class="page-content"
    >
      <el-scrollbar v-if="scrollContent" ref="bodyScrollbarRef" view-class="base-padding" @scroll="handleBodyScroll">
        <slot :info="slotInfo" />
      </el-scrollbar>
      <template v-else>
        <slot :info="slotInfo" />
      </template>
    </div>
    <div v-if="$slots.footer" id="pc-footer" class="page-footer">
      <slot name="footer" />
    </div>
  </div>
</template>

<style lang="scss" scoped>
$title-font-size: 16px;
$borderColor: var(--el-border-color-lighter);
.page-card-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-width: 1060px;
  background-color: var(--el-bg-color);

  &.noAutoSeg {
    .page-header {
      border-bottom: none;
    }

    .page-footer {
      border-top: none;
    }
  }
}
.page-header {
  display: flex;
  flex: 0 0 auto;
  flex-wrap: wrap;
  align-items: center;

  height: $page-header-height;
  padding: 0 $base-padding;
  box-sizing: border-box;
  border-bottom: 1px solid $borderColor;
  background-color: var(--el-bg-color);

  .back {
    font-size: 14px;
    line-height: $title-font-size;
  }

  .title {
    color: var(--el-text-color-primary);
    font-size: $title-font-size;
    line-height: $title-font-size;
    font-weight: 400;

    :last-child {
      font-weight: 600;
    }
  }

  .sub-title {
    margin-left: 10px;
    color: var(--el-text-color-regular);
    font-size: 12px;
    line-height: $title-font-size;
  }
}

.page-content {
  flex: 1;
  overflow: hidden;
  box-sizing: border-box;
}

.page-footer {
  flex: 0 0 auto;
  border-top: 1px solid $borderColor;
}
</style>
