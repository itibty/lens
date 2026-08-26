/*
 * @Description: 可视化域路由（dataset / cards / dashboards）
 */
import Layout from '@/layout/index.vue'

export default [
  {
    path: '/vis',
    component: Layout,
    name: 'Vis',
    meta: {
      menuId: '16',
      title: '可视化',
    },
    children: [
      {
        path: '/vis/datasets',
        name: 'VisDatasets',
        component: () => import('@/views/ds/index.vue'),
        meta: {
          menuId: '11',
          title: '数据集',
        },
      },
      {
        path: '/vis/datasets/edit',
        name: 'VisDatasetEdit',
        component: () => import('@/views/ds/edit.vue'),
        meta: {
          rootMenuId: '11',
          title: '编辑脚本',
        },
      },
      {
        path: '/vis/cards',
        name: 'VisCards',
        component: () => import('@/views/vis/cards/index.vue'),
        meta: {
          menuId: '17',
          title: '卡片',
          componentName: 'VisCards',
        },
      },
      {
        path: '/vis/cards/edit',
        name: 'VisCardEdit',
        component: () => import('@/views/vis/cards/edit.vue'),
        meta: {
          rootMenuId: '17',
          title: '卡片设计',
          componentName: 'VisCardEdit',
        },
      },
      {
        path: '/vis/dashboards',
        name: 'VisDashboards',
        component: () => import('@/views/vis/dashboards/index.vue'),
        meta: {
          menuId: '18',
          title: '看板',
          componentName: 'VisDashboards',
        },
      },
    ],
  },
  {
    path: '/vis/dashboards/view',
    name: 'VisDashboardView',
    component: () => import('@/views/vis/dashboards/view.vue'),
    meta: {
      title: '看板预览',
      componentName: 'VisDashboardView',
    },
  },
]
