export interface MenuIconItem {
  name: string
  label: string
  group: string
}

export const MENU_ICON_COLLECTION = 'mingcute'

export const MENU_ICON_GROUPS = [
  { id: 'nav', label: '导航' },
  { id: 'data', label: '数据' },
  { id: 'chart', label: '图表' },
  { id: 'sys', label: '系统' },
  { id: 'more', label: '其他' },
] as const

/** 菜单可选的 mingcute 图标名（存库只写 name，如 chart-bar-line） */
export const MENU_ICONS: MenuIconItem[] = [
  { name: 'home-4-line', label: '首页', group: 'nav' },
  { name: 'grid-2-line', label: '宫格', group: 'nav' },
  { name: 'layout-4-line', label: '布局', group: 'nav' },
  { name: 'layout-grid-line', label: '网格', group: 'nav' },
  { name: 'menu-line', label: '菜单', group: 'nav' },
  { name: 'dashboard-3-line', label: '看板', group: 'nav' },
  { name: 'classify-2-line', label: '分类', group: 'nav' },
  { name: 'components-line', label: '组件', group: 'nav' },

  { name: 'storage-line', label: '存储', group: 'data' },
  { name: 'server-2-line', label: '服务', group: 'data' },
  { name: 'table-2-line', label: '表格', group: 'data' },
  { name: 'table-line', label: '数据表', group: 'data' },
  { name: 'folder-line', label: '文件夹', group: 'data' },
  { name: 'document-line', label: '文档', group: 'data' },
  { name: 'file-line', label: '文件', group: 'data' },
  { name: 'layers-line', label: '图层', group: 'data' },

  { name: 'chart-bar-line', label: '柱状图', group: 'chart' },
  { name: 'chart-bar-2-line', label: '柱状图2', group: 'chart' },
  { name: 'chart-line-line', label: '折线图', group: 'chart' },
  { name: 'chart-pie-line', label: '饼图', group: 'chart' },
  { name: 'chart-horizontal-line', label: '条形图', group: 'chart' },
  { name: 'board-line', label: '面板', group: 'chart' },
  { name: 'report-line', label: '报表', group: 'chart' },

  { name: 'settings-3-line', label: '设置', group: 'sys' },
  { name: 'user-3-line', label: '用户', group: 'sys' },
  { name: 'user-4-line', label: '用户2', group: 'sys' },
  { name: 'group-3-line', label: '角色', group: 'sys' },
  { name: 'group-2-line', label: '用户组', group: 'sys' },
  { name: 'lock-line', label: '锁定', group: 'sys' },
  { name: 'shield-line', label: '安全', group: 'sys' },
  { name: 'key-2-line', label: '密钥', group: 'sys' },
  { name: 'user-security-line', label: '权限', group: 'sys' },

  { name: 'search-line', label: '搜索', group: 'more' },
  { name: 'notification-line', label: '通知', group: 'more' },
  { name: 'calendar-line', label: '日历', group: 'more' },
  { name: 'bookmark-line', label: '书签', group: 'more' },
  { name: 'tag-line', label: '标签', group: 'more' },
  { name: 'earth-line', label: '地球', group: 'more' },
  { name: 'link-line', label: '链接', group: 'more' },
  { name: 'box-2-line', label: '盒子', group: 'more' },
]

const MENU_ICON_NAME_SET = new Set(MENU_ICONS.map(item => item.name))

export function normalizeMenuIconName(raw?: string) {
  if (!raw)
    return ''
  let name = raw.trim()
  if (name.startsWith('i-mingcute-'))
    name = name.slice('i-mingcute-'.length)
  else if (name.startsWith('mingcute:'))
    name = name.slice('mingcute:'.length)
  else if (name.startsWith('mingcute-'))
    name = name.slice('mingcute-'.length)
  return name
}

export function menuIconClass(raw?: string) {
  const name = normalizeMenuIconName(raw)
  if (!name || !/^[a-z0-9-]+$/.test(name))
    return ''
  return `i-${MENU_ICON_COLLECTION}-${name}`
}

export function isPresetMenuIcon(raw?: string) {
  const name = normalizeMenuIconName(raw)
  return !!name && MENU_ICON_NAME_SET.has(name)
}

export function findMenuIcon(raw?: string) {
  const name = normalizeMenuIconName(raw)
  return MENU_ICONS.find(item => item.name === name)
}

export const MENU_ICON_SAFELIST = MENU_ICONS.map(item => menuIconClass(item.name))
