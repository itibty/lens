<!--
 * @Author: Chuang
 * @Date: 2022-12-12 13:26:13
 * @LastEditTime: 2024-07-19 20:48:08
 * @LastEditors: Chuang
 * @Description: 表格表单: 多列表单 增删行
-->
<script setup lang="ts">
import type { TableInstance } from 'element-plus'
import Sortable from 'sortablejs'
import { toRaw } from 'vue'

export interface TableFormProps {
  modelValue?: any[] // 绑定数组
  addTemplate?: object // 增行数据模板
  placeholder?: string // 无数据占位文字
  dragSort?: boolean // 是否表格行拖拽
}

const props = withDefaults(defineProps<TableFormProps>(), {
  modelValue: () => {
    return []
  },
  addTemplate: () => {
    return {}
  },
  placeholder: '暂无数据',
  dragSort: false,
})

const emits = defineEmits<{
  (e: 'update:modelValue', modelValue: any[]): void
}>()

const states = reactive<{ data: any[], toggleIndex: number }>({
  data: [],
  toggleIndex: 0,
})

let syncingFromProps = false

function cloneRows(rows: any[] = []) {
  return rows.map(row => structuredClone(toRaw(row)))
}

function emitDataChange() {
  emits('update:modelValue', cloneRows(states.data))
}

watch(
  () => props.modelValue,
  (newAry) => {
    syncingFromProps = true
    states.data = cloneRows(newAry)
    nextTick(() => {
      syncingFromProps = false
    })
  },
  { immediate: true, deep: true },
)

watch(
  () => states.data,
  () => {
    if (!syncingFromProps)
      emitDataChange()
  },
  { deep: true },
)

const tableRef = ref<TableInstance>() // ref 必须和dom ref完全相同
let sortableInstance: Sortable | undefined

function destroySortable() {
  sortableInstance?.destroy()
  sortableInstance = undefined
}

function rowDrop() {
  destroySortable()
  const tbody = tableRef.value?.$el.querySelector(
    '.el-table__body-wrapper tbody',
  )
  if (!tbody)
    return

  sortableInstance = Sortable.create(tbody, {
    handle: '.move',
    animation: 300,
    ghostClass: 'ghost',
    onEnd({ newIndex, oldIndex }) {
      if (newIndex === undefined || oldIndex === undefined)
        return

      const tableData = states.data
      const currRow = tableData.splice(oldIndex, 1)[0]
      tableData.splice(newIndex, 0, currRow)
      states.toggleIndex += 1
      nextTick(() => {
        if (props.dragSort)
          rowDrop()
      })
    },
  })
}

function rowAdd() {
  const temp = structuredClone(toRaw(props.addTemplate))
  states.data.push(temp)
}
function rowDel(index: number) {
  states.data.splice(index, 1)
}

onMounted(() => {
  if (props.dragSort)
    rowDrop()
})

watch(
  () => props.dragSort,
  (dragSort) => {
    nextTick(() => {
      if (dragSort)
        rowDrop()
      else
        destroySortable()
    })
  },
)

onUnmounted(() => {
  destroySortable()
})
</script>

<template>
  <div class="na-form-table">
    <el-table
      ref="tableRef"
      :key="states.toggleIndex"
      :data="states.data"
      :border="true"
      :stripe="true"
    >
      <el-table-column type="index" width="50" fixed="left" align="center">
        <template #header>
          <el-button type="primary" size="small" circle @click="rowAdd">
            <el-icon>
              <i-ep-plus />
            </el-icon>
          </el-button>
        </template>
        <template #default="scope">
          <div class="na-form-table-handle">
            <span>{{ scope.$index + 1 }}</span>
            <el-button
              type="danger"
              size="small"

              circle plain
              @click="rowDel(scope.$index)"
            >
              <el-icon>
                <i-ep-minus />
              </el-icon>
            </el-button>
          </div>
        </template>
      </el-table-column>
      <el-table-column v-if="dragSort" label="" width="62" align="center">
        <template #default>
          <el-tag class="move" style="cursor: move">
            <el-icon>
              <i-ep-d-caret />
            </el-icon>
          </el-tag>
        </template>
      </el-table-column>
      <slot />
      <template #empty>
        {{ placeholder }}
      </template>
    </el-table>
  </div>
</template>

<style lang="scss" scoped>
.na-form-table {
  width: 100%;

  .na-form-table-handle {
    text-align: center;

    > span {
      display: inline-block;
    }
    button {
      display: none;
    }
  }

  .hover-row {
    .na-form-table-handle {
      > span {
        display: none;
      }
      button {
        display: inline-block;
      }
    }
  }
}
</style>
