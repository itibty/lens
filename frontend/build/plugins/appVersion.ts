/*
 * @Author: Chuang
 * @Date: 2026-05-22 20:12:38
 * @LastEditTime: 2026-05-22 20:17:26
 * @LastEditors: Chuang
 * @Description:  vite应用版本插件，用于build下生成version.json文件(前端检测静态资源更新)
 */
import { execSync } from 'node:child_process'
import type { Plugin } from 'vite'
interface AppVersion {
  buildId: string
  buildTime: string
  commit: string
  mode: string
  version: string
}

export function createAppVersion(mode: string): AppVersion {
  const commit = getGitCommit()
  const buildTime = new Date().toISOString()

  return {
    buildId: `${Date.now()}-${commit || 'local'}`,
    buildTime,
    commit,
    mode,
    version: process.env.npm_package_version || '',
  }
}

export function createVersionFilePlugin(appVersion: AppVersion): Plugin {
  return {
    name: 'lens:version-file',
    apply: 'build',
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'version.json',
        source: `${JSON.stringify(appVersion, null, 2)}\n`,
      })
    },
  }
}

function getGitCommit(): string {
  try {
    return execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim()
  }
  catch {
    return ''
  }
}
