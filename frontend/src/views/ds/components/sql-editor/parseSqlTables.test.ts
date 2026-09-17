import { describe, expect, it } from 'vitest'
import { parseSqlTableRefs } from './parseSqlTables'

describe('sql table scope', () => {
  it('resolves catalog, database and table with aliases', () => {
    expect(parseSqlTableRefs('SELECT t.id FROM `hive`.`default`.`orders` AS t JOIN hive.default.items i ON t.id = i.id')).toEqual([
      { schema: 'hive.default', table: 'orders', alias: 't' },
      { schema: 'hive.default', table: 'items', alias: 'i' },
    ])
  })
  it('preserves single and two-part names and ignores comments', () => {
    expect(parseSqlTableRefs('SELECT * FROM public.orders WHERE id IN (SELECT id FROM items) /* JOIN ignored */')).toEqual([
      { schema: 'public', table: 'orders', alias: 'orders' },
      { schema: undefined, table: 'items', alias: 'items' },
    ])
  })
})
