/*
 * 上下文感知的 dbmeta CompletionSource
 */
import type {
  Completion,
  CompletionContext,
  CompletionResult,
  CompletionSource,
} from '@codemirror/autocomplete'
import type { SqlTableRef } from './parseSqlTables'
import { textBeforeCursor } from './cmUtils'
import { COMPLETION_SECTIONS, isEnjoyDirectiveAt, withSection } from './completionSections'
import {
  getQualifiedPrefix,
  isAfterFromOrJoin,
  parseSqlTableRefs,
} from './parseSqlTables'

interface TableMeta {
  schema?: string
  name: string
  comment?: string
  fields: VIS.FieldInfo[]
}

function buildTableIndex(sqlMeta: VIS.SchemaInfo[] | undefined): {
  byName: Map<string, TableMeta>
  all: TableMeta[]
} {
  const byName = new Map<string, TableMeta>()
  const all: TableMeta[] = []

  sqlMeta?.forEach((schema) => {
    schema.tableInfos?.forEach((table) => {
      if (!table.name)
        return
      const meta: TableMeta = {
        schema: schema.name,
        name: table.name,
        comment: table.comment,
        fields: table.fieldInfos ?? [],
      }
      all.push(meta)
      byName.set(table.name.toLowerCase(), meta)
      if (schema.name)
        byName.set(`${schema.name}.${table.name}`.toLowerCase(), meta)
    })
  })

  return { byName, all }
}

function resolveRefsToTables(
  refs: SqlTableRef[],
  byName: Map<string, TableMeta>,
): Map<string, TableMeta> {
  const aliasMap = new Map<string, TableMeta>()
  for (const ref of refs) {
    const key = ref.schema
      ? `${ref.schema}.${ref.table}`.toLowerCase()
      : ref.table.toLowerCase()
    const meta = byName.get(key) || byName.get(ref.table.toLowerCase())
    if (!meta)
      continue
    aliasMap.set(ref.alias.toLowerCase(), meta)
    aliasMap.set(ref.table.toLowerCase(), meta)
  }
  return aliasMap
}

function fieldCompletions(fields: VIS.FieldInfo[], prefix: string): Completion[] {
  const p = prefix.toLowerCase()
  return fields
    .filter(f => f.name && (!p || f.name.toLowerCase().startsWith(p)))
    .map((f) => {
      const pk = f.isPk ? ' [PK]' : ''
      return withSection({
        label: f.name!,
        type: 'property',
        detail: `${f.typeDesc || f.type || ''}${pk}`,
        info: f.comment || undefined,
        boost: f.isPk ? 20 : 10,
      }, COMPLETION_SECTIONS.field)
    })
}

function tableCompletions(tables: TableMeta[], prefix: string): Completion[] {
  const p = prefix.toLowerCase()
  return tables
    .filter(t => !p || t.name.toLowerCase().startsWith(p) || (t.comment?.toLowerCase().includes(p) ?? false))
    .map(t => withSection({
      label: t.name,
      type: 'class',
      detail: t.schema ? `${t.schema}${t.comment ? ` · ${t.comment}` : ''}` : (t.comment || '表'),
      info: t.comment,
      boost: 5,
    }, COMPLETION_SECTIONS.table))
}

/**
 * 优先级：alias./table. 字段 → FROM/JOIN 后表名 → 已出现表的字段（或全局表）
 * Enjoy `#…` 上下文直接让位，避免和模板补全抢
 */
export function createMetaCompletionSource(getSqlMeta: () => VIS.SchemaInfo[] | undefined): CompletionSource {
  return (context: CompletionContext): CompletionResult | null => {
    const { state, pos } = context
    if (isEnjoyDirectiveAt(context))
      return null

    const sqlText = state.doc.toString()
    const textBefore = textBeforeCursor(state, pos)
    const fullBefore = state.doc.sliceString(0, pos)

    const { byName, all } = buildTableIndex(getSqlMeta())
    if (all.length === 0)
      return null

    const refs = parseSqlTableRefs(sqlText)
    const aliasMap = resolveRefsToTables(refs, byName)

    // t. / alias. → 字段
    const qualified = getQualifiedPrefix(textBefore) || getQualifiedPrefix(fullBefore.slice(-120))
    if (qualified) {
      const meta = aliasMap.get(qualified.qualifier.toLowerCase())
        || byName.get(qualified.qualifier.toLowerCase())
      if (!meta)
        return null
      const from = pos - qualified.fieldPrefix.length
      const options = fieldCompletions(meta.fields, qualified.fieldPrefix)
      return options.length ? { from, options, validFor: /^\w*$/ } : null
    }

    const word = context.matchBefore(/\w+/)
    if (!word && !context.explicit)
      return null

    const prefix = word?.text ?? ''
    const from = word ? word.from : pos

    // FROM/JOIN 后只提示表，不灌字段
    if (isAfterFromOrJoin(fullBefore)) {
      const options = tableCompletions(all, prefix)
      return options.length ? { from, options, validFor: /^\w*$/ } : null
    }

    const options: Completion[] = []

    // 已解析到表：别名 + 这些表的字段；否则退回全量表白名单
    if (aliasMap.size > 0) {
      const suggestedAliases = new Set<string>()
      const suggestedTables = new Set<string>()

      aliasMap.forEach((meta, alias) => {
        if (!suggestedAliases.has(alias) && (!prefix || alias.startsWith(prefix.toLowerCase()))) {
          options.push(withSection({
            label: alias === meta.name.toLowerCase() ? meta.name : alias,
            type: 'variable',
            detail: `表 ${meta.name}`,
            boost: 8,
          }, COMPLETION_SECTIONS.table))
          suggestedAliases.add(alias)
        }

        if (!suggestedTables.has(meta.name.toLowerCase())) {
          options.push(...fieldCompletions(meta.fields, prefix).map(c => ({
            ...c,
            detail: `${meta.name}.${c.detail || ''}`.trim(),
            boost: (c.boost ?? 0) + 5,
          })))
          suggestedTables.add(meta.name.toLowerCase())
        }
      })
    }
    else {
      options.push(...tableCompletions(all, prefix))
    }

    return options.length ? { from, options, validFor: /^\w*$/ } : null
  }
}
