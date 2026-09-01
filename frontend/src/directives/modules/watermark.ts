/*
 * @Author: Chuang
 * @Date: 2023-01-09 09:53:35
 * @LastEditTime: 2025-04-15 22:32:08
 * @LastEditors: Chuang
 * @Description: v-watermark，dom加水印 v-watermark = "{text:'1', subText:'2',font:'宋体',textColor: 'red'}"
 */
import type { App, DirectiveBinding } from 'vue'
import { UIConfig } from '@/core/config'
import { FONT_SANS } from '@/core/fonts'
import { useAccountStore } from '@/stores/modules/account'

interface WatermarkOptions {
  text?: string
  subText?: string
  font?: string
  textColor?: string
}

interface WatermarkState {
  maskDiv: HTMLDivElement
  signature: string
  originalPosition: string
  changedPosition: boolean
}

const watermarkStateMap = new WeakMap<HTMLElement, WatermarkState>()

function resolveOptions(binding: DirectiveBinding<WatermarkOptions | undefined>): WatermarkOptions {
  if (binding.value !== undefined)
    return binding.value

  const accountStore = useAccountStore()
  return {
    text: accountStore.userInfo.username,
    subText: UIConfig.appTitle,
  }
}

function addWaterMarker(parentNode: HTMLElement, options: WatermarkOptions): void {
  const signature = JSON.stringify(options)
  const oldState = watermarkStateMap.get(parentNode)
  if (oldState?.signature === signature)
    return

  removeWaterMarker(parentNode)

  const can = document.createElement('canvas')
  can.width = 200
  can.height = 200

  const cans: CanvasRenderingContext2D = can.getContext('2d')!
  cans.rotate((-20 * Math.PI) / 180)
  cans.font = options.font || `20px ${FONT_SANS}`
  cans.fillStyle = options.textColor || 'rgba(128, 128, 128, 0.1)'
  cans.textAlign = 'center'
  cans.textBaseline = 'middle'
  cans.fillText(options.text || '', can.width / 3, can.height / 2)
  if (options.subText) {
    cans.font = options.font || `12px ${FONT_SANS}`
    cans.fillText(options.subText, can.width / 3, can.height / 2 + 20)
  }

  const originalPosition = parentNode.style.position
  const changedPosition = !originalPosition
  if (changedPosition)
    parentNode.style.position = 'relative'

  const maskDiv = document.createElement('div')
  maskDiv.setAttribute('class', 'water_mask_div')
  const styleStr = `position:absolute;top:0;left:0;right:0;bottom:0;z-index:3000;pointer-events:none;background-repeat:repeat;background-image:url('${can.toDataURL(
    'image/png',
  )}');`
  maskDiv.setAttribute('style', styleStr)

  parentNode.appendChild(maskDiv)
  watermarkStateMap.set(parentNode, {
    maskDiv,
    signature,
    originalPosition,
    changedPosition,
  })
}

function removeWaterMarker(parentNode: HTMLElement): void {
  const state = watermarkStateMap.get(parentNode)
  if (!state)
    return

  state.maskDiv.remove()
  if (state.changedPosition && parentNode.style.position === 'relative')
    parentNode.style.position = state.originalPosition
  watermarkStateMap.delete(parentNode)
}

function renderWaterMarker(el: HTMLElement, binding: DirectiveBinding<WatermarkOptions | undefined>) {
  if (!UIConfig.showWatermark) {
    removeWaterMarker(el)
    return
  }

  addWaterMarker(el, resolveOptions(binding))
}

export default {
  install(app: App) {
    app.directive('watermark', {
      mounted(el, binding) {
        renderWaterMarker(el, binding)
      },
      updated(el, binding) {
        renderWaterMarker(el, binding)
      },
      beforeUnmount(el) {
        removeWaterMarker(el)
      },
    })
  },
}
