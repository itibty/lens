/*
 * @Author: Chuang
 * @Date: 2023-12-04 14:00:33
 * @LastEditTime: 2026-03-20 11:40:59
 * @LastEditors: Chuang
 * @Description: 数据校验
 */

import { createLogger } from '@/utils/logger'

const logger = createLogger('VALIDATE')

/**
 * 8-20位 常用字符（字母、数字、下划线）
 * @param str
 * @returns {boolean}
 */
export function isPassword(str: string) {
  const reg = /^\w{8,20}$/
  return reg.test(str)
}

/**
 * 判断是否为整数
 * @param value
 * @returns {boolean}
 */
export function isInteger(value: string) {
  const reg = /^\d*$/
  return reg.test(value)
}

/**
 *  判断是否是小写字母
 * @param str
 * @returns {boolean}
 */
export function isLowerCase(str: string) {
  const reg = /^[a-z]+$/
  return reg.test(str)
}

/**
 *  判断是否是大写字母
 * @param str
 * @returns {boolean}
 */
export function isUpperCase(str: string) {
  const reg = /^[A-Z]+$/
  return reg.test(str)
}

/**
 *  判断是否是大写字母开头
 * @param str
 * @returns {boolean}
 */
export function isAlphabets(str: string) {
  const reg = /^[A-Z]+$/i
  return reg.test(str)
}

/**
 *  判断是否是字符串
 * @param str
 * @returns {boolean}
 */
export function isString(str: unknown) {
  return typeof str === 'string'
}

/**
 *  判断是否是数组
 * @param arg
 */
export function isArray(arg: unknown): arg is unknown[] {
  if (typeof Array.isArray === 'undefined')
    return Object.prototype.toString.call(arg) === '[object Array]'

  return Array.isArray(arg)
}

export const phonePattern = /^1\d{10}$/

/**
 * 判断是否是手机号
 * @param str
 * @returns {boolean}
 */
export function isPhone(str: string) {
  return phonePattern.test(str)
}

/**
 * 判断是否是邮箱
 * @param str
 * @returns {boolean}
 */
export function isEmail(str: string) {
  const reg = /^\w+(?:[-+.]\w+)*@\w+(?:[-.]\w+)*\.\w+(?:[-.]\w+)*$/
  return reg.test(str)
}

/**
 * 判断是否 是常规字符（数字、字母或下划线）
 * @param str
 * @returns {boolean}
 */
export function isGeneral(str: string) {
  const reg = /^\w*$/
  return reg.test(str)
}

/**
 * 判断是否为数字且最多两位小数
 * @param str
 * @returns {boolean}
 */
export function isNum(str: string) {
  const reg = /^\d+(?:\.\d{1,2})?$/
  return reg.test(str)
}

/**
 * 判断 文件 mime 是否是 excel
 * @param {文件 type} mime
 * @returns
 */
export function isExcel(mime: string) {
  const excelMimeType = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
  ]
  return excelMimeType.includes(mime)
}

/**
 * json字符串是否合规
 * @param {json字符串} str
 * @returns
 */
export function isJsonStr(str: string) {
  try {
    const toObj = JSON.parse(str)
    if (toObj && typeof toObj === 'object')
      return true
  }
  catch (err) {
    logger.error('json 格式错误', err)
  }
  return false
}

/**
 * 判读是否为外链
 * @param path
 * @returns {boolean}
 */
export function isExternal(path: string) {
  return /^(?:https?:|mailto:|tel:)/.test(path)
}

// 过滤：特殊字符（只允许中文a-z'A-Z数字）
export const filterSpecialCharacterRule = /[^\u4E00-\u9FA5'\w]/g

/**
 * 判断是否为空
 * @param str
 * @returns {boolean}
 */
export function isBlank(str: string | null | undefined) {
  return (
    str === null
    || str === undefined
    || str === ''
    || str.trim() === ''
    || str.toLocaleLowerCase().trim() === 'null'
  )
}
