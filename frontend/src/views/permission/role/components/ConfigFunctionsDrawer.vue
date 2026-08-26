<!--
 * @Description: 角色配置菜单
-->
<script setup lang="ts">
import type { CustomDrawerProps } from '@/components/CustomDrawer.vue'
import type { MenuFunctionTreeInstance } from '@/views/permission/components/MenuFunctionTree.vue'
import { getRoleDetail, resetRoleFunctions } from '@/apis/admin/role'
import { showToast } from '@/utils/index'
import MenuFunctionTree from '@/views/permission/components/MenuFunctionTree.vue'

export interface ConfigFunctionsDrawerInstance {
  showDrawer: (row: ADMIN.RoleInfo) => void
}

const emits = defineEmits<{
  (e: 'fetchData'): void
}>()

const states = reactive({
  loading: false,
  roleId: '',
  roleName: '',
  checkedKeys: [] as string[],
})

const drawer = reactive<CustomDrawerProps>({
  visible: false,
  size: 'small',
  title: '配置功能',
  confirmLoading: false,
  handlerCancel: () => {
    drawer.visible = false
  },
  handlerConfirm: () => {
    doSubmit()
  },
})

const menuFunctionTreeRef = ref<MenuFunctionTreeInstance>()
let requestId = 0

function handleOpen() {
  fetchData()
}
function handleClose() {
  if (drawer.visible)
    return
  requestId += 1
  states.loading = false
  drawer.confirmLoading = false
  states.checkedKeys = []
}

function fetchData() {
  const currentRequestId = ++requestId
  states.loading = true
  getRoleDetail({ roleId: states.roleId })
    .then((res) => {
      if (currentRequestId === requestId)
        states.checkedKeys = (res.data?.menuIds ?? []).map(String)
    })
    .finally(() => {
      if (currentRequestId === requestId)
        states.loading = false
    })
}

function showDrawer(row: ADMIN.RoleInfo) {
  states.roleId = row.id || ''
  states.roleName = row.roleName || ''
  drawer.title = `${states.roleName}-配置功能`
  drawer.visible = true
}

function doSubmit() {
  const menuIds = (menuFunctionTreeRef.value?.getCheckedIds() ?? []) as string[]
  drawer.confirmLoading = true
  resetRoleFunctions({ roleId: states.roleId, menuIds })
    .then((res) => {
      showToast(res.msg, 'success')
      emits('fetchData')
      drawer.visible = false
    })
    .finally(() => {
      drawer.confirmLoading = false
    })
}

defineExpose({
  showDrawer,
})
</script>

<template>
  <CustomDrawer
    v-bind="{ ...drawer }"
    v-model.visible="drawer.visible"
    @opened="handleOpen"
    @closed="handleClose"
  >
    <template #custom-drawer-body>
      <el-scrollbar>
        <div v-spinner="states.loading" class="pl-10px pr-10px">
          <p class="hint">
            勾选菜单会选中其下全部功能点，保存只记录功能点
          </p>
          <MenuFunctionTree ref="menuFunctionTreeRef" :checked-keys="states.checkedKeys" />
        </div>
      </el-scrollbar>
    </template>
  </CustomDrawer>
</template>

<style scoped lang="scss">
.hint {
  margin: 0 0 12px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}
</style>
