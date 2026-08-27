import type { MaybeRefOrGetter } from 'vue'
import { useDebounceFn } from '@vueuse/core'
import vis from '@/apis/vis/index'

const DATASET_OPTION_LIMIT = 50

export function useDatasetOptions(selectedId?: MaybeRefOrGetter<string | undefined>) {
  const datasets = ref<VIS.VisDatasetInfo[]>([])
  const loading = ref(false)
  let requestId = 0

  async function requestOptions(keyword: string, currentRequestId: number) {
    loading.value = true
    try {
      const selected = String(toValue(selectedId) || '').trim()
      const search = keyword.trim()
      const res = await vis.dataset.listDatasetOptions({
        ...(search ? { keyword: search } : {}),
        ...(selected ? { selectedId: selected } : {}),
        limit: DATASET_OPTION_LIMIT,
      })
      if (currentRequestId === requestId)
        datasets.value = res.data?.list ?? []
    }
    finally {
      if (currentRequestId === requestId)
        loading.value = false
    }
  }

  const debouncedRequest = useDebounceFn((keyword: string, currentRequestId: number) => {
    void requestOptions(keyword, currentRequestId)
  }, 250)

  function search(keyword: string) {
    const currentRequestId = ++requestId
    debouncedRequest(String(keyword || ''), currentRequestId)
  }

  function reload() {
    debouncedRequest.cancel()
    const currentRequestId = ++requestId
    void requestOptions('', currentRequestId)
  }

  watch(
    () => String(toValue(selectedId) || ''),
    reload,
    { immediate: true },
  )
  onScopeDispose(() => debouncedRequest.cancel())

  return { datasets, loading, search, reload }
}
