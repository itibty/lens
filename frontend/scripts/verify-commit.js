/*
 * @Author: Chuang
 * @Date: 2024-08-02 13:40:15
 * @LastEditors: Chuang
 * @LastEditTime: 2025-10-30 17:29:40
 * @Description:
 */
import { readFileSync } from 'node:fs'
import path from 'node:path'
import pico from 'picocolors'

// const process = require('node:process')

const msgPath = path.resolve('.git/COMMIT_EDITMSG')
const msg = readFileSync(msgPath, 'utf-8').trim()

const commitRE = /^(?:revert: )?(?:feat|fix|docs|dx|style|refactor|perf|test|workflow|build|ci|chore|types|wip|release).*: .{1,50}/
if (!commitRE.test(msg)) {
  console.log(pico.yellow(`\n你提交的信息: ${msg}\n`))
  console.error(
    `  ${pico.white(pico.bgRed(' 错误 '))} ${pico.red(
      `无效的提交信息格式.`,
    )}\n\n${pico.red(`  正确的提交消息格式. 例如:\n\n`)
    }    ${pico.green(`feat: add a new feature`)}\n`
    + `    ${pico.green(`fix: fixed an interaction bug`)}\n\n${pico.red(
      `我们参考了Vue3的方案.\n`
      + `访问 https://github.com/vuejs/core/blob/main/.github/commit-convention.md 查看更多细节.\n`,
    )}`,
  )
  // eslint-disable-next-line node/prefer-global/process
  process.exit(1)
}

// -   feat：表示新增功能。
// -   fix：表示修复 bug。
// -   docs：表示更新文档。
// -   dx：表示改进开发者体验。
// -   style：表示修改样式。
// -   refactor：表示重构代码。
// -   perf：表示性能优化。
// -   test：表示添加或修改测试。
// -   workflow：表示改进工作流程。
// -   build：表示修改构建系统或外部依赖。
// -   ci：表示修改持续集成配置文件或脚本。
// -   chore：表示其他杂项任务。
// -   types：表示修改类型定义文件（如 TypeScript）。
// -   wip：表示进行中的工作，尚未完成。
// -   release：表示发布新版本。
