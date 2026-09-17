<script setup lang="ts">
import type { DashCardDisplay } from '../dashCardDisplay'

const props = defineProps<{ initial?: DashCardDisplay }>()
const emit = defineEmits<{ confirm: [value: DashCardDisplay] }>()
const visible = defineModel<boolean>('visible', { default: false })
type Mode = 'follow' | 'custom' | 'hidden'
const fields = [{ key: 'title', label: '标题', max: 50 }, { key: 'description', label: '备注', max: 200 }] as const
const modes = reactive<Record<'title' | 'description', Mode>>({ title: 'follow', description: 'follow' })
const text = reactive({ title: '', description: '' })
const submitted = ref(false)
watch(visible, (open) => {
  if (!open)
    return
  submitted.value = false
  for (const { key } of fields) {
    const value = props.initial?.[key]
    modes[key] = value === null ? 'hidden' : typeof value === 'string' ? 'custom' : 'follow'
    text[key] = value ?? ''
  }
})
function reset() {
  for (const { key } of fields) {
    modes[key] = 'follow'
    text[key] = ''
  }
}
function confirm() {
  submitted.value = true
  if (fields.some(({ key }) => modes[key] === 'custom' && !text[key].trim()))
    return
  const value: DashCardDisplay = {}
  for (const { key } of fields) {
    if (modes[key] === 'hidden')
      value[key] = null
    if (modes[key] === 'custom')
      value[key] = text[key].trim()
  }
  emit('confirm', value)
  visible.value = false
}
</script>

<template>
  <CustomDialog v-model:visible="visible" title="显示设置" size="mini" append-to-body :handler-cancel="() => visible = false" :handler-confirm="confirm">
    <template #custom-dialog-body>
      <el-form label-position="top">
        <el-form-item v-for="field in fields" :key="field.key" :label="field.label" :error="submitted && modes[field.key] === 'custom' && !text[field.key].trim() ? `请填写${field.label}` : ''">
          <div class="display-field">
            <el-radio-group v-model="modes[field.key]" size="small">
              <el-radio-button value="follow">
                跟随卡片
              </el-radio-button>
              <el-radio-button value="custom">
                自定义
              </el-radio-button>
              <el-radio-button value="hidden">
                隐藏
              </el-radio-button>
            </el-radio-group>
            <el-input v-if="modes[field.key] === 'custom'" v-model="text[field.key]" :type="field.key === 'description' ? 'textarea' : 'text'" :rows="3" :maxlength="field.max" show-word-limit :placeholder="field.label" />
          </div>
        </el-form-item>
        <el-button text size="small" @click="reset">
          恢复默认
        </el-button>
      </el-form>
    </template>
  </CustomDialog>
</template>

<style scoped>
.display-field {
  display: grid;
  gap: 12px;
  width: 100%;
}
</style>
