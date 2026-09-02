<!--
 * @Description: 功能设置「格式」—— 只覆盖已添加指标的显示格式
-->
<script setup lang="ts">
import type { ResolvedFieldFormat } from '@/views/vis/shared/fieldStyle'
import type { VisFieldStyleRule, VisQueryConfig, VisVisualConfig } from '@/views/vis/shared/types'
import {
  buildFieldStyleCandidates,
  fieldStyleFromDraft,
  resolveMetricFormat,
  syncFieldStyles,
  unusedFieldStyleCandidates,
} from '@/views/vis/shared/fieldStyle'
import FieldPill from '../../cards/components/FieldPill.vue'
import NumberFormatFields from './NumberFormatFields.vue'
import StyleFormSection from './StyleFormSection.vue'

const SECTION = 'fieldStyle'

const props = defineProps<{
  query?: VisQueryConfig
}>()

const visual = defineModel<VisVisualConfig>('visual', { required: true })
const openSections = defineModel<(string | number)[]>('openSections', { required: true })
const drafts = reactive<Record<string, ResolvedFieldFormat>>({})
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
        drafts[cand.sourceUid] = { ...resolveMetricFormat(visual.value, cand.metric) }
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
  setRules([...rules.value, { sourceUid: cand.sourceUid, key: cand.key, kind: 'metric' }])
  pickKey.value = ''
}

function removeAt(index: number) {
  const item = rules.value[index]
  if (item?.sourceUid)
    delete drafts[item.sourceUid]
  const next = rules.value.slice()
  next.splice(index, 1)
  setRules(next)
}

function candidateOf(item: VisFieldStyleRule) {
  return (item.sourceUid ? candidateByUid.value.get(item.sourceUid) : undefined)
    ?? candidateByKey.value.get(item.key)
}

function writeDraft(sourceUid: string, format: ResolvedFieldFormat) {
  const cur = drafts[sourceUid]
  if (cur) {
    Object.assign(cur, format)
    return
  }
  drafts[sourceUid] = { ...format }
}

function openDraft(item: VisFieldStyleRule) {
  const cand = candidateOf(item)
  if (!cand)
    return
  writeDraft(cand.sourceUid, resolveMetricFormat(visual.value, cand.metric))
}

function confirmDraft(item: VisFieldStyleRule) {
  const cand = candidateOf(item)
  if (!cand)
    return
  const draft = drafts[cand.sourceUid]
  if (!draft)
    return
  setRules(rules.value.map(rule =>
    rule.sourceUid === cand.sourceUid || rule.key === cand.key
      ? fieldStyleFromDraft(cand, draft)
      : rule,
  ))
}

function formatRuleSubtitle(format: VisFieldStyleRule['format']) {
  if (!format)
    return '默认'
  const bits: string[] = []
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
    subtitle: formatRuleSubtitle(item.format),
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
