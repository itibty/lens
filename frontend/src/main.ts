/*
 * @Author: Chuang
 * @Date: 2022-12-12 13:26:13
 * @LastEditTime: 2025-07-23 21:37:45
 * @LastEditors: Chuang
 * @Description:
 */
import { createApp } from 'vue'
import pinia from '@/stores'
import App from './App.vue'
import install from './install'
import router from './router'

const app = createApp(App)
app.use(pinia)
app.use(router)
app.use(install)

app.mount('#app')
