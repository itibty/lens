import type { QueryIssue } from './chartShape'

/** 编辑时只保留仍存在的旧错误，不新增提示，也不替换错误对象触发定位。 */
export function retainQueryIssues(previous: QueryIssue[], current: QueryIssue[]) {
  return previous.filter(old => current.some(next =>
    old.shelf === next.shelf && old.uid === next.uid && old.message === next.message,
  ))
}
