/** 卡片与看板名称均最多 50 个 UTF-16 字符，给副本后缀预留长度。 */
export function copyName(name: string) {
  const suffix = ' · 副本'
  return `${name.trim().slice(0, 50 - suffix.length).trimEnd()}${suffix}`
}
