import { menuIconClass, normalizeMenuIconName } from '@/core/menuIcons'

export type MenuType = 'MENU' | 'FUNC'

export function isFunc(node?: Pick<ADMIN.MenuTree, 'menuType'>) {
  return node?.menuType === 'FUNC'
}

export function treeNodeIcon(node: ADMIN.MenuTree) {
  if (menuIconClass(node.icon))
    return normalizeMenuIconName(node.icon)
  return 'file-line'
}

export function stripFuncs(nodes: ADMIN.MenuTree[]): ADMIN.MenuTree[] {
  return nodes
    .filter(node => !isFunc(node))
    .map((node) => {
      const children = node.children?.length ? stripFuncs(node.children) : []
      return {
        ...node,
        children: children.length ? children : undefined,
      }
    })
}

export function findNode(nodes: ADMIN.MenuTree[], id?: string): ADMIN.MenuTree | undefined {
  if (!id)
    return undefined
  for (const node of nodes) {
    if (node.id === id)
      return node
    const hit = node.children?.length ? findNode(node.children, id) : undefined
    if (hit)
      return hit
  }
  return undefined
}

export function firstNodeId(nodes: ADMIN.MenuTree[]): string {
  return nodes[0]?.id || ''
}

export function listFuncs(node?: ADMIN.MenuTree) {
  return (node?.children ?? [])
    .filter(item => isFunc(item))
    .slice()
    .sort((a, b) => (a.sortNum ?? 0) - (b.sortNum ?? 0))
}

export function selectableId(nodes: ADMIN.MenuTree[], id?: string) {
  const node = id ? findNode(nodes, id) : undefined
  if (!node)
    return ''
  return isFunc(node) ? (node.pid || '') : (node.id || '')
}
