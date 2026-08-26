/*
 * @Author: Chuang
 * @Date: 2023-06-14 15:19:17
 * @LastEditTime: 2024-11-08 11:05:34
 * @LastEditors: Chuang
 * @Description: v-input-filter.trim.space.number.special |  modifiers: { trim: true, space: true, number: true, special: true }
 */
import type { Fn } from '@vueuse/core'
import type { App } from 'vue'
import { useEventListener } from '@vueuse/core'

import { filterSpecialCharacterRule } from '@/utils/validate'

type InputFilterElement = HTMLElement & {
  __inputFilterStops__?: Fn[]
}

/**
 *  实现功能
 *  1、默认情况下只禁止空格输入
 *  2、限制只能输入整数
 *  3、限制只能输入整数和小数（价格类）
 *  4、限制只能输入手机号
 *  5、限制最大值和最小值(抛出错误给回调函数)
 */
function addListener(el: HTMLInputElement, type: string, fn: () => void, stops: Fn[]) {
  stops.push(useEventListener(el, type, fn, false))
}
// 设置输入框的值,触发input事件,改变v-model绑定的值
function setVal(el: HTMLInputElement, val: string) {
  el.value = val
  el.dispatchEvent(new Event('input'))
}

// trim(),过滤粘贴文案的首尾空格
function trimFilter(el: HTMLInputElement, stops: Fn[]) {
  let isPaste = false
  addListener(el, 'paste', () => {
    isPaste = true
  }, stops)
  addListener(el, 'keyup', () => {
    if (isPaste) {
      isPaste = false
      setVal(el, el.value.trim())
    }
  }, stops)
}
// 过滤空格
function spaceFilter(el: HTMLInputElement, stops: Fn[]) {
  addListener(el, 'keyup', () => {
    setVal(el, el.value.replace(/\s+/g, ''))
  }, stops)
}
// 过滤非数字
function intFilter(el: HTMLInputElement, stops: Fn[]) {
  addListener(el, 'keyup', () => {
    setVal(el, el.value.replace(/\D/g, ''))
  }, stops)
}
// 过滤特殊字符
function specialFilter(el: HTMLInputElement, stops: Fn[]) {
  addListener(el, 'keyup', () => {
    setVal(el, el.value.replace(filterSpecialCharacterRule, ''))
  }, stops)
}

export default {
  install(app: App) {
    app.directive('input-filter', {
      mounted(el, binding) {
        // 获取 input 输入框
        const targetEl = el as InputFilterElement
        const input = (el: HTMLElement) => (el instanceof HTMLInputElement ? el : el.querySelector('input'))
        const vm = input(el)
        // modifiers: { trim: true, space: true, number: true, special: true }
        const stops: Fn[] = []
        targetEl.__inputFilterStops__ = stops
        if (vm) {
          binding.modifiers.trim && trimFilter(vm, stops)
          binding.modifiers.space && spaceFilter(vm, stops)
          binding.modifiers.number && intFilter(vm, stops)
          binding.modifiers.special && specialFilter(vm, stops)
        }
      },
      unmounted(el) {
        const targetEl = el as InputFilterElement
        targetEl.__inputFilterStops__?.forEach(stop => stop())
        delete targetEl.__inputFilterStops__
      },
    })
  },
}
