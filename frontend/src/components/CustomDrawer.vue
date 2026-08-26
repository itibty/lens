<!--
 * @Author: Chuang
 * @Date: 2021-09-29 15:35:22
 * @LastEditTime: 2025-07-23 21:47:21
 * @LastEditors: Chuang
 * @Description: Drawer 封装，统一样式，提升易用性
-->
<script lang="ts" setup>
export interface CustomDrawerProps {
  visible?: boolean // 是否显示
  direction?: 'ltr' | 'rtl' | 'ttb' | 'btt' // 打开方向
  withHeader?: boolean // 是否显示header
  title?: string // 弹窗标题
  size?: 'big' | 'small' | 'mini' | '' // 宽度预设
  sizeNum?: string | number // 指定宽度  百分比字符串或 数值(表示像素)
  cancelText?: string // 取消按钮文本
  confirmText?: string // 确认按钮文本
  handlerCancel?: () => void // 取消按钮回调（不设置不展示取消按钮）
  handlerConfirm?: () => void // 确认按钮回调（不设置不展示确认按钮）
  isCustomFooter?: boolean // 是否通过slot自定义弹窗底
  showFooter?: boolean // 是否展示弹窗底
  showClose?: boolean // 是否展示关闭按钮
  confirmLoading?: boolean // "确认" 按钮是否loading中

  // -- 不常用配置，具体参考官方文档--
  modal?: boolean
  appendToBody?: boolean
  appendTo?: string // 配合 nextTick() 初始化此组件可避免 Teleport 问题
  lockScroll?: boolean
  closeOnClickModal?: boolean
  closeOnPressEscape?: boolean
  destroyOnClose?: boolean
  openDelay?: number
  closeDelay?: number

  // --样式定制--
  headerBorder?: boolean
  /** 收紧标题栏内边距 / 字号；默认保持现有间距 */
  headerCompact?: boolean
  footerBorder?: boolean
  footerAlign?: 'left' | 'center' | 'right'
}

// 声明Props,并设置默认值
const props = withDefaults(defineProps<CustomDrawerProps>(), {
  visible: false,
  direction: 'rtl',
  withHeader: true,
  title: '',
  size: 'small',
  cancelText: '取消',
  confirmText: '确定',
  isCustomFooter: false,
  showFooter: true,
  showClose: true,
  confirmLoading: false,

  modal: true,
  appendToBody: false,
  lockScroll: true,
  closeOnClickModal: true,
  closeOnPressEscape: true,
  destroyOnClose: false,
  openDelay: 0,
  closeDelay: 0,

  headerBorder: false,
  headerCompact: false,
  footerBorder: true,
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

const customClass = computed(() => {
  const classAry = ['custom-drawer']
  if (props.headerBorder)
    classAry.push('header-border')
  if (props.headerCompact)
    classAry.push('header-compact')

  if (props.footerBorder)
    classAry.push('footer-border')

  if (props.footerAlign === 'left')
    classAry.push('footer-text-left')
  else if (props.footerAlign === 'center')
    classAry.push('footer-text-center')

  return classAry
})

// 计算变量
const realSize = computed(() => {
  if (props.sizeNum)
    return props.sizeNum

  if (props.size === 'mini')
    return '20%'
  else if (props.size === 'small')
    return '28%'
  else if (props.size === 'big')
    return '60%'
  else
    return 440
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
  <el-drawer
    v-model="relVisible" :class="customClass" :size="realSize" :direction="direction" :with-header="withHeader"
    :modal="modal" :lock-scroll="lockScroll" :append-to-body="appendToBody" :close-on-click-modal="closeOnClickModal"
    :close-on-press-escape="closeOnPressEscape" :open-delay="openDelay" :close-delay="closeDelay"
    :destroy-on-close="destroyOnClose" :show-close="showClose"
    :append-to="appendTo"
    @open="emits('open')"
    @opened="emits('opened')"
    @close="emits('close')"
    @closed="emits('closed')"
  >
    <template #header>
      <slot name="custom-drawer-title">
        <el-row class="title">
          <el-col :span="24">
            <span>{{ title }}</span>
          </el-col>
        </el-row>
      </slot>
    </template>
    <slot name="custom-drawer-body" />
    <template v-if="showFooter" #footer>
      <template v-if="!isCustomFooter">
        <el-button v-show="handlerCancel" @click="onHandlerCancel">
          {{ cancelText }}
        </el-button>
        <el-button v-show="handlerConfirm" type="primary" :loading="confirmLoading" @click="onHandlerConfirm">
          {{ confirmText }}
        </el-button>
      </template>
      <template v-else>
        <slot name="custom-drawer-footer" />
      </template>
    </template>
  </el-drawer>
</template>

<style lang="scss">
.custom-drawer {
  box-sizing: border-box;

  &.header-border {
    .el-drawer__header {
      border-bottom: 1px solid var(--el-border-color-lighter);
    }
  }

  &.header-compact {
    .el-drawer__header {
      padding: 8px 12px;
    }

    .title {
      font-size: 14px;
    }
  }

  &.no-shadow {
    box-shadow: none !important;
    .el-drawer__header {
      border-top: 1px solid var(--el-border-color-lighter);
    }
  }

  &.footer-border {
    .el-drawer__footer {
      border-top: 1px solid var(--el-border-color-lighter);
    }
  }

  &.footer-text-left {
    .el-drawer__footer {
      text-align: left;
    }
  }

  &.footer-text-center {
    .el-drawer__footer {
      text-align: center;
    }
  }

  .title {
    font-size: 18px;
    line-height: 1;
    color: var(--el-text-color-regular);
  }

  .el-drawer__header {
    margin-bottom: 0;
    padding: var(--el-drawer-padding-primary);
    background-color: var(--el-drawer-header-bg, #fff);
  }

  .el-drawer__body {
    // padding-top: 0;
    // padding-bottom: 0;
    padding: 0;
  }

  .el-drawer__footer {
    padding: 10px;
  }
}
</style>
