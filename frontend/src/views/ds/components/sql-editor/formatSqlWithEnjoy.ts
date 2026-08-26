/*
 * Enjoy SQL 分段格式化：
 * - #if / #for / #else / #elseif / #end 等指令行：只整理缩进，不丢给 sql-formatter
 * - 完整 SQL 语句片段：行内 #para / #(…) 占位后再 sql-formatter
 * - #if 体内的残缺片段（如 and …）：只统一缩进，避免 sql-formatter 弄乱/失败
 */
import { formatSql } from '@/utils/code'

const TAB = '  '
const INLINE_PH = (i: number) => `__ej_${i}__`

const BLOCK_OPEN = /^\s*#(?:if|for)\b/i
const BLOCK_MID = /^\s*#(?:else|elseif)\b/i
const BLOCK_CLOSE = /^\s*#end\b/i
const OTHER_DIR = /^\s*#(?:set|inc)\b/i
const STATEMENT_START = /^\s*(?:with|select|update|insert|delete|replace)\b/i

function isDirectiveLine(line: string): boolean {
  return BLOCK_OPEN.test(line)
    || BLOCK_MID.test(line)
    || BLOCK_CLOSE.test(line)
    || OTHER_DIR.test(line)
}

function looksLikeStatement(sql: string): boolean {
  return STATEMENT_START.test(sql)
}

/** 行内 #para/#(…) 暂换成占位，避免 sql-formatter 拆坏模板片段 */
function protectInlineEnjoy(sql: string): { text: string, tokens: string[] } {
  const tokens: string[] = []
  const push = (m: string) => {
    const id = tokens.length
    tokens.push(m)
    return INLINE_PH(id)
  }

  let text = sql.replace(/#para\s*\([^)]*\)/gi, push)
  text = text.replace(/#\([^)]*\)/g, push)
  return { text, tokens }
}

function restoreInlineEnjoy(sql: string, tokens: string[]): string {
  return sql.replace(/__ej_(\d+)__/g, (_, n: string) => tokens[Number(n)] ?? '')
}

function indentBlock(text: string, depth: number): string {
  if (!text)
    return text
  const pad = TAB.repeat(Math.max(0, depth))
  return text
    .split('\n')
    .map((line) => {
      if (!line.trim())
        return ''
      return pad + line.replace(/^\s+/, '')
    })
    .join('\n')
}

function formatSqlChunk(chunk: string, depth: number): string {
  const trimmed = chunk.replace(/^\n+/, '').replace(/\n+$/, '')
  if (!trimmed.trim())
    return ''

  // 非完整语句（常见于 #if 内的 and/set 片段）：只缩进
  if (!looksLikeStatement(trimmed))
    return indentBlock(trimmed, depth)

  const { text: protectedSql, tokens } = protectInlineEnjoy(trimmed)
  // 片段失败时 formatSql 返回入参且不向外 toast（不传 fail）
  const formatted = formatSql(protectedSql)
  const restored = restoreInlineEnjoy(formatted, tokens)

  // 占位被 formatter 破坏时回退
  if (/__ej_\d+__/.test(restored))
    return indentBlock(trimmed, depth)

  return indentBlock(restored, depth)
}

/**
 * 分段格式化 Enjoy SQL 模板。
 */
export async function formatSqlWithEnjoy(
  code: string,
  _fail?: (error: unknown) => void,
): Promise<string> {
  if (!code)
    return code

  const lines = code.split('\n')
  const out: string[] = []
  let depth = 0
  let sqlBuf: string[] = []

  const flushSql = () => {
    if (sqlBuf.length === 0)
      return
    const chunk = sqlBuf.join('\n')
    sqlBuf = []
    const formatted = formatSqlChunk(chunk, depth)
    if (formatted !== '')
      out.push(formatted)
  }

  for (const line of lines) {
    if (isDirectiveLine(line)) {
      flushSql() // 指令打断 SQL 块，先格式化缓冲
      const content = line.trim()

      if (BLOCK_CLOSE.test(line)) {
        depth = Math.max(0, depth - 1)
        out.push(TAB.repeat(depth) + content)
      }
      else if (BLOCK_MID.test(line)) {
        // else/elseif 与配对 #if 同级，不先 depth++
        out.push(TAB.repeat(Math.max(0, depth - 1)) + content)
      }
      else if (BLOCK_OPEN.test(line)) {
        out.push(TAB.repeat(depth) + content)
        depth += 1
      }
      else {
        // #set / #inc：跟随当前块深度
        out.push(TAB.repeat(depth) + content)
      }
      continue
    }

    sqlBuf.push(line)
  }

  flushSql()
  return out.join('\n').replace(/\n{3,}/g, '\n\n')
}
