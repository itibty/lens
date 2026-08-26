/*
 * @Author: Chuang
 * @Date: 2024-04-10 13:53:56
 * @LastEditTime: 2026-03-10 15:13:30
 * @LastEditors: Chuang
 * @Description: eslint v9 扁平配置，基于antfu/eslint-config
 */

import antfu from '@antfu/eslint-config'

export default antfu({
  // typescript: true,
  // vue: true,
  unocss: true,
  formatters: {
    /**
     * Format CSS, LESS, SCSS files, also the `<style>` blocks in Vue
     * By default uses Prettier
     */
    css: true,
    /**
     * Format HTML files
     * By default uses Prettier
     */
    html: true,
    /**
     * Format Markdown files
     * Supports Prettier and dprint
     * By default uses Prettier
     */
    markdown: 'prettier',
  },
  ignores: [
    '.vscode/**',
    'node_modules/**',
    'dist/**',
    'public/**',
    'src/test-snippet.vue',
    'build/**',
    '.husky/**',
    'src/apis/admin/**',
    'src/apis/vis/**',
    '*.md',
    'vite.config.ts',
    'docs/**',
  ],
}, {
  rules: { // off | warn | error
    // 'import/named': 'error',
    'no-console': 'off',
    // -- js注释返回值描述缺失
    'jsdoc/require-returns-description': 'off',
    // ---正则表达式捕获组问题
    'e18e/prefer-static-regex': 'off', // 正则表达式提升静态
    // 'regexp/no-unused-capturing-group': 'off',
    // 'regexp/no-misleading-capturing-group': 'off',
    // ---单条if 允许大括号
    // 'curly': 'off',
    // --- 定义类型 可type 也可 interface
    'ts/consistent-type-definitions': 'off',

    // --- Function 可作为一种类型
    'ts/no-unsafe-function-type': 'off',

    // ---eslint-disable可用
    'eslint-comments/no-unlimited-disable': 'off',
    // --- @ts-ignore可用
    'ts/ban-ts-comment': 'off',
  },
})
