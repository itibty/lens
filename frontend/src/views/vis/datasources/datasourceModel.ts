import { ElMessageBox } from 'element-plus'

export const DATABASE_TYPES = [
  { value: 'MYSQL', label: 'MySQL', placeholder: 'jdbc:mysql://127.0.0.1:3306/analytics' },
  { value: 'POSTGRES', label: 'PostgreSQL', placeholder: 'jdbc:postgresql://127.0.0.1:5432/analytics' },
  { value: 'STARROCKS', label: 'StarRocks', placeholder: 'jdbc:starrocks://127.0.0.1:9030/default_catalog.analytics' },
] as const

export function databaseTypeLabel(value?: string) {
  return DATABASE_TYPES.find(type => type.value === value)?.label ?? value ?? '—'
}

export interface DatasourceDraft {
  id?: string
  sourceName: string
  dbType: string
  jdbcUrl: string
  username: string
  password: string
}

export function connectionRequest(form: DatasourceDraft, changePassword: boolean): VIS.DatasourceConnectionRequest {
  return {
    id: form.id,
    dbType: form.dbType,
    jdbcUrl: form.jdbcUrl.trim(),
    username: form.username.trim(),
    ...(!form.id || changePassword ? { password: form.password } : {}),
  }
}

export function isDialogCancel(error: unknown) {
  return error === 'cancel' || error === 'close'
}

/** 服务端按最新引用返回影响提示，确认后重试同一份提交内容。 */
export async function withImpactConfirmation<T>(submit: (confirmed: boolean) => Promise<T>): Promise<T> {
  try {
    return await submit(false)
  }
  catch (error) {
    const impact = (error as { data?: { warningType?: string, datasetCount?: number } } | null)?.data
    if (impact?.warningType !== 'DATASOURCE_IMPACT' || typeof impact.datasetCount !== 'number')
      throw error
    await ElMessageBox.confirm(`此操作将影响 ${impact.datasetCount} 个数据集及关联报表。`, '确认修改数据源', {
      confirmButtonText: '继续',
      cancelButtonText: '取消',
      type: 'warning',
      closeOnClickModal: false,
    })
    return submit(true)
  }
}
