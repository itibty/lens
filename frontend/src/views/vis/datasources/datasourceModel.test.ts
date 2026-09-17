import { describe, expect, it, vi } from 'vitest'
import { connectionRequest, withImpactConfirmation } from './datasourceModel'

const { confirm } = vi.hoisted(() => ({ confirm: vi.fn() }))
vi.mock('element-plus', () => ({ ElMessageBox: { confirm } }))
const draft = { id: '1', sourceName: '零售库', dbType: 'MYSQL', jdbcUrl: ' jdbc:mysql://localhost/db ', username: ' report ', password: 'secret' }

describe('数据源提交', () => {
  it('保留密码时不将旧输入发送到服务端', () => {
    expect(connectionRequest(draft, false)).toEqual({ id: '1', dbType: 'MYSQL', jdbcUrl: 'jdbc:mysql://localhost/db', username: 'report' })
  })
  it('支持明确修改为空密码，以及新建空密码', () => {
    expect(connectionRequest({ ...draft, password: '' }, true).password).toBe('')
    expect(connectionRequest({ ...draft, id: undefined, password: '' }, false).password).toBe('')
  })
  it('连接密码不做 trim', () => {
    expect(connectionRequest({ ...draft, password: ' secret ' }, true).password).toBe(' secret ')
  })
  it('用户确认影响后仅重试一次', async () => {
    confirm.mockResolvedValue('confirm')
    const submit = vi.fn().mockRejectedValueOnce({ data: { warningType: 'DATASOURCE_IMPACT', datasetCount: 2 } }).mockResolvedValue('ok')
    expect(await withImpactConfirmation(submit)).toBe('ok')
    expect(submit.mock.calls).toEqual([[false], [true]])
  })
  it('取消影响确认时不重试保存', async () => {
    confirm.mockRejectedValue('cancel')
    const submit = vi.fn().mockRejectedValue({ data: { warningType: 'DATASOURCE_IMPACT', datasetCount: 2 } })
    await expect(withImpactConfirmation(submit)).rejects.toBe('cancel')
    expect(submit).toHaveBeenCalledTimes(1)
  })
  it('普通失败不自动再次提交', async () => {
    const submit = vi.fn().mockRejectedValue({ msg: '连接失败' })
    await expect(withImpactConfirmation(submit)).rejects.toEqual({ msg: '连接失败' })
    expect(submit).toHaveBeenCalledTimes(1)
  })
})
