/*
 * @Description: 系统路由
 */
import Layout from '@/layout/index.vue'

export default [
  {
    path: '/sys',
    component: Layout,
    name: 'Sys',
    meta: {
      menuId: '16',
      title: '后台管理',
    },
    children: [
      {
        path: '/sys/users',
        name: 'SysUsers',
        component: () => import('@/views/permission/user/index.vue'),
        meta: {
          menuId: '2',
          title: '用户',
        },
      },
      {
        path: '/sys/roles',
        name: 'SysRoles',
        component: () => import('@/views/permission/role/index.vue'),
        meta: { menuId: '3', title: '角色' },
      },
      {
        path: '/sys/menus',
        name: 'SysMenus',
        component: () => import('@/views/permission/menu/index.vue'),
        meta: { menuId: '4', title: '菜单' },
      },
    ],
  },
]
