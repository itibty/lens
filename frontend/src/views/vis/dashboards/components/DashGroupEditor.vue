<!--
 * @Description: 分组配置弹窗。确认后才写回画布。
-->
<script setup lang="ts">
import type { FormInstance, FormRules } from 'element-plus'
import type { DashGroupDraft, DashGroupMode } from '../dashLayout'
import type { VisCard } from '@/views/vis/shared/types'
import { emptyGroupDraft } from '../dashLayout'

const props = withDefaults(defineProps<{
  initial: DashGroupDraft
  cards: Record<string, VisCard>
  allowDelete?: boolean
  confirmLoading?: boolean
}>(), {
  allowDelete: false,
  confirmLoading: false,
})

const emit = defineEmits<{
  confirm: [draft: DashGroupDraft]
  remove: []
}>()

const visible = defineModel<boolean>('visible', { required: true })
const formRef = ref<FormInstance>()

const form = reactive<DashGroupDraft>(emptyGroupDraft())

const rules: FormRules<DashGroupDraft> = {
  title: [{ required: true, trigger: 'blur', message: '请填写标题' }],
}

function cardName(cardId: string) {
  return props.cards[cardId]?.name || cardId
}

function resetForm() {
  form.title = props.initial.title
  form.description = props.initial.description
  form.mode = props.initial.mode
  form.cardIds = [...props.initial.cardIds]
  form.bg = props.initial.bg || undefined
  form.color = props.initial.color || undefined
  form.showCardTitle = props.initial.showCardTitle !== false
  const titles: Record<string, string> = {}
  for (const cardId of form.cardIds)
    titles[cardId] = props.initial.tabTitles?.[cardId]?.trim() || cardName(cardId)
  form.tabTitles = titles
}

function collectTabTitles() {
  const titles: Record<string, string> = {}
  if (form.mode !== 'tabs')
    return titles
  for (const cardId of form.cardIds) {
    const typed = (form.tabTitles[cardId] ?? '').trim()
    if (typed && typed !== cardName(cardId))
      titles[cardId] = typed
  }
  return titles
}

function toDraft(): DashGroupDraft {
  return {
    title: form.title.trim(),
    description: form.description.trim(),
    mode: form.mode,
    cardIds: [...form.cardIds],
    tabTitles: collectTabTitles(),
    bg: form.bg?.trim() || undefined,
    color: form.color?.trim() || undefined,
    showCardTitle: form.showCardTitle,
  }
}

function handleCancel() {
  visible.value = false
}

function handleConfirm() {
  formRef.value?.validate((valid) => {
    if (!valid)
      return
    emit('confirm', toDraft())
  })
}

function onClosed() {
  formRef.value?.clearValidate()
}

watch(visible, (open) => {
  if (open)
    resetForm()
})

watch(
  () => form.mode,
  (mode) => {
    if (mode !== 'tabs')
      return
    const titles = { ...form.tabTitles }
    for (const cardId of form.cardIds) {
      if (!titles[cardId]?.trim())
        titles[cardId] = cardName(cardId)
    }
    form.tabTitles = titles
  },
)
</script>

<template>
  <CustomDialog
    v-model:visible="visible"
    :title="allowDelete ? '分组配置' : '添加分组'"
    size="mini"
    append-to-body
    destroy-on-close
    is-custom-footer
    @closed="onClosed"
  >
    <template #custom-dialog-body>
      <el-form
        ref="formRef"
        class="group-editor"
        :model="form"
        :rules="rules"
        label-position="top"
      >
        <el-form-item label="标题" prop="title">
          <el-input
            v-model="form.title"
            maxlength="30"
            clearable
            placeholder="请输入标题"
          />
        </el-form-item>
        <el-form-item label="说明" prop="description">
          <el-input
            v-model="form.description"
            type="textarea"
            :rows="3"
            maxlength="200"
            show-word-limit
            placeholder="可选"
          />
        </el-form-item>
        <el-form-item
          class="group-editor__inline"
          label="展示方式"
          prop="mode"
          label-position="left"
          label-width="6.5em"
        >
          <el-radio-group :model-value="form.mode" @update:model-value="form.mode = $event as DashGroupMode">
            <el-radio value="tile">
              平铺
            </el-radio>
            <el-radio value="tabs">
              标签
            </el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item v-if="form.mode === 'tabs' && form.cardIds.length" label="页签">
          <div class="group-editor__cards">
            <el-input
              v-for="cardId in form.cardIds"
              :key="cardId"
              v-model="form.tabTitles[cardId]"
              maxlength="20"
              placeholder="页签标题"
            />
          </div>
        </el-form-item>
        <el-row :gutter="16" class="group-editor__row">
          <el-col :span="8">
            <el-form-item
              class="group-editor__inline"
              label="子卡标题"
              prop="showCardTitle"
              label-position="left"
              label-width="5em"
            >
              <el-switch v-model="form.showCardTitle" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item
              class="group-editor__inline"
              label="背景色"
              prop="bg"
              label-position="left"
              label-width="5em"
            >
              <el-color-picker
                :model-value="form.bg || undefined"
                size="small"
                @update:model-value="form.bg = $event || undefined"
              />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item
              class="group-editor__inline"
              label="文字色"
              prop="color"
              label-position="left"
              label-width="5em"
            >
              <el-color-picker
                :model-value="form.color || undefined"
                size="small"
                @update:model-value="form.color = $event || undefined"
              />
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
    </template>
    <template #custom-dialog-footer>
      <div class="group-editor__footer">
        <el-button
          v-if="allowDelete"
          @click="emit('remove')"
        >
          解散分组
        </el-button>
        <div class="group-editor__footer-right">
          <el-button @click="handleCancel">
            取消
          </el-button>
          <el-button
            type="primary"
            :loading="confirmLoading"
            @click="handleConfirm"
          >
            确定
          </el-button>
        </div>
      </div>
    </template>
  </CustomDialog>
</template>

<style scoped lang="scss">
.group-editor {
  :deep(.el-form-item) {
    margin-bottom: 16px;
  }

  :deep(.el-form-item__label) {
    margin-bottom: 0;
    padding-bottom: 4px;
    height: auto;
    line-height: 1.2;
  }

  :deep(.el-form-item__label::after) {
    content: ':';
  }
}

.group-editor__row {
  :deep(.el-form-item) {
    margin-bottom: 0;
  }
}

.group-editor__inline {
  align-items: center;

  :deep(.el-form-item__label) {
    height: 32px;
    padding-bottom: 0;
    padding-right: 8px;
    justify-content: flex-start;
    text-align: left;
    line-height: 32px;
    white-space: nowrap;
  }

  :deep(.el-form-item__content) {
    margin-left: 0;
    min-height: 32px;
    display: flex;
    align-items: center;
  }
}

.group-editor__cards {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
}

.group-editor__footer {
  display: flex;
  align-items: center;
  width: 100%;
}

.group-editor__footer-right {
  display: flex;
  align-items: center;
  margin-left: auto;
}
</style>
