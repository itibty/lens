<!--
 * @Author: Chuang
 * @Date: 2021-09-29 15:35:22
 * @LastEditTime: 2025-11-17 17:34:45
 * @LastEditors: Chuang
 * @Description: Dialog 封装，统一样式，提升易用性
-->
<script lang="ts" setup>
export interface CustomDialogProps {
  visible?: boolean // 是否显示
  title?: string // 弹窗标题
  size?: 'big' | 'small' | 'mini' | '' // 宽度预设
  width?: string // 指定宽度
  cancelText?: string // 取消按钮文本
  confirmText?: string // 确认按钮文本
  handlerCancel?: () => void // 取消按钮回调（不设置不展示取消按钮）
  handlerConfirm?: () => void // 确认按钮回调（不设置不展示确认按钮）
  isCustomFooter?: boolean // 是否通过slot自定义弹窗底
  showFooter?: boolean // 是否展示弹窗底
  showClose?: boolean // 是否展示关闭按钮
  confirmLoading?: boolean // "确认" 按钮是否loading中

  // --不常用配置，具体参考官方文档--
  modal?: boolean
  center?: boolean
  draggable?: boolean
  fullscreen?: boolean
  appendToBody?: boolean
  appendTo?: string // 配合 nextTick() 初始化此组件可避免 Teleport 问题
  lockScroll?: boolean
  closeOnClickModal?: boolean
  closeOnPressEscape?: boolean
  destroyOnClose?: boolean
}

// 声明Props,并设置默认值
const props = withDefaults(defineProps<CustomDialogProps>(), {
  visible: false,
  title: '',
  size: 'small',
  cancelText: '取消',
  confirmText: '确定',
  isCustomFooter: false,
  showFooter: true,
  showClose: true,
  confirmLoading: false,

  // -- 不常用配置 --
  modal: true,
  center: false,
  draggable: true,
  fullscreen: false,
  appendToBody: false,
  lockScroll: true,
  closeOnClickModal: true,
  closeOnPressEscape: true,
  destroyOnClose: false,
})

// 声明事件及类型
const emits = defineEmits<{
  (e: 'update:visible', modelValue: boolean): void
  (e: 'open'): void
  (e: 'opened'): void
  (e: 'close'): void
  (e: 'closed'): void
}>()

const relVisible = computed({
  get: () => props.visible,
  set: (val) => {
    emits('update:visible', val)
  },
})

// 计算变量
const realWidth = computed(() => {
  if (props.size === 'mini')
    return '600px'
  else if (props.size === 'small')
    return '800px'
  else if (props.size === 'big')
    return '980px'
  else return props.width || '880px'
})

// 处理取消点击
function onHandlerCancel() {
  props.handlerCancel && props.handlerCancel()
}

// 处理确认点击
function onHandlerConfirm() {
  props.handlerConfirm && props.handlerConfirm()
}
</script>

<template>
  <el-dialog
    v-model="relVisible"
    class="custom-dialog"
    :class="{ fullscreen }"
    :modal="modal"
    :fullscreen="fullscreen"
    :lock-scroll="lockScroll"
    :width="realWidth"
    :append-to-body="appendToBody"
    :append-to="appendTo"
    :close-on-click-modal="closeOnClickModal"
    :close-on-press-escape="closeOnPressEscape"
    :center="center"
    :show-close="showClose"
    :draggable="draggable"
    :destroy-on-close="destroyOnClose"
    @open="emits('open')"
    @opened="emits('opened')"
    @close="emits('close')"
    @closed="emits('closed')"
  >
    <template #header>
      <slot name="custom-dialog-title">
        <el-row class="title">
          <el-col :span="24">
            <span>{{ title }}</span>
          </el-col>
        </el-row>
      </slot>
    </template>
    <slot name="custom-dialog-body" />

    <template v-if="showFooter" #footer>
      <el-row>
        <el-col v-if="!isCustomFooter" :span="24">
          <el-button v-show="handlerCancel" @click="onHandlerCancel">
            {{ cancelText }}
          </el-button>
          <el-button
            v-show="handlerConfirm"
            type="primary"
            :loading="confirmLoading"
            @click="onHandlerConfirm"
          >
            {{ confirmText }}
          </el-button>
        </el-col>
        <el-col v-else :span="24">
          <slot name="custom-dialog-footer" />
        </el-col>
      </el-row>
    </template>
  </el-dialog>
</template>

<style lang="scss">
.custom-dialog {
  display: flex;
  flex-direction: column;
  max-height: calc(100vh - var(--el-dialog-margin-top, 15vh) - 50px);
  padding: 0 !important;
  overflow: hidden;
  &.fullscreen {
    .el-dialog__footer {
      position: fixed;
      right: 0;
      bottom: 0;
      left: 0;
    }
  }
  .title {
    color: var(--el-text-color-regular);
    font-size: 16px;
    line-height: 1;
    font-weight: 700;
  }

  .el-dialog__header {
    flex-shrink: 0;
    margin-right: 0;
    padding: var(--dialog-header-padding, var(--el-dialog-padding-primary));
    border-bottom: 1px solid var(--el-border-color-lighter);
    background-color: var(--el-dialog-header-bg, #fff);
  }
  .el-dialog__body {
    flex: 1 1 auto;
    min-height: 0;
    max-height: var(--dialog-body-max-height, none);
    padding: var(--dialog-body-padding, var(--el-dialog-padding-primary));
    overflow: auto;
  }

  .el-dialog__footer {
    flex-shrink: 0;
    padding: 10px var(--dialog-footer-padding, var(--el-dialog-padding-primary));
    border-top: 1px solid var(--el-border-color-lighter);
  }
}
</style>
