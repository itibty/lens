<!--
 * @Description: 文本卡模块列表
-->
<script setup lang="ts">
import type {
  VisCalloutModule,
  VisProgressModule,
  VisRichtextModule,
  VisStaticModule,
  VisStaticModuleType,
  VisStatModule,
  VisStatsModule,
  VisVisualConfig,
} from '@/views/vis/shared/types'
import draggable from 'vuedraggable'
import {
  createStaticModule,
  ensureRichtextModules,
  STATIC_MODULE_ADD,
  STATIC_MODULE_LABELS,
} from '@/views/vis/shared/staticModules'
import SimpleHtmlEditor from './SimpleHtmlEditor.vue'
import StaticCalloutModuleFields from './StaticCalloutModuleFields.vue'
import StaticProgressModuleFields from './StaticProgressModuleFields.vue'
import StaticStatModuleFields from './StaticStatModuleFields.vue'
import StaticStatsModuleFields from './StaticStatsModuleFields.vue'

const visual = defineModel<VisVisualConfig>('visual', { required: true })

watch(
  () => visual.value.chartType,
  (type) => {
    if (type === 'richtext')
      ensureRichtextModules(visual.value)
  },
  { immediate: true },
)

const modules = computed({
  get: () => visual.value.richtext?.modules ?? [],
  set: (next) => {
    if (visual.value.richtext)
      visual.value.richtext.modules = next
    else
      visual.value.richtext = { modules: next }
  },
})

function isRichtext(mod: VisStaticModule): mod is VisRichtextModule {
  return mod.type === 'richtext'
}

function isStat(mod: VisStaticModule): mod is VisStatModule {
  return mod.type === 'stat'
}

function isStats(mod: VisStaticModule): mod is VisStatsModule {
  return mod.type === 'stats'
}

function isProgress(mod: VisStaticModule): mod is VisProgressModule {
  return mod.type === 'progress'
}

function isCallout(mod: VisStaticModule): mod is VisCalloutModule {
  return mod.type === 'callout'
}

function moduleLabel(mod: VisStaticModule) {
  return STATIC_MODULE_LABELS[mod.type]
}

function addModule(type: string | number | object) {
  if (typeof type !== 'string')
    return
  if (!(type in STATIC_MODULE_LABELS))
    return
  ensureRichtextModules(visual.value)
  const list = visual.value.richtext?.modules
  if (!list)
    return
  list.push(createStaticModule(type as VisStaticModuleType))
}

function removeAt(index: number) {
  const list = visual.value.richtext?.modules
  if (!list)
    return
  list.splice(index, 1)
  if (!list.length)
    list.push(createStaticModule('richtext'))
}
</script>

<template>
  <div class="static-modules">
    <div class="static-modules__label">
      正文
    </div>
    <draggable
      v-model="modules"
      class="static-modules__list"
      handle=".static-mod__handle"
      :animation="180"
      item-key="_uid"
    >
      <template #item="{ element: mod, index }">
        <div class="static-mod">
          <div class="static-mod__head">
            <span
              class="static-mod__handle"
              title="拖动排序"
            >
              <span class="static-mod__handle-icon i-tabler-grip-vertical" />
            </span>
            <span class="static-mod__title">{{ moduleLabel(mod) }}</span>
            <button
              type="button"
              class="vis-icon-btn"
              title="删除模块"
              @click="removeAt(index)"
            >
              <span class="i-mingcute-close-line" />
            </button>
          </div>
          <SimpleHtmlEditor
            v-if="isRichtext(mod)"
            v-model="mod.html"
          />
          <StaticStatModuleFields
            v-else-if="isStat(mod)"
            v-model:visual="visual"
            :index="index"
          />
          <StaticStatsModuleFields
            v-else-if="isStats(mod)"
            v-model:visual="visual"
            :index="index"
          />
          <StaticProgressModuleFields
            v-else-if="isProgress(mod)"
            v-model:visual="visual"
            :index="index"
          />
          <StaticCalloutModuleFields
            v-else-if="isCallout(mod)"
            v-model:visual="visual"
            :index="index"
          />
        </div>
      </template>
    </draggable>
    <el-dropdown
      trigger="click"
      @command="addModule"
    >
      <el-button
        size="small"
        text
      >
        <span class="i-mingcute-add-line" />
        添加模块
      </el-button>
      <template #dropdown>
        <el-dropdown-menu>
          <el-dropdown-item
            v-for="item in STATIC_MODULE_ADD"
            :key="item.type"
            :command="item.type"
          >
            {{ item.label }}
          </el-dropdown-item>
        </el-dropdown-menu>
      </template>
    </el-dropdown>
  </div>
</template>

<style scoped lang="scss">
.static-modules {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 12px;
}

.static-modules__label {
  font-size: var(--vis-cfg-label-size, 12px);
  color: var(--vis-cfg-label-color, var(--el-text-color-regular));
}

.static-modules__list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.static-mod {
  padding: 8px 10px;
  border: 1px solid var(--el-border-color-extra-light);
  border-radius: 8px;
  background: var(--el-fill-color-lighter);
}

.static-mod__head {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 8px;
}

.static-mod__handle {
  flex-shrink: 0;
  width: 16px;
  height: 18px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  opacity: 0.45;
  cursor: grab;
  touch-action: none;

  &:hover {
    opacity: 0.8;
  }

  &:active {
    cursor: grabbing;
    opacity: 1;
  }
}

.static-mod__handle-icon {
  width: 14px;
  height: 14px;
  pointer-events: none;
}

.static-mod__title {
  flex: 1;
  min-width: 0;
  font-size: var(--vis-cfg-group-size, 12px);
  font-weight: var(--vis-cfg-group-weight, 500);
  color: var(--vis-cfg-group-color, var(--el-text-color-regular));
}
</style>
