/*
 * @Author: Chuang
 * @Date: 2023-01-05 13:52:12
 * @LastEditTime: 2024-07-19 13:43:05
 * @LastEditors: Chuang
 * @Description: 配置数据
 */
export interface TagInfo {
  text: string
  type?: 'success' | 'info' | 'warning' | 'danger'
  round?: boolean
  effect?: 'light' | 'dark' | 'plain'
}

export interface MenuInfo {
  id: string
  pid?: string
  name: string
  url?: string
  icon?: string
  tag?: TagInfo
  children?: MenuInfo[]
  hidden?: boolean // 菜单和本地路由没有匹配项
}

// 非权限控制公共菜单
export const constantMenu: MenuInfo[] = [
  // {
  //   id: "1",
  //   pid: "0",
  //   name: "首页",
  //   url: "/",
  // },
]
