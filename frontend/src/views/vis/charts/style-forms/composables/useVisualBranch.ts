import type { ModelRef } from 'vue'
import type { VisChartOptions, VisKpiOptions, VisNumberStyle, VisProgressOptions, VisRankOptions, VisRichtextConfig, VisTableStyle, VisTrendOptions, VisVisualConfig, VisWebConfig } from '@/views/vis/shared/types'

type BranchMap = {
  number: VisNumberStyle
  table: VisTableStyle
  chart: VisChartOptions
  progress: VisProgressOptions
  kpi: VisKpiOptions
  trend: VisTrendOptions
  rank: VisRankOptions
  richtext: VisRichtextConfig
  web: VisWebConfig
}

/**
 * visual.number / table / chart / progress / kpi / richtext / web 的读写辅助：
 * 与默认值相同时清字段，保持落库精简。
 */
export function useVisualBranch<K extends keyof BranchMap>(
  visual: ModelRef<VisVisualConfig>,
  key: K,
) {
  type Branch = BranchMap[K]

  function getBranch(): Branch | undefined {
    return visual.value[key] as Branch | undefined
  }

  function patch(partial: Partial<Branch>) {
    visual.value[key] = {
      ...getBranch(),
      ...partial,
    } as VisVisualConfig[K]
  }

  function clearKey(field: keyof Branch & string) {
    const cur = getBranch()
    if (!cur)
      return
    delete cur[field]
    if (!Object.keys(cur).length)
      delete visual.value[key]
  }

  function boolField(field: keyof Branch & string, defaultValue: boolean) {
    return computed({
      get: () => (getBranch()?.[field] as boolean | undefined) ?? defaultValue,
      set: (value: boolean) => {
        if (value === defaultValue)
          clearKey(field)
        else
          patch({ [field]: value } as Partial<Branch>)
      },
    })
  }

  function valueField<T>(field: keyof Branch & string, defaultValue: T) {
    return computed({
      get: () => (getBranch()?.[field] as T | undefined) ?? defaultValue,
      set: (value: T) => {
        if (value === defaultValue)
          clearKey(field)
        else
          patch({ [field]: value } as Partial<Branch>)
      },
    })
  }

  /** 空串 / null 视为清除 */
  function optionalStringField(field: keyof Branch & string) {
    return computed({
      get: () => getBranch()?.[field] as string | undefined,
      set: (value: string | null | undefined) => {
        if (!value) {
          clearKey(field)
          return
        }
        patch({ [field]: value } as Partial<Branch>)
      },
    })
  }

  return {
    patch,
    clearKey,
    boolField,
    valueField,
    optionalStringField,
  }
}
