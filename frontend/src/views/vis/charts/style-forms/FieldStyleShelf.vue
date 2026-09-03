<!--
 * @Description: 功能设置「格式」—— 指标数字格式，以及表格 / 透视的单元格展示
-->
<script setup lang="ts">
import type { ResolvedFieldFormat } from '@/views/vis/shared/fieldStyle'
import type { VisFieldStyleRule, VisMetricCellVisual, VisQueryConfig, VisVisualConfig } from '@/views/vis/shared/types'
import {
  buildFieldStyleCandidates,
  fieldStyleFromDraft,
  resolveMetricFormat,
  suggestedFieldSuffix,
  syncFieldStyles,
  unusedFieldStyleCandidates,
} from '@/views/vis/shared/fieldStyle'
import FieldPill from '../../cards/components/FieldPill.vue'
import MetricProgressColorPicker from './MetricProgressColorPicker.vue'
import NumberFormatFields from './NumberFormatFields.vue'
import StyleFormLabel from './StyleFormLabel.vue'
import StyleFormSection from './StyleFormSection.vue'

const props = withDefaults(defineProps<{
  query?: VisQueryConfig
  /** 表格 / 透视允许选择整格百分比进度背景 */
  allowCellVisual?: boolean
}>(), {
  allowCellVisual: false,
})

interface FieldStyleDraft extends ResolvedFieldFormat {
  progressEnabled: boolean
  progressColor?: string
}

const SECTION = 'fieldStyle'

const visual = defineModel<VisVisualConfig>('visual', { required: true })
const openSections = defineModel<(string | number)[]>('openSections', { required: true })
const drafts = reactive<Record<string, FieldStyleDraft>>({})
const suggestedSuffixes = new Set<string>()
const pickKey = ref('')

const candidates = computed(() => buildFieldStyleCandidates(props.query?.metrics))
const rules = computed(() => visual.value.fieldStyles ?? [])
const unusedCandidates = computed(() => unusedFieldStyleCandidates(candidates.value, rules.value))
const candidateByUid = computed(() => new Map(candidates.value.map(item => [item.sourceUid, item])))
const candidateByKey = computed(() => new Map(candidates.value.map(item => [item.key, item])))

watch(
  candidates,
  (list) => {
    writeRules(syncFieldStyles(visual.value.fieldStyles, list))
  },
  { deep: true },
)

watch(unusedCandidates, (list) => {
  if (pickKey.value && !list.some(item => item.sourceUid === pickKey.value))
    pickKey.value = ''
})

watch(
  [rules, candidates],
  () => {
    const live = new Set<string>()
    for (const item of rules.value) {
      const cand = candidateOf(item)
      if (!cand)
        continue
      live.add(cand.sourceUid)
      if (!drafts[cand.sourceUid])
        drafts[cand.sourceUid] = draftOf(item, cand.metric)
    }
    for (const key of Object.keys(drafts)) {
      if (!live.has(key))
        delete drafts[key]
    }
  },
  { immediate: true },
)

function writeRules(synced: VisFieldStyleRule[]) {
  if (synced === visual.value.fieldStyles)
    return
  if (!synced.length)
    delete visual.value.fieldStyles
  else
    visual.value.fieldStyles = synced
}

function setRules(next: VisFieldStyleRule[]) {
  writeRules(syncFieldStyles(next, candidates.value))
}

function addField(sourceUid: string) {
  const cand = unusedCandidates.value.find(item => item.sourceUid === sourceUid)
  if (!cand)
    return
  if (!openSections.value.includes(SECTION))
    openSections.value = [...openSections.value, SECTION]
  const rule: VisFieldStyleRule = { sourceUid: cand.sourceUid, key: cand.key, kind: 'metric' }
  const suffix = suggestedFieldSuffix(cand.metric)
  if (suffix) {
    suggestedSuffixes.add(cand.sourceUid)
    drafts[cand.sourceUid] = draftOf(rule, cand.metric, true)
  }
  setRules([...rules.value, rule])
  pickKey.value = ''
}

function removeAt(index: number) {
  const item = rules.value[index]
  if (item?.sourceUid) {
    delete drafts[item.sourceUid]
    suggestedSuffixes.delete(item.sourceUid)
  }
  const next = rules.value.slice()
  next.splice(index, 1)
  setRules(next)
}

function candidateOf(item: VisFieldStyleRule) {
  return (item.sourceUid ? candidateByUid.value.get(item.sourceUid) : undefined)
    ?? candidateByKey.value.get(item.key)
}

