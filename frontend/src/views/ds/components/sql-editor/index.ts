/*
 * sql-editor 对外导出（调用方优先从这里取预设 / 类型）
 *
 * 目录职责一览：
 * - buildExtensions     组装 CM extensions
 * - presets             业务常量/方法预设（props 传入）
 * - enjoyVocab          引擎指令 / snippet / 循环变量
 * - enjoyHighlight      Enjoy 灰斜体 Overlay
 * - enjoyConstChips     #(CONST) 原子标签
 * - enjoyCompletion     Enjoy 补全
 * - metaCompletion      FROM/JOIN 上下文表字段补全
 * - keywordCompletion   SQL 关键字补全
 * - sqlKeywordsByDb     库名 → 精简关键字映射
 * - formatSqlWithEnjoy  分段格式化
 * - completionTheme     补全面板样式
 * - sqlHighlightStyle   SQL token 高亮
 */
export { buildSqlTemplateExtensions } from './buildExtensions'
export type { EnjoyConstantItem, EnjoyMethodItem } from './enjoyVocab'
export { formatSqlWithEnjoy } from './formatSqlWithEnjoy'
export type { SqlKeywordInput, SqlKeywordItem } from './keywordCompletion'
export { ENJOY_CONSTANTS_PRESET, ENJOY_METHODS_PRESET } from './presets'
export { resolveSqlKeywordsByDb } from './sqlKeywordsByDb'
