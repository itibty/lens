<script setup lang="ts">
import type { FormInstance, FormRules } from 'element-plus'
import { editMenu } from '@/apis/admin/menu'
import { normalizeMenuIconName } from '@/core/menuIcons'
import { showToast } from '@/utils/index'
import { isFunc, menuParentOptions } from '../menuAdmin'
import MenuIconPicker from './MenuIconPicker.vue'

const props = defineProps<{
  node: ADMIN.MenuTree
  menus: ADMIN.MenuTree[]
  canWrite?: boolean
}>()

const emits = defineEmits<{
  (e: 'saved', id?: string): void
}>()

const formRef = ref<FormInstance>()
const saving = ref(false)
const parentOptions = computed(() => menuParentOptions(props.menus, props.node.id))
const form = reactive<ADMIN.SaveMenuRequest>({
  id: undefined,
  pid: '0',
  menuName: '',
  menuType: 'MENU',
  routePath: '',
  icon: '',
  permCode: '',
  sortNum: 0,
  status: 'EBL',
})

const rules: FormRules<ADMIN.SaveMenuRequest> = {
  menuName: [{ required: true, trigger: 'blur', message: '请输入名称' }],
  pid: [{ required: true, trigger: 'change', message: '请选择上级菜单' }],
}

function fillForm(node: ADMIN.MenuTree) {
  Object.assign(form, {
    id: node.id,
    pid: node.pid ?? '0',
    menuName: node.menuName ?? '',
    menuType: node.menuType ?? 'MENU',
    routePath: node.routePath ?? '',
    icon: normalizeMenuIconName(node.icon),
    permCode: node.permCode ?? '',
    sortNum: node.sortNum ?? 0,
    status: node.status || 'EBL',
  })
  nextTick(() => formRef.value?.clearValidate())
}

watch(() => props.node, fillForm, { immediate: true })

async function save() {
  if (!props.canWrite || saving.value)
    return
  saving.value = true
  const editingId = form.id
  try {
    const valid = await formRef.value?.validate().catch(() => false)
    if (!valid || form.id !== editingId)
      return
    const payload = {
      ...form,
      menuType: isFunc(form) ? 'FUNC' : 'MENU',
      icon: normalizeMenuIconName(form.icon),
    } satisfies ADMIN.SaveMenuRequest
    await editMenu(payload)
    showToast('保存成功')
    emits('saved', payload.id)
  }
  finally {
    saving.value = false
  }
}
</script>

<template>
  <section class="menu-panel">
    <div class="menu-panel__head">
      <div class="menu-panel__title">
        基本信息
      </div>
      <el-button v-if="canWrite" type="primary" :loading="saving" @click="save">
        保存
      </el-button>
    </div>
    <el-form
      ref="formRef"
      :model="form"
      :rules="rules"
      :disabled="!canWrite || saving"
      label-width="88px"
      class="menu-detail-form"
    >
      <el-row :gutter="16">
        <el-col :sm="24" :md="12">
          <el-form-item label="名称" prop="menuName">
            <el-input v-model.trim="form.menuName" maxlength="50" clearable placeholder="名称" />
          </el-form-item>
        </el-col>
        <el-col :sm="24" :md="12">
          <el-form-item label="图标" prop="icon">
            <MenuIconPicker v-model="form.icon" />
          </el-form-item>
        </el-col>
        <el-col :sm="24" :md="12">
          <el-form-item label="上级菜单" prop="pid">
            <el-tree-select
              v-model="form.pid"
              class="w-full"
              :data="parentOptions"
              node-key="id"
              :props="{ label: 'menuName', children: 'children' }"
              placeholder="请选择上级菜单"
              check-strictly
              filterable
              default-expand-all
              :render-after-expand="false"
            />
          </el-form-item>
        </el-col>
        <el-col :sm="24" :md="12">
          <el-form-item label="排序" prop="sortNum">
            <el-input-number v-model="form.sortNum" :min="0" :max="9999" />
          </el-form-item>
        </el-col>
        <el-col :sm="24" :md="12">
          <el-form-item label="路由" prop="routePath">
            <el-input
              v-model.trim="form.routePath"
              maxlength="100"
              clearable
              placeholder="选填，如 /sys/users"
            />
          </el-form-item>
        </el-col>
        <el-col :sm="24" :md="12">
          <el-form-item label="权限码" prop="permCode">
            <el-input
              v-model.trim="form.permCode"
              maxlength="100"
              clearable
              placeholder="如 sys:user:query，可空"
            />
          </el-form-item>
        </el-col>
      </el-row>
    </el-form>
  </section>
</template>

<style scoped lang="scss">
.menu-detail-form {
  :deep(.el-form-item) {
    margin-bottom: 12px;
  }

  :deep(.el-col:last-child .el-form-item) {
    margin-bottom: 0;
  }
}
</style>
