/*
 * 按库类型映射 SQL 关键字补全词表（精简常用，非方言全量）
 *
 * 用法：传 sqlDb（如 meta.dbType / "MySQL"）→ resolveSqlKeywordsByDb
 * 显式 sqlKeywords 优先于本映射。
 */
import type { SqlKeywordInput } from './keywordCompletion'

/** 对外可识别的库别名（小写归一后） */
export type SqlDbAlias
  = | 'mysql'
    | 'mariadb'
    | 'postgres'
    | 'postgresql'
    | 'pgsql'
    | 'sqlite'
    | 'mssql'
    | 'sqlserver'
    | 'oracle'
    | 'standard'
    | 'sql'

/** 空格分隔词表 → 去重大写关键字项 */
function parseKeywordList(text: string): SqlKeywordInput[] {
  const seen = new Set<string>()
  const out: SqlKeywordInput[] = []
  for (const raw of text.split(/\s+/)) {
    if (!raw)
      continue
    const label = raw.toUpperCase()
    if (seen.has(label))
      continue
    seen.add(label)
    out.push({ label, boost: 1 })
  }
  return out
}

function mergeLists(...texts: string[]): SqlKeywordInput[] {
  return parseKeywordList(texts.join(' '))
}

/** 查询 / DML 通用（MySQL + PG 都常用） */
const COMMON_KEYWORDS = `
SELECT FROM WHERE AND OR NOT IN EXISTS BETWEEN LIKE IS
NULL TRUE FALSE AS ON JOIN INNER LEFT RIGHT FULL CROSS OUTER
GROUP BY HAVING ORDER ASC DESC LIMIT OFFSET UNION ALL DISTINCT
INSERT INTO VALUES UPDATE SET DELETE WITH RECURSIVE
CASE WHEN THEN ELSE END CAST COALESCE
COUNT SUM AVG MIN MAX
CREATE ALTER DROP TABLE VIEW INDEX PRIMARY UNIQUE FOREIGN REFERENCES
DEFAULT CHECK CONSTRAINT SCHEMA TRUNCATE COMMENT
`

/** MySQL / MariaDB 常用增量 */
const MYSQL_EXTRA = `
REPLACE IGNORE FORCE USE STRAIGHT_JOIN
REGEXP RLIKE XOR DIV MOD INTERVAL
DUAL SEPARATOR SHOW EXPLAIN DATABASE ENGINE
`

/** PostgreSQL 常用增量 */
const POSTGRES_EXTRA = `
ILIKE RETURNING LATERAL USING
OVER PARTITION WINDOW FILTER WITHIN GROUPS
NULLS FIRST LAST FETCH NEXT ONLY TIES EXCLUDE
SIMILAR TO ANALYZE EXPLAIN
`

/** SQLite 少量增量 */
const SQLITE_EXTRA = `
REPLACE ABORT FAIL IGNORE ROLLBACK VACUUM PRAGMA GLOB REGEXP
`

/** SQL Server 少量增量 */
const MSSQL_EXTRA = `
TOP OUTPUT MERGE NOLOCK APPLY PIVOT UNPIVOT
IDENTITY NVARCHAR DATETIME2
`

const ORACLE_EXTRA = `
ROWNUM NVL DECODE CONNECT START SYSDATE DUAL
`

/** 库别名 → 关键字列表（可直接当 sqlKeywords 用） */
export const SQL_KEYWORDS_BY_DB: Record<SqlDbAlias, SqlKeywordInput[]> = {
  mysql: mergeLists(COMMON_KEYWORDS, MYSQL_EXTRA),
  mariadb: mergeLists(COMMON_KEYWORDS, MYSQL_EXTRA),
  postgres: mergeLists(COMMON_KEYWORDS, POSTGRES_EXTRA),
  postgresql: mergeLists(COMMON_KEYWORDS, POSTGRES_EXTRA),
  pgsql: mergeLists(COMMON_KEYWORDS, POSTGRES_EXTRA),
  sqlite: mergeLists(COMMON_KEYWORDS, SQLITE_EXTRA),
  mssql: mergeLists(COMMON_KEYWORDS, MSSQL_EXTRA),
  sqlserver: mergeLists(COMMON_KEYWORDS, MSSQL_EXTRA),
  oracle: mergeLists(COMMON_KEYWORDS, ORACLE_EXTRA),
  standard: mergeLists(COMMON_KEYWORDS),
  sql: mergeLists(COMMON_KEYWORDS),
}

/** 别名归一：去空格、小写；常见写法映射到 SqlDbAlias */
export function normalizeSqlDbName(db?: string | null): SqlDbAlias | undefined {
  if (!db)
    return undefined
  const raw = db.trim().toLowerCase().replace(/[\s_-]+/g, '')
  if (!raw)
    return undefined

  const aliases: Record<string, SqlDbAlias> = {
    mysql: 'mysql',
    mariadb: 'mariadb',
    maria: 'mariadb',
    postgres: 'postgres',
    postgresql: 'postgresql',
    pgsql: 'pgsql',
    pg: 'postgres',
    sqlite: 'sqlite',
    sqlite3: 'sqlite',
    mssql: 'mssql',
    sqlserver: 'sqlserver',
    microsoftsqlserver: 'sqlserver',
    oracle: 'oracle',
    oracledb: 'oracle',
    standard: 'standard',
    standardsql: 'standard',
    sql: 'sql',
  }

  if (aliases[raw])
    return aliases[raw]

  // 宽松包含：如 "MySQL 8.0" / "Amazon Aurora MySQL"
  if (raw.includes('mariadb') || raw.includes('maria'))
    return 'mariadb'
  if (raw.includes('mysql') || raw.includes('aurora'))
    return 'mysql'
  if (raw.includes('postgres') || raw.includes('pgsql'))
    return 'postgres'
  if (raw.includes('sqlite'))
    return 'sqlite'
  if (raw.includes('sqlserver') || raw.includes('mssql'))
    return 'mssql'
  if (raw.includes('oracle'))
    return 'oracle'

  return undefined
}

/**
 * 按库名解析关键字。
 * - 能识别 → 对应精简词表
 * - 无法识别 → undefined（交给编辑器走 StandardSQL 默认）
 */
export function resolveSqlKeywordsByDb(db?: string | null): SqlKeywordInput[] | undefined {
  const alias = normalizeSqlDbName(db)
  if (!alias)
    return undefined
  return SQL_KEYWORDS_BY_DB[alias]
}
