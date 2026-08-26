<!--
 * @Description: 指标对比配置的评估期 / 对比期预览
-->
<script setup lang="ts">
import { useDebounceFn } from '@vueuse/core'
import { previewDateWindow } from '@/apis/vis/query'
import { apiErrorMessage } from '@/views/vis/cards/cardApi'
import {
  formatContrastRange,
  toDateWindowRequest,
} from '@/views/vis/shared/contrastExp'

const props = defineProps<{
  valueExp?: VIS.ContrastConfig['valueExp']
  value?: unknown[]
  calcMethod?: VIS.ContrastConfig['calcMethod']
}>()

const loading = ref(false)
const error = ref('')
const preview = ref<VIS.DateWindowResponse | null>(null)
let seq = 0

const request = computed(() =>
  toDateWindowRequest(props.valueExp, props.value, props.calcMethod),
)

const currentText = computed(() => formatContrastRange(preview.value?.current))
const compareText = computed(() => formatContrastRange(preview.value?.compare))

const fetchPreview = useDebounceFn(async () => {
  const body = request.value
  if (!body) {
    seq += 1
    preview.value = null
    error.value = ''
    loading.value = false
    return
  }
  const id = ++seq
  loading.value = true
  try {
    const res = await previewDateWindow(body, { showErrorMessage: false })
    if (id !== seq)
      return
    preview.value = res.data ?? null
    error.value = preview.value ? '' : '暂无区间'
  }
  catch (e) {
    if (id !== seq)
      return
    preview.value = null
    error.value = apiErrorMessage(e, '区间预览失败')
  }
  finally {
    if (id === seq)
      loading.value = false
  }
}, 280)

watch(request, () => {
  void fetchPreview()
}, { deep: true, immediate: true })

onUnmounted(() => {
  seq += 1
})
</script>

<template>
  <div class="contrast-window">
    <div class="contrast-window__head">
      <span>区间预览</span>
      <span v-if="preview?.asOfDate" class="contrast-window__asof">
        基准 {{ preview.asOfDate }}
      </span>
      <span
        v-show="loading"
        class="i-svg-spinners-ring-resize contrast-window__spin"
      />
    </div>
    <div v-if="error" class="contrast-window__error">
      {{ error }}
    </div>
    <template v-else-if="currentText">
      <div class="contrast-window__row">
        <span class="contrast-window__k">评估期</span>
        <span class="contrast-window__v">{{ currentText }}</span>
      </div>
      <div v-if="compareText" class="contrast-window__row">
        <span class="contrast-window__k">对比期</span>
        <span class="contrast-window__v">{{ compareText }}</span>
      </div>
    </template>
    <div v-else class="contrast-window__empty">
      {{ request ? '正在计算区间…' : '评估期配齐后显示区间' }}
    </div>
  </div>
</template>

<style scoped lang="scss">
.contrast-window {
  margin-top: 10px;
  padding: 8px 10px;
  border-radius: 6px;
  background: var(--el-bg-color);
  font-size: 12px;
  line-height: 1.5;
  color: var(--el-text-color-secondary);

  &__head {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 4px;
    font-weight: 500;
    color: var(--el-text-color-regular);
  }

  &__asof {
    font-weight: 400;
    color: var(--el-text-color-placeholder);
  }

  &__spin {
    margin-left: auto;
    font-size: 14px;
    color: var(--el-color-primary);
  }

  &__row {
    display: flex;
    align-items: baseline;
    gap: 8px;
  }

  &__k {
    flex: 0 0 42px;
    color: var(--el-text-color-placeholder);
  }

  &__v {
    font-variant-numeric: tabular-nums;
    color: var(--el-text-color-regular);
    word-break: break-all;
  }

  &__error {
    color: var(--el-color-danger);
  }

  &__empty {
    color: var(--el-text-color-placeholder);
  }
}
</style>
