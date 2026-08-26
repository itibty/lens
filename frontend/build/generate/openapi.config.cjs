/*
 * @Description: 生成 Api 调用代码（@umijs/openapi）
 *
 * 用法：
 *   pnpm generate-api -- --service=vis
 *   pnpm generate-api -- --service=admin,vis
 *
 * 也可：node ./build/generate/openapi.config.cjs --service=vis
 *
 * https://www.npmjs.com/package/@umijs/openapi
 */

const { generateService } = require('@umijs/openapi')
const path = require('node:path')

/** 相对本配置文件定位，避免受启动 cwd 影响写到仓库外 */
const APIS_ROOT = path.resolve(__dirname, '../../src/apis')

function parseServices() {
  const arg = process.argv.find(a => a.startsWith('--service='))
  if (!arg) {
    console.error('[generate-api] 请指定 --service=admin 或 --service=vis（可逗号多选）')
    console.error('  例：pnpm generate-api -- --service=vis')
    process.exit(1)
  }
  return arg
    .slice('--service='.length)
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
}

/** int64 → string，避免 JS 精度问题 */
function customType(schema) {
  if (schema.type === 'integer' && schema.format === 'int64')
    return 'string'
  if (
    schema.type === 'array'
    && schema.items
    && schema.items.type === 'integer'
    && schema.items.format === 'int64'
  ) {
    return 'string[]'
  }
}

function makeFileNameHook(tagFileMapping) {
  return (meta, path, method) => {
    const tag = meta.tags?.length > 0 ? meta.tags[0] : ''
    const file = tagFileMapping[tag]
    if (!file) {
      console.warn(`[generate-api] 未映射 tag="${tag}" ${method.toUpperCase()} ${path}，将跳过自定义文件名`)
      return []
    }
    console.log(method, path, '->', file)
    return [file]
  }
}

const LENS_OPENAPI = process.env.LENS_OPENAPI || 'http://127.0.0.1:8080/v3/api-docs'

const services = {
  admin: {
    schemaPath: `${LENS_OPENAPI}/admin`,
    projectName: 'admin',
    namespace: 'ADMIN',
    apiPrefix: 'ADMIN_BASE_PATH',
    requestImportStatement:
      'import request from "@/core/request";\nimport { ADMIN_BASE_PATH } from "@/apis/config";',
    tagFileMapping: {
      '认证': 'account',
      '账户': 'account',
      '用户': 'user',
      '角色': 'role',
      '菜单': 'menu',
    },
  },
  vis: {
    schemaPath: `${LENS_OPENAPI}/vis`,
    projectName: 'vis',
    namespace: 'VIS',
    apiPrefix: 'VIS_BASE_PATH',
    requestImportStatement:
      'import request from "@/core/request";\nimport { VIS_BASE_PATH } from "@/apis/config";',
    tagFileMapping: {
      DATASOURCE: 'datasource',
      DATASET: 'dataset',
      CARD: 'card',
      DASHBOARD: 'dashboard',
      DASH_GROUP: 'dashboard',
      QUERY: 'query',
      EXPORT: 'dataExport',
    },
  },
}

async function main() {
  const names = parseServices()
  for (const name of names) {
    const cfg = services[name]
    if (!cfg) {
      console.error(`[generate-api] 未知 service="${name}"，可选：${Object.keys(services).join(', ')}`)
      process.exit(1)
    }
    console.log(`\n[generate-api] generating ${name} from ${cfg.schemaPath}`)
    await generateService({
      schemaPath: cfg.schemaPath,
      serversPath: APIS_ROOT,
      projectName: cfg.projectName,
      requestImportStatement: cfg.requestImportStatement,
      namespace: cfg.namespace,
      apiPrefix: cfg.apiPrefix,
      hook: {
        customType,
        customFileNames: makeFileNameHook(cfg.tagFileMapping),
      },
    })
    console.log(`[generate-api] done: ${name}`)
  }
}

main().catch((err) => {
  console.error('[generate-api] failed', err)
  process.exit(1)
})
