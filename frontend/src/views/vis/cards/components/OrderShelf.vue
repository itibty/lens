<!--
 * @Description: 排序 — 只能选已投放的维度 / 指标；关闭 popover 时确认方向
-->
<script setup lang="ts">
import type { DimensionPill, MetricPill, OrderPill } from '@/views/vis/shared/dnd'
import draggable from 'vuedraggable'
import { buildOrderCandidates, createOrderPill, unusedOrderCandidates } from '../queryDependents'
import FieldPill from './FieldPill.vue'
import ShelfTitle from './ShelfTitle.vue'

const props = defineProps<{
  dimensions: DimensionPill[]
  metrics: MetricPill[]
  /** 透视：有排序时行/列跟查询遇见序，没写则按维值正序 */
  forPivot?: boolean
}>()

const orderList = defineModel<OrderPill[]>('orderList', { required: true })
const drafts = reactive<Record<string, { dir: 'asc' | 'desc' }>>({})
const pickKey = ref('')

const candidates = computed(() => buildOrderCandidates(props.dimensions, props.metrics))
const unusedCandidates = computed(() => unusedOrderCandidates(candidates.value, orderList.value))
const candidateByUid = computed(() => new Map(candidates.value.map(c => [c.sourceUid, c])))

watch(unusedCandidates, (list) => {
  if (pickKey.value && !list.some(c => c.sourceUid === pickKey.value))
    pickKey.value = ''
})

function addOrder(sourceUid: string) {
  const cand = unusedCandidates.value.find(c => c.sourceUid === sourceUid)
  if (!cand)
    return
  orderList.value = [...orderList.value, createOrderPill(cand)]
  pickKey.value = ''
}

function removeAt(index: number) {
  const item = orderList.value[index]
  if (item)
    delete drafts[item._uid]
  const next = orderList.value.slice()
  next.splice(index, 1)
  orderList.value = next
}

function openDraft(element: OrderPill) {
  drafts[element._uid] = { dir: element.dir === 'desc' ? 'desc' : 'asc' }
}

function confirmDraft(element: OrderPill) {
  const draft = drafts[element._uid]
  if (!draft)
    return
  element.dir = draft.dir
  delete drafts[element._uid]
}

function pillSubtitle(item: OrderPill) {
  return item.dir === 'desc' ? '降序' : '升序'
}

function candidateOf(item: OrderPill) {
  return item.sourceUid ? candidateByUid.value.get(item.sourceUid) : undefined
}

function pillTone(item: OrderPill) {
  return candidateOf(item)?.kind === 'metric' ? 'metric' : 'dimension'
}

function pillName(item: OrderPill) {
  return candidateOf(item)?.display || item.field
}

const emptyHint = computed(() =>
  candidates.value.length ? '选择已投放的维度或指标' : '请先添加维度或指标',
)

const tip = computed(() => props.forPivot
  ? '有排序时行、列按查询遇见顺序；没写排序时按维值正序'
  : undefined)
</script>

<template>
  <div class="shelf">
    <div class="shelf__head">
      <ShelfTitle :tip="tip">
        排序
      </ShelfTitle>
      <div class="shelf__extra">
        <el-select
          v-model="pickKey"
          class="pick"
          size="small"
          clearable
          filterable
          placeholder="添加字段"
          :disabled="!unusedCandidates.length"
          @change="addOrder"
        >
          <el-option
            v-for="c in unusedCandidates"
            :key="c.sourceUid"
            :label="c.display"
            :value="c.sourceUid"
          />
        </el-select>
      </div>
    </div>

    <div class="shelf__well">
      <draggable
        v-model="orderList"
        class="shelf__drop"
        :class="{ 'is-empty': !orderList.length }"
        handle=".field-pill__handle"
        :animation="180"
        item-key="_uid"
      >
        <template #item="{ element, index }">
          <div class="shelf__pill-wrap">
            <FieldPill
              :name="pillName(element)"
              :subtitle="pillSubtitle(element)"
              :tone="pillTone(element)"

              drag-handle block
              @open="openDraft(element)"
              @confirm="confirmDraft(element)"
              @remove="removeAt(index)"
            >
              <template v-if="drafts[element._uid]">
                <el-form label-position="top" size="small" @submit.prevent>
                  <el-form-item
                    label="方向"
                    label-position="left"
                    label-width="auto"
                  >
                    <el-radio-group v-model="drafts[element._uid].dir" size="small">
                      <el-radio-button value="asc">
                        升序
                      </el-radio-button>
                      <el-radio-button value="desc">
                        降序
                      </el-radio-button>
                    </el-radio-group>
                  </el-form-item>
                </el-form>
              </template>
            </FieldPill>
          </div>
        </template>
      </draggable>
      <div
        v-if="!orderList.length"
        class="shelf__hint"
      >
        {{ emptyHint }}
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.shelf {
  position: relative;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
  padding: 10px 12px 12px;
  margin-bottom: 12px;
  background: var(--vis-shelf-well, #eef3f8);

  &__head {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
  }

  &__extra {
    display: flex;
    align-items: center;
    gap: 4px;
    flex-shrink: 0;
  }

  &__well {
    position: relative;
  }

  &__drop {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 8px;
    border: 1px dashed var(--el-border-color);
    border-radius: 6px;
    background: #fff;

    &.is-empty {
      min-height: 44px;
    }
  }

  &__pill-wrap {
    width: 100%;
  }

  &__hint {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    padding: 0 16px;
    font-size: var(--vis-cfg-hint-size, 12px);
    color: var(--vis-cfg-hint-color, var(--el-text-color-placeholder));
    pointer-events: none;
  }
}

.pick {
  width: 130px;
}

:deep(.shelf-title) {
  flex: 1;
  width: auto;
  min-width: 0;
}

:deep(.sortable-ghost) {
  opacity: 0.4;
}
</style>
