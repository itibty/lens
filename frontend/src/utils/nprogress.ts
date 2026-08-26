/*
 * @Author: Chuang
 * @Date: 2023-01-05 09:59:34
 * @LastEditTime: 2023-05-31 18:29:32
 * @LastEditors: Chuang
 * @Description: nprogress封装 https://cloud.tencent.com/developer/article/2192271
 */
import nprogress from 'nprogress'
import 'nprogress/nprogress.css'

nprogress.configure({
  easing: 'ease',
  speed: 500,
  trickleSpeed: 300,
  showSpinner: false,
})

// 配置参数
// NProgress.configure({
//   easing: 'ease', // 动画方式
//   speed: 1000, // 递增进度条的速度
//   showSpinner: false, // 是否显示加载ico
//   trickleSpeed: 200, // 自动递增间隔
//   minimum: 0.3, // 更改启动时使用的最小百分比
//   parent: 'body', //指定进度条的父容器
// })

// 开启进度条
export function NPStart() {
  if (!nprogress.isStarted())
    nprogress.start()
}

// 关闭进度条
export function NPDone() {
  if (nprogress.isStarted())
    nprogress.done()
}
