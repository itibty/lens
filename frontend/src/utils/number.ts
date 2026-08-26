/*
 * @Author: Chuang
 * @Date: 2023-12-04 14:00:33
 * @LastEditTime: 2025-07-29 17:57:40
 * @LastEditors: Chuang
 * @Description: 数值计算
 */
import Big from 'big.js'
import { createLogger } from '@/utils/logger'

const logger = createLogger('NUMBER')

// 数学精确计算
export function eq(s: number, t: number): boolean {
  return Big(s).eq(Big(t))
}
export function gt(s: number, t: number): boolean {
  return Big(s).gt(Big(t))
}
export function gte(s: number, t: number): boolean {
  return Big(s).gte(Big(t))
}
export function lt(s: number, t: number): boolean {
  return Big(s).lt(Big(t))
}
export function lte(s: number, t: number): boolean {
  return Big(s).lte(Big(t))
}
export function add(s: number, v: number): number {
  return Big(s).plus(Big(v)).toNumber()
}
export function subtract(s: number, v: number): number {
  return Big(s).minus(Big(v)).toNumber()
}
export function divide(s: number, v: number): number {
  if (v === 0) {
    logger.error('Division by zero')
    return 0
  }
  return Big(s).div(Big(v)).toNumber()
}
export function multiply(s: number, v: number): number {
  return Big(s).times(Big(v)).toNumber()
}
