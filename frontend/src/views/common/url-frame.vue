<!--
 * @Author: Chuang
 * @Date: 2025-05-23 18:00:02
 * @LastEditTime: 2026-05-26 13:34:29
 * @LastEditors: Chuang
 * @Description: iframe 公共页面
-->
<script setup lang="ts">
import { Refresh } from '@element-plus/icons-vue'
import { s2o } from '@/utils'

interface IStates {
  titleAry?: string[]
  url?: string
  showRefresh?: boolean
  ts: number
}

interface UrlFrameInfo {
  titleAry?: string[]
  url?: string
  showRefresh?: boolean
}

const URL_FRAME_ALLOW_ORIGINS: string[] = []

const states = reactive<IStates>({
  showRefresh: true,
  ts: Date.now(),
})

function addTimestampParam(url: string, ts: number) {
  const hashIndex = url.indexOf('#')
  const baseUrl = hashIndex === -1 ? url : url.slice(0, hashIndex)
  const hashUrl = hashIndex === -1 ? '' : url.slice(hashIndex)
  const separator = baseUrl.includes('?') ? '&' : '?'
  return `${baseUrl}${separator}ts=${ts}${hashUrl}`
}

const currentUrl = computed(() => {
  return states.url ? addTimestampParam(states.url, states.ts) : undefined
})

function handleRefresh() {
  states.ts = Date.now()
}

function isAllowedFrameUrl(url: string): boolean {
  try {
    const targetUrl = new URL(url, window.location.origin)
    return targetUrl.origin === window.location.origin || URL_FRAME_ALLOW_ORIGINS.includes(targetUrl.origin)
  }
  catch {
    return false
  }
}

const route = useRoute()
function setFrameInfo(infoStr?: string | null) {
  states.url = undefined
  states.titleAry = undefined
  states.showRefresh = false

  if (!infoStr)
    return

  const info = s2o(infoStr) as UrlFrameInfo | null
  if (!info || !info.url)
    return
  if (!isAllowedFrameUrl(info.url))
    return

  states.url = info.url
  states.showRefresh = info.showRefresh ?? true
  states.titleAry = info.titleAry
  states.ts = Date.now()
}

watch(
  () => route.query.info,
  (info) => {
    if (Array.isArray(info)) {
      setFrameInfo(info[0])
      return
    }

    setFrameInfo(info)
  },
  { immediate: true },
)
</script>

<template>
  <PageCard :title-ary="states.titleAry" :scroll-content="false" :provide-scope="false">
    <template #extra>
      <el-button
        v-if="states.showRefresh"
        :icon="Refresh"
        type="primary"
        circle
        @click="handleRefresh"
      />
    </template>

    <iframe
      v-if="currentUrl"
      :src="currentUrl"
      :title="states.titleAry?.join('-') || '嵌入页面'"
      width="100%"
      height="100%"
      frameborder="0"
      sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
      referrerpolicy="strict-origin-when-cross-origin"
    />
    <div v-else class="full flex-center">
      获取配置失败
    </div>
  </PageCard>
</template>

<style lang="scss" scoped>
.hello {
}
</style>
