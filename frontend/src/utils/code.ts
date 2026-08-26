/*
 * @Author: Chuang
 * @Date: 2025-04-30 21:51:28
 * @LastEditTime: 2025-07-02 14:02:15
 * @LastEditors: Chuang
 * @Description:
 */

import { format } from 'sql-formatter' // prettier-plugin-sql 底层也是此插件
import { createLogger } from '@/utils/logger'
import { isBlank } from './validate'

const logger = createLogger('CODE')

export type FormatLang = 'sql' | 'json' | 'js'

export function formatSql(code: string, fail?: (error: any) => void) {
  try {
    const fmtCode = format(code, {
      language: 'sql', // 有更多dialect，默认是sql
      tabWidth: 2,
    })
    return fmtCode
  }
  catch (error) {
    logger.error('sql格式化失败', error)
    fail && fail(error)
    return code
  }
}

export function formatJson(code: string, fail?: (error: any) => void) {
  if (isBlank(code)) {
    return ''
  }
  try {
    const json = JSON.parse(code)
    return JSON.stringify(json, null, 2)
  }
  catch (error) {
    logger.error('json格式化失败', error)
    fail && fail(error)
    return code
  }
}

export async function formatJs(code: string, _fail?: (error: any) => void) {
  return code
}

// 代码格式化
export async function formatCode(code: string, lang: FormatLang, fail?: (error: any) => void) {
  switch (lang) {
    case 'js':
      return await formatJs(code, fail)
    case 'json':
      return formatJson(code, fail)
    case 'sql':
      return formatSql(code, fail)
    default:
      return code
  }
}
