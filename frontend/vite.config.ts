// @ts-nocheck — Vite 8 Plugin 与 TS 6 比较会 TS2321，配置改由运行时校验
import { createAppVersion, createVersionFilePlugin } from './build/plugins/appVersion.ts'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath, URL } from 'node:url'


import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import VueSetupExtend from 'vite-plugin-vue-setup-extend'
import VitePluginInspect from 'vite-plugin-inspect'
// import VitePluginVueDevTools from 'vite-plugin-vue-devtools' // vue开发工具，嵌入到网页中

// 自动引入
import AutoImport from 'unplugin-auto-import/vite'
import IconsResolver from 'unplugin-icons/resolver'
import Icons from 'unplugin-icons/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'
import Components from 'unplugin-vue-components/vite'

// Unocss
import UnoCSS from 'unocss/vite'

// gzip压缩
import ViteCompression from 'vite-plugin-compression'

// import { createHtmlPlugin } from 'vite-plugin-html' // 导致 inspect无效等
import simpleHtmlPlugin from 'vite-plugin-simple-html'

// 自定义svg图标 https://zhuanlan.zhihu.com/p/570630648
import { createSvgIconsPlugin } from 'vite-plugin-svg-icons'
import { visualizer } from 'rollup-plugin-visualizer'

export default defineConfig(({ command, mode, isSsrBuild, isPreview }) => {
  const isBuild = command === 'build'
  const isServe = command === 'serve'
  console.log(`[Vite] command=${command} mode=${mode} isSsrBuild=${isSsrBuild} isPreview=${isPreview}`)

  const env = loadEnv(mode, process.cwd(), '')
  const appVersion = createAppVersion(mode)
  return {
    define: {
      __IS_BUILD__: JSON.stringify(isBuild),
      __APP_VERSION__: JSON.stringify(appVersion),
    },
    plugins: [
      vue({
        // script: {
        //   fs: fs, // 强制给 compileScript 传入 fs 选项
        // },
      }),
      vueJsx(), // 支持jsx语法
      VueSetupExtend(), // 单文件启用setup, name属性指定组件名

      AutoImport({
        resolvers: [ElementPlusResolver({ importStyle: 'sass' })], // elementPlus 自动引入
        imports: ['vue', 'vue-router', 'pinia'], // vue生态
        eslintrc: {
          // 解决AutoImport后编辑文件， eslint报错问题
          enabled: false, // Default `false`，推荐：第一次设置为true，生成.eslintrc-auto-import.json后设置为false
          globalsPropValue: true, // Default `true`, (true | false | 'readonly' | 'readable' | 'writable' | 'writeable')
        },
      }),
      Components({
        resolvers: [
          ElementPlusResolver({ importStyle: 'sass' }),
          IconsResolver({
            enabledCollections: ['mingcute', 'ep', 'svg-spinners', 'ix', 'ant-design', 'tabler'], // iconify启用图标，需package.json中安装
          }),
        ],
        dirs: [
          'src/components',
          'src/layout/components',
        ],
        extensions: ['vue', 'tsx', 'jsx'], // 组件的有效文件扩展名。
        deep: true, // 搜索子目录
      }),
      Icons({
        autoInstall: false,
      }),

      // 注册SVG
      createSvgIconsPlugin({
        iconDirs: [path.resolve(import.meta.dirname, 'src/assets/icons')],
        symbolId: 'icon-[name]',
      }),

      // index.html 中使用环境变量
      // createHtmlPlugin 导致 breaks Vite proxy，使用simpleHtmlPlugin代替
      simpleHtmlPlugin({
        inject: {
          data: {
            title: env.VITE_APP_TITLE || 'Lens',
          },
        },
      }),

      // 启用Unocss
      UnoCSS({
        inspector: isServe,
        configFile: './uno.config.ts',
      }),

      // 打包 brotli静态压缩（比gzip小约15%，现代浏览器均支持）
      ViteCompression({
        verbose: true, // 打印压缩结果，便于 CI/CD 查看
        disable: !isBuild, // 是否开启
        threshold: 10240, // 10K
        algorithm: 'brotliCompress',
        ext: '.br',
      }),

      createVersionFilePlugin(appVersion),

      //VitePluginVueDevTools(),

      // 分析报告inspect
      isServe && VitePluginInspect({
        dev: true,
        build: false, // npx serve .vite-inspect
        outputDir: '.vite-inspect',
      }),

      // bundle 分析报告（运行 build 后生成 stats.html）
      isBuild && visualizer({
        filename: 'pkg-stats.html',
        open: false,
        gzipSize: true,
        brotliSize: true,
        template: 'treemap',
      }),
    ],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
      // VChart / VTable 必须共用同一套 vrender，否则饼图等会报 setStateDefinitionsWithCompiled
      dedupe: [
        '@visactor/vrender',
        '@visactor/vrender-core',
        '@visactor/vrender-kits',
        '@visactor/vrender-components',
        '@visactor/vrender-animate',
      ],
    },
    css: {
      preprocessorOptions: {
        scss: {
          api: 'modern',
          // silenceDeprecations: ["legacy-js-api"]
          additionalData: '@use "@/assets/styles/variables.scss" as *;', // 所有scss自动引入
        },
      },
    },
    build: {
      target: 'es2020',
      // outDir: dist,
      // reportCompressedSize: false,  // 展示压缩后体积
      // sourcemap: false,             // 禁用sourcemap(仅调试时需要)
      chunkSizeWarningLimit: 1000, // 体积过大警告阈值
      rollupOptions: {
        output: {
          chunkFileNames: 'js/[name]-[hash].js', // 引入文件名的名称
          entryFileNames: 'js/[name]-[hash].js', // 包的入口文件名称
          assetFileNames: '[ext]/[name]-[hash].[ext]', // 资源文件像 字体，图片等
          manualChunks: (id) => {
            // 拆包优化（原则：非常用&大体积单独打包）
            if (id.includes('node_modules')) {
              if (id.includes('@visactor/vchart')) {
                return 'vender-vchart'
              }
              else if (id.includes('codemirror') || id.includes('sql-formatter')) {
                // codemirror 代码编辑器
                return 'vender-code'
              }
              else if (id.includes('element-plus')) {
                // element-plus UI库独立打包，提升缓存命中率
                return 'vender-ep'
              }
              else {
                // 剩余的
                return 'venders'
              }
              // 最小化拆包
              // return id
              //   .toString()
              //   .split("node_modules/")[1]
              //   .split("/")[0]
              //   .toString();
            }
          },
        },
      },
    },
    server: {
      proxy: {
        '/api': {
          target: env.VITE_SERVER || 'http://127.0.0.1:8080',
          secure: false,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, ''),
        },
      },
    },
  }
})

