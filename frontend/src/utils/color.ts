/*
 * @Author: Chuang
 * @Date: 2025-07-28 14:23:33
 * @LastEditTime: 2026-03-20 11:41:11
 * @LastEditors: Chuang
 * @Description:
 */
export function hexToRgb(str: string): number[] {
  str = str.replace('#', '')
  const hxs = str.match(/../g)
  if (!hxs || hxs.length < 3) {
    return [0, 0, 0]
  }
  return [
    Number.parseInt(hxs[0], 16),
    Number.parseInt(hxs[1], 16),
    Number.parseInt(hxs[2], 16),
  ]
}
export function rgbToHex(a: number, b: number, c: number) {
  const hexs = [a.toString(16), b.toString(16), c.toString(16)]
  for (let i = 0; i < 3; i++) {
    if (hexs[i]!.length === 1)
      hexs[i] = `0${hexs[i]}`
  }

  return `#${hexs.join('')}`
}

/**
 * 颜色加深
 * @param color hex颜色
 * @param level (0,1)
 * @returns
 */
export function darken(color: string, level: number) {
  const rgbc = hexToRgb(color)
  for (let i = 0; i < 3; i++) rgbc[i] = Math.floor(rgbc[i] * (1 - level))
  return rgbToHex(rgbc[0], rgbc[1], rgbc[2])
}

/**
 * 颜色变淡
 * @param color hex颜色
 * @param level (0,1)
 * @returns
 */
export function lighten(color: string, level: number) {
  const rgbc = hexToRgb(color)
  for (let i = 0; i < 3; i++)
    rgbc[i] = Math.floor((255 - rgbc[i]) * level + rgbc[i])
  return rgbToHex(rgbc[0], rgbc[1], rgbc[2])
}
