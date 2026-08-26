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
    const id = String(node.id || '')
    const name = String(node.name || '')
    if (!id || !name || (node.nodeType !== 'GROUP' && node.nodeType !== 'DASH'))
      return []
    return [{
      ...node,
      id,
      name,
      nodeType: node.nodeType,
      status: node.status === 'DBL' ? 'DBL' : 'EBL',
      children: normalizeDashManageNodes(node.children),
    }]
  })
}