function draftOf(item: VisFieldStyleRule, metric: VIS.MetricItem, useSuggestedSuffix = false): FieldStyleDraft {
  const cell = props.allowCellVisual ? item.cellVisual : undefined
  const format = resolveMetricFormat(visual.value, metric)
  return {
    ...format,
    suffix: useSuggestedSuffix ? suggestedFieldSuffix(metric) : format.suffix,
    progressEnabled: cell?.type === 'progress',
    progressColor: cell?.type === 'progress' ? cell.color : undefined,
  }
}

function openDraft(item: VisFieldStyleRule) {
  const cand = candidateOf(item)
  if (!cand)
    return
  drafts[cand.sourceUid] = draftOf(item, cand.metric, suggestedSuffixes.has(cand.sourceUid))
}

function confirmDraft(item: VisFieldStyleRule) {
  const cand = candidateOf(item)
  if (!cand)
    return
  const draft = drafts[cand.sourceUid]
  if (!draft)
    return
  const cellVisual: VisMetricCellVisual | undefined
    = props.allowCellVisual && draft.progressEnabled
      ? {
          type: 'progress',
          color: draft.progressColor,
        }
      : undefined
  setRules(rules.value.map(rule =>
    rule.sourceUid === cand.sourceUid || rule.key === cand.key
      ? fieldStyleFromDraft(cand, draft, cellVisual)
      : rule,
  ))
  suggestedSuffixes.delete(cand.sourceUid)
}

function formatRuleSubtitle(rule: VisFieldStyleRule) {
  const bits: string[] = []
  if (props.allowCellVisual && rule.cellVisual?.type === 'progress')
    bits.push('进度条')
  const { format } = rule
  if (!format)
    return bits.join(' · ') || '默认'
  if (format.decimals != null)
    bits.push(format.decimals === 'auto' ? '自动' : `${format.decimals}位`)
  if (format.prefix)
    bits.push(format.prefix)
  if (format.suffix)
    bits.push(format.suffix)
  if (format.compact)
    bits.push('万/亿')
  if (format.separator === false)
    bits.push('无千分位')
  return bits.join(' · ') || '默认'
}

const shelfRows = computed(() => rules.value.map((item, index) => {
  const cand = candidateOf(item)
  return {
    id: `${item.sourceUid || item.key}-${index}`,
    item,
    index,
    name: cand?.display || item.key,
    subtitle: formatRuleSubtitle(item),
    draft: cand ? drafts[cand.sourceUid] : undefined,
  }
}))

const emptyHint = computed(() =>
  candidates.value.length ? '未添加的字段用默认展示' : '请先添加指标',
)
</script>

<template>
  <StyleFormSection
    title="格式"
    :name="SECTION"
  >
    <template #extra>
      <el-select
        v-model="pickKey"
        class="field-style-shelf__pick"
        size="small"
        clearable
        filterable
        placeholder="添加字段"
        :disabled="!unusedCandidates.length"
        @change="addField"
      >
        <el-option
          v-for="item in unusedCandidates"
          :key="item.sourceUid"
          :label="item.display"
          :value="item.sourceUid"
        />
      </el-select>
    </template>

    <div class="field-style-shelf">
      <FieldPill
        v-for="row in shelfRows"
        :key="row.id"
        :name="row.name"
        :subtitle="row.subtitle"
        tone="filter"
        block
        @open="openDraft(row.item)"
        @confirm="confirmDraft(row.item)"
        @remove="removeAt(row.index)"
      >
        <div
          v-if="row.draft"
          class="vis-style-form"
        >
          <NumberFormatFields
            v-model:decimals="row.draft.decimals"
            v-model:prefix="row.draft.prefix"
            v-model:suffix="row.draft.suffix"
            v-model:separator="row.draft.separator"
            v-model:compact="row.draft.compact"
          />

          <template v-if="allowCellVisual">
            <div class="vis-style-form__row">
              <StyleFormLabel tip="在数字下层叠加整格数据条；原始数值按 0～100 映射">
                进度条
              </StyleFormLabel>
              <el-switch v-model="row.draft.progressEnabled" size="small" />
            </div>

            <div
              v-if="row.draft.progressEnabled"
              class="vis-style-form__row"
            >
              <StyleFormLabel>进度色</StyleFormLabel>
              <MetricProgressColorPicker v-model="row.draft.progressColor" />
            </div>
          </template>
        </div>
      </FieldPill>
      <p
        v-if="!rules.length"
        class="field-style-shelf__hint"
      >
        {{ emptyHint }}
      </p>
    </div>
  </StyleFormSection>
</template>

<style scoped lang="scss">
.field-style-shelf__pick {
  width: 120px;
}

.field-style-shelf {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;

  &__hint {
    margin: 0;
    font-size: var(--vis-cfg-hint-size, 12px);
    line-height: 1.35;
    color: var(--vis-cfg-hint-color, var(--el-text-color-placeholder));
  }
}
</style>
