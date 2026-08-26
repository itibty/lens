/*
 * @Description: 报表中心。查看页不写 menuId，多条菜单用 /vis/report/:id 对应同一页。
 */
import Layout from '@/layout/index.vue'

export default [
  {
    path: '/vis/report',
    component: Layout,
    name: 'Reports',
    meta: {
      menuId: '90',
      title: '报表中心',
    },
    children: [
      {
        path: '',
        name: 'ReportViewHome',
        component: () => import('@/views/reports/index.vue'),
        meta: {
          title: '报表中心',
          componentName: 'ReportView',
        },
      },
      {
        path: ':id',
        name: 'ReportView',
        component: () => import('@/views/reports/index.vue'),
        meta: {
          title: '报表中心',
          componentName: 'ReportView',
        },
      },
    ],
  },
]
