/*
 * Enjoy / JFinal 模板词表（与 SqlRulePanel 对齐）
 */

export interface EnjoyCompletionItem {
  label: string
  type: string
  detail?: string
  info?: string
  /** 选中后插入的文本，默认 label */
  apply?: string
  boost?: number
}

/** 可配置常量（文档中以 #(LABEL) 形式出现，可做成原子标签） */
export interface EnjoyConstantItem {
  /** 标识符，如 NOW_TS；完整文本为 #(NOW_TS) */
  label: string
  detail?: string
  info?: string
  boost?: number
}

/** 可配置方法（如 kit.isBlank），由外部传入编辑器 */
export interface EnjoyMethodItem {
  label: string
  detail?: string
  info?: string
  /** 选中后插入文本，默认 label */
  apply?: string
  boost?: number
}

/** 指令（输入 # 时） */
export const ENJOY_DIRECTIVES: EnjoyCompletionItem[] = [
  {
    label: '#if',
    type: 'keyword',
    detail: '条件',
    apply: '#if()\n  \n#end',
    boost: 10,
  },
  {
    label: '#elseif',
    type: 'keyword',
    detail: '否则如果',
    apply: '#elseif()',
    boost: 9,
  },
  {
    label: '#else',
    type: 'keyword',
    detail: '否则',
    apply: '#else',
    boost: 9,
  },
  {
    label: '#for',
    type: 'keyword',
    detail: '循环',
    apply: '#for(x : list)\n  \n#end',
    boost: 9,
  },
  {
    label: '#end',
    type: 'keyword',
    detail: '结束块',
    apply: '#end',
    boost: 8,
  },
  {
    label: '#para',
    type: 'function',
    detail: '参数占位',
    apply: '#para()',
    boost: 11,
  },
  {
    label: '#para(name,"in")',
    type: 'function',
    detail: 'IN 列表',
    apply: '#para(,"in")',
    boost: 7,
  },
  {
    label: '#para(name,"like")',
    type: 'function',
    detail: '两侧模糊',
    apply: '#para(,"like")',
    boost: 6,
  },
  {
    label: '#para(name,"like%")',
    type: 'function',
    detail: '前缀模糊',
    apply: '#para(,"like%")',
    boost: 5,
  },
  {
    label: '#para(name,"%like")',
    type: 'function',
    detail: '后缀模糊',
    apply: '#para(,"%like")',
    boost: 5,
  },
]

/** `#for` 循环体内插值可用的模板变量 */
export const ENJOY_LOOP_VARS: EnjoyCompletionItem[] = [
  { label: 'for.first', type: 'property', detail: '#for 首项', apply: 'for.first', boost: 5 },
  { label: 'for.last', type: 'property', detail: '#for 末项', apply: 'for.last', boost: 5 },
  { label: 'for.index', type: 'property', detail: '#for 下标', apply: 'for.index', boost: 4 },
]

/** 常用 snippet（# 触发） */
export const ENJOY_SNIPPETS: EnjoyCompletionItem[] = [
  {
    label: 'snippet:if-else',
    type: 'text',
    detail: 'if / else',
    apply: `#if()
  
#else
  
#end`,
    boost: 4,
  },
  {
    label: 'snippet:if-elseif-else',
    type: 'text',
    detail: 'if / elseif / else',
    apply: `#if()
  
#elseif()
  
#else
  
#end`,
    boost: 4,
  },
  {
    label: 'snippet:in',
    type: 'text',
    detail: '动态 IN',
    info: '#if(ids && !ids.isEmpty()) and id in #para(ids,\'in\') #end',
    apply: `#if(ids && !ids.isEmpty())
  and id in #para(ids,'in')
#end`,
    boost: 3,
  },
  {
    label: 'snippet:where-and',
    type: 'text',
    detail: '动态 where/and',
    apply: `#if(cond && !cond.keySet().isEmpty())
  #for(x : cond)
    #(for.first ? "where": "and") #(x.key) = #para(x.value)
  #end
#end`,
    boost: 2,
  },
  {
    label: 'snippet:set',
    type: 'text',
    detail: '动态 set',
    apply: `#for(x : cond)
  #(for.first ? "set": ",")
  #(x.key) = #para(x.value)
#end`,
    boost: 2,
  },
]

/** 剥离 Enjoy 指令时用的匹配（粗粒度，供 SQL 解析前清理） */
export const ENJOY_STRIP_PATTERNS: RegExp[] = [
  /#para\s*\([^)]*\)/gi,
  /#\([^)]*\)/g,
  /#(if|for|else|elseif|set|inc|end)\b[^\n]*/gi,
]

/** inside：已在 #( 内，apply 只补内容；bare：自动包成 #(…) */
export function constantsToCompletions(
  constants: EnjoyConstantItem[],
  mode: 'inside' | 'bare' = 'inside',
): EnjoyCompletionItem[] {
  return constants.map(c => ({
    label: c.label,
    type: 'constant',
    detail: c.detail,
    info: c.info,
    // inside: 已在 #( 内，补 LABEL)；bare: 直接输入时包成 #(LABEL)
    apply: mode === 'inside' ? `${c.label})` : `#(${c.label})`,
    boost: c.boost ?? 10,
  }))
}

export function methodsToCompletions(
  methods: EnjoyMethodItem[],
  mode: 'inside' | 'bare' = 'inside',
): EnjoyCompletionItem[] {
  return methods.map((m) => {
    const body = m.apply ?? m.label
    return {
      label: m.label,
      type: 'function',
      detail: m.detail,
      info: m.info,
      apply: mode === 'inside' ? body : `#(${body})`,
      boost: m.boost ?? 8,
    }
  })
}

export function loopVarsToCompletions(mode: 'inside' | 'bare' = 'inside'): EnjoyCompletionItem[] {
  return ENJOY_LOOP_VARS.map((item) => {
    const body = item.apply ?? item.label
    return {
      ...item,
      apply: mode === 'inside' ? body : `#(${body})`,
    }
  })
}
