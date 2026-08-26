import type { ModelRef } from 'vue'
import type { VisVisualConfig } from '@/views/vis/shared/types'

function writeText(visual: VisVisualConfig, key: 'title' | 'description', value: string) {
  const text = value.trim()
  if (!text) {
    delete visual[key]
    return
  }
  visual[key] = text
}

function writeSwitch(visual: VisVisualConfig, key: 'showTitle' | 'showDescription', value: boolean) {
  if (value)
    visual[key] = true
  else
    delete visual[key]
}

/** 标题 / 备注各自开关；空与关均不落库 */
export function useVisualTitle(visual: ModelRef<VisVisualConfig>) {
  const showTitle = computed({
    get: () => !!visual.value.showTitle,
    set: (value: boolean) => {
      writeSwitch(visual.value, 'showTitle', value)
    },
  })

  const title = computed({
    get: () => visual.value.title ?? '',
    set: (value: string) => {
      writeText(visual.value, 'title', value)
    },
  })

  const showDescription = computed({
    get: () => !!visual.value.showDescription,
    set: (value: boolean) => {
      writeSwitch(visual.value, 'showDescription', value)
    },
  })

  const description = computed({
    get: () => visual.value.description ?? '',
    set: (value: string) => {
      writeText(visual.value, 'description', value)
    },
  })

  return { showTitle, title, showDescription, description }
}
