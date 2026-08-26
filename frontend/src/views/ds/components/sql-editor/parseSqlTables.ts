/*
 * 从 SQL 文本中轻量解析 FROM / JOIN 表与别名
 */
import { ENJOY_STRIP_PATTERNS } from './enjoyVocab'

export interface SqlTableRef {
  /** 原始表名（不含 schema） */
  table: string
  /** schema（可选） */
  schema?: string
  /** 别名；无别名时等于 table */
  alias: string
}

const SQL_KEYWORDS = new Set([
  'on',
  'where',
  'join',
  'inner',
  'left',
  'right',
  'full',
  'cross',
  'outer',
  'and',
  'or',
  'group',
  'order',
  'limit',
  'having',
  'union',
  'set',
  'into',
  'values',
  'select',
  'from',
  'as',
  'using',
  'when',
  'then',
  'else',
  'end',
  'by',
  'with',
])

/** 用等长空格抹掉 Enjoy/注释，保偏移，方便后续正则认 FROM/JOIN */
export function stripEnjoyDirectives(sql: string): string {
  let result = sql
  for (const pattern of ENJOY_STRIP_PATTERNS) {
    result = result.replace(pattern, m => ' '.repeat(m.length))
  }
  result = result.replace(/\/\*[\s\S]*?\*\//g, m => ' '.repeat(m.length))
  result = result.replace(/--[^\n]*/g, m => ' '.repeat(m.length))
  return result
}

/**
 * 抽取 FROM / JOIN 后的表引用。
 * 支持: schema.table [AS] alias | table [AS] alias
 */
export function parseSqlTableRefs(sql: string): SqlTableRef[] {
  const cleaned = stripEnjoyDirectives(sql)
  const refs: SqlTableRef[] = []
  const seen = new Set<string>()

  // FROM/JOIN 后可跟 schema.table 或 `table`，再可选 AS alias / alias
  const re = /\b(?:from|join)\s+(?:(\w+)\.)?[`"]?(\w+)[`"]?(?:\s+(?:as\s+)?[`"]?(\w+)[`"]?)?/gi
  for (const match of cleaned.matchAll(re)) {
    const schema = match[1]
    const table = match[2]
    const rawAlias = match[3]
    if (!table)
      continue

    const alias = rawAlias && !SQL_KEYWORDS.has(rawAlias.toLowerCase())
      ? rawAlias
      : undefined

    const resolvedAlias = alias || table
    const key = `${schema || ''}.${table}.${resolvedAlias}`.toLowerCase()
    if (seen.has(key))
      continue
    seen.add(key)

    refs.push({
      table,
      schema,
      alias: resolvedAlias,
    })
  }

  return refs
}

/** 光标前是否处于 FROM/JOIN 关键字后的「表名」位置 */
export function isAfterFromOrJoin(textBeforeCursor: string): boolean {
  // 取最近的一段，避开括号内复杂表达式的误判场景时仍可接受
  const snippet = textBeforeCursor.slice(-80)
  return /\b(?:from|join)\s+[\w.]*$/i.test(snippet)
}

/** 解析 `alias.` / `table.` 触发字段补全时的前缀 */
export function getQualifiedPrefix(textBeforeCursor: string): { qualifier: string, fieldPrefix: string } | null {
  const m = textBeforeCursor.match(/(?:^|[\s(=<>!+\-/*])(\w+)\.(\w*)$/)
  if (!m)
    return null
  return {
    qualifier: m[1]!,
    fieldPrefix: m[2] ?? '',
  }
}
