import { describe, expect, it } from 'vitest'
import { menuParentOptions } from './menuAdmin'

function menu(id: string, children: ADMIN.MenuTree[] = [], menuType: 'MENU' | 'FUNC' = 'MENU'): ADMIN.MenuTree {
  return { id, pid: '0', menuName: `菜单 ${id}`, menuType, status: 'EBL', children }
}

describe('menu parent choices', () => {
  const tree = [menu('1', [menu('2', [menu('3')]), menu('4'), menu('5', [], 'FUNC')]), menu('6')]

  it('allows roots, ancestors and siblings while excluding the entire current subtree and functions', () => {
    expect(menuParentOptions(tree, '2')).toEqual([{
      id: '0',
      menuName: '顶级菜单',
      children: [
        { id: '1', menuName: '菜单 1', children: [{ id: '4', menuName: '菜单 4', children: [] }] },
        { id: '6', menuName: '菜单 6', children: [] },
      ],
    }])
    expect(tree[0]!.children.map(node => node.id)).toEqual(['2', '4', '5'])
    expect(tree[0]!.children[0]!.children[0]!.id).toBe('3')
  })

  it('keeps the top-level choice when the current menu is the only root', () => {
    expect(menuParentOptions([tree[0]!], '1')).toEqual([{ id: '0', menuName: '顶级菜单', children: [] }])
  })
})
