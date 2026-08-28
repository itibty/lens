/*
 * @Author: Chuang
 * @Date: 2023-10-27 18:40:51
 * @LastEditTime: 2025-06-20 17:34:12
 * @LastEditors: Chuang
 * @Description: unocss 配置
 *               中文文档：https://unocss.jiangruyi.com/
 */
import { createRequire } from 'node:module'
import {
  defineConfig,
  presetIcons,
  presetWind3,
} from 'unocss'
import { MENU_ICON_SAFELIST } from './src/core/menuIcons'

const require = createRequire(import.meta.url)

function iconifyCollection(name: string) {
  return () => require(`@iconify-json/${name}/icons.json`)
}

export default defineConfig({
  safelist: MENU_ICON_SAFELIST,
  shortcuts: [
    // 自定样式组合
    ['flex-xy', 'flex items-center justify-center flex-wrap'],
    ['flex-center', 'flex items-center justify-center'],
    ['ellipsis', 'text-ellipsis text-nowrap overflow-hidden'],
    ['base-m-t', 'mt-16px'],
    ['base-m-b', 'mb-16px'],
    ['base-m-tb', 'mt-16px mb-16px'],
    ['full', 'w-full h-full'],
  ],
  rules: [
    // 扩充自定义规则
    [/^leh-(\d+)px$/, ([, d]) => ({ 'line-height': `${d}px` })], // eg: leh-20px
    [
      /^mlr-(\d+)px$/,
      ([, d]) => ({ 'margin-left': `${d}px`, 'margin-right': `${d}px` }),
    ], // eg: mlr-20px
    [
      /^mtb-(\d+)px$/,
      ([, d]) => ({ 'margin-top': `${d}px`, 'margin-bottom': `${d}px` }),
    ], // eg: mtb-20px
    [
      /^plr-(\d+)px$/,
      ([, d]) => ({
        'padding-left': `${d}px`,
        'padding-right': `${d}px`,
      }),
    ], // eg: plr-20px
    [
      /^ptb-(\d+)px$/,
      ([, d]) => ({
        'padding-top': `${d}px`,
        'padding-bottom': `${d}px`,
      }),
    ], // eg: ptb-20px
  ],
  theme: {
    colors: {
      // ...
    },
  },
  presets: [
    presetWind3(), //  Tailwind CSS v3 / Windi CSS compact preset
    presetIcons({
      // Vite / Node 22 下默认 node-loader 经常解析不到 @iconify-json，class 图标会空着
      collections: {
        'mingcute': iconifyCollection('mingcute'),
        'ep': iconifyCollection('ep'),
        'tabler': iconifyCollection('tabler'),
        'ix': iconifyCollection('ix'),
        'ant-design': iconifyCollection('ant-design'),
        'svg-spinners': iconifyCollection('svg-spinners'),
      },
      extraProperties: {
        'display': 'inline-block',
        'vertical-align': 'middle',
        'width': '1em',
        'height': '1em',
      },
    }),
    // presetAttributify(), // 预设启用 Attributify使用模式（语法增强）， 但可能和组件属性冲突

    // 向原始 HTML添加排版默认设置，暂未使用
    // presetTypography(),

    // 使用web字体，暂且使用
    // presetWebFonts({
    //   fonts: {},
    // }),
  ],

  // 变体：语法增强
  // transformers: [transformerDirectives(), transformerVariantGroup()],
})
