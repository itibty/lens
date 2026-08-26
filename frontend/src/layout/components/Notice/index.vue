<!--
 * @Author: Chuang
 * @Date: 2022-12-12 13:26:13
 * @LastEditTime: 2025-06-04 23:01:14
 * @LastEditors: Chuang
 * @Description: 通知图标
-->
<script setup lang="ts" name="LayoutNotice">
interface NoticeItem {
  id: string
  content: ''
}

const states = reactive<{
  noticeList: NoticeItem[]
  loading: boolean
  count: number
}>({
  noticeList: [],
  loading: false,
  count: 0,
})
let refreshTimer: ReturnType<typeof setTimeout> | undefined

function refreshList() {
  if (refreshTimer)
    clearTimeout(refreshTimer)

  states.loading = true
  refreshTimer = setTimeout(() => {
    states.loading = false
    refreshTimer = undefined
  }, 500)
}

onUnmounted(() => {
  if (refreshTimer)
    clearTimeout(refreshTimer)
})
</script>

<template>
  <el-popover :width="260" popper-class="!p-0" @show="refreshList">
    <template #reference>
      <div class="clickable h-100% flex-xy">
        <el-icon class="text-20px">
          <i-mingcute-notification-fill />
        </el-icon>
        <el-badge
          type="primary"
          :value="states.count"
          :max="99"
          :hidden="states.count === 0"
        />
      </div>
    </template>
    <template #default>
      <div class="notice-panel">
        <div v-spinner="states.loading" class="pb-30px pt-30px">
          <el-empty>
            <template #image>
              <el-icon class="text-60px">
                <i-mingcute-message-1-line />
              </el-icon>
            </template>
            <template #description>
              <span class="text-12px color-#999">暂无未读消息</span>
            </template>
          </el-empty>
        </div>
        <div class="clickable base-shadow-top mt-2px h-40px flex-xy">
          <el-link underline="never" type="primary">
            查看所有消息
          </el-link>
        </div>
      </div>
    </template>
  </el-popover>
</template>

<style lang="scss" scoped></style>
