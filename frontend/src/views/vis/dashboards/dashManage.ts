export type ExplorerCommand
  = | 'add-root-group'
    | 'add-child-group'
    | 'add-dashboard'
    | 'edit-group'
    | 'toggle-group'
    | 'delete-group'
    | 'edit-dashboard'
    | 'move-dashboard'
    | 'toggle-dashboard'
    | 'delete-dashboard'

/** 管理树虚拟根，与报表中心菜单根 id 对齐 */
export const REPORT_CENTER_ID = '90'
/** 看板挂在报表中心根下，库里 group_id = 0 */
export const ROOT_GROUP_ID = '0'

export function toStoreGroupId(id?: string | null) {
  if (!id || id === ROOT_GROUP_ID || id === REPORT_CENTER_ID)
    return ROOT_GROUP_ID
  return id
}

export interface DashManageNode extends Omit<
  VIS.ManageNode,
  'id' | 'nodeType' | 'name' | 'status' | 'children'
> {
  id: string
  nodeType: 'GROUP' | 'DASH'
  name: string
  status?: 'EBL' | 'DBL'
  children: DashManageNode[]
}

/** 管理树接口由后端保证必填字段；这里同时过滤异常节点，避免坏数据影响整棵树。 */
export function normalizeDashManageNodes(nodes: VIS.ManageNode[] = []): DashManageNode[] {
  return nodes.flatMap((node): DashManageNode[] => {
    const id = node.id == null ? '' : String(node.id)
    const name = String(node.name || '')
    const children = normalizeDashManageNodes(node.children)
    if (node.virtual && (id === ROOT_GROUP_ID || name === '未分组'))
      return children
    if (!id || !name || (node.nodeType !== 'GROUP' && node.nodeType !== 'DASH'))
      return []
    return [{
      ...node,
      id,
      name,
      nodeType: node.nodeType,
      status: node.status === 'DBL' ? 'DBL' : 'EBL',
      children,
    }]
  })
}
