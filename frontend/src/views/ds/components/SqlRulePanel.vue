<!--
 * @Description: Enjoy SQL 模板语法速查（弹窗嵌入）
-->
<script setup lang="ts">
interface DocRow {
  code: string
  desc: string
}

const CONSTANTS: DocRow[] = [
  { code: '#(NOW_TS)', desc: '13 位时间戳' },
  { code: '#(NOW_DT)', desc: 'yyyy-MM-dd HH:mm:ss' },
  { code: '#(USER_ID)', desc: '当前用户 ID' },
]

const METHODS: DocRow[] = [
  { code: '#(kit.isBlank(x))', desc: '为空（常用于 #if）' },
  { code: '#(kit.notBlank(x))', desc: '非空' },
]

const DIRECTIVES: DocRow[] = [
  { code: '#para(name)', desc: '绑定参数 → ?' },
  { code: '#para(list,"in")', desc: 'IN 列表 → (?,?,…)' },
  { code: '#para(name,"like")', desc: '两侧模糊 %name%' },
  { code: '#para(name,"like%")', desc: '前缀 name%' },
  { code: '#para(name,"%like")', desc: '后缀 %name' },
  { code: '#if / #else / #end', desc: '条件块' },
  { code: '#for(x : list) … #end', desc: '循环；可用 for.first' },
]

const EXAMPLE = `#if(kit.notBlank(name))
  and name = #para(name)
#end
#if(ids && !ids.isEmpty())
  and id in #para(ids,'in')
#end`
</script>

<template>
  <div class="sql-rule-doc">
    <p class="lead">
      输入 <code>#</code> 补全指令；常量/方法名可自动包成 <code>#(…)</code>
    </p>

    <div class="top-grid">
      <section class="panel">
        <h4 class="panel-title">
          常量
        </h4>
        <ul class="doc-list">
          <li v-for="row in CONSTANTS" :key="row.code">
            <code>{{ row.code }}</code>
            <span class="desc">{{ row.desc }}</span>
          </li>
        </ul>
      </section>

      <section class="panel">
        <h4 class="panel-title">
          方法
        </h4>
        <ul class="doc-list">
          <li v-for="row in METHODS" :key="row.code">
            <code>{{ row.code }}</code>
            <span class="desc">{{ row.desc }}</span>
          </li>
        </ul>
      </section>
    </div>

    <section class="panel">
      <h4 class="panel-title">
        指令
      </h4>
      <ul class="doc-list doc-list--wide">
        <li v-for="row in DIRECTIVES" :key="row.code">
          <code>{{ row.code }}</code>
          <span class="desc">{{ row.desc }}</span>
        </li>
      </ul>
    </section>

    <section class="panel">
      <h4 class="panel-title">
        示例
      </h4>
      <pre class="example"><code>{{ EXAMPLE }}</code></pre>
    </section>
  </div>
</template>

<style lang="scss" scoped>
$sql-doc-border: var(--el-border-color-lighter, #ebeef5);
$sql-doc-bg: var(--el-fill-color-blank, #fff);
$sql-doc-muted: var(--el-text-color-secondary, #909399);

.sql-rule-doc {
  display: flex;
  flex-direction: column;
  gap: 10px;
  box-sizing: border-box;
  color: var(--el-text-color-regular, #606266);
  font-size: 12px;
  line-height: 1.45;
}

.lead {
  margin: 0;
  color: $sql-doc-muted;
}

.top-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.panel {
  box-sizing: border-box;
  padding: 10px 12px;
  background: $sql-doc-bg;
  border: 1px solid $sql-doc-border;
  border-radius: 6px;
}

.panel-title {
  margin: 0 0 8px;
  font-size: 12px;
  font-weight: 600;
  color: var(--el-text-color-primary, #303133);
  line-height: 1;
}

.doc-list {
  margin: 0;
  padding: 0;
  list-style: none;

  li {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 8px;
    padding: 4px 0;

    & + li {
      border-top: 1px dashed $sql-doc-border;
    }
  }

  .desc {
    flex: 0 1 auto;
    color: $sql-doc-muted;
    text-align: right;
    white-space: nowrap;
  }

  &--wide li {
    .desc {
      flex: 0 0 42%;
    }

    code {
      flex: 1 1 auto;
    }
  }
}

code {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 12px;
  color: #c7254e;
  background: var(--el-fill-color-light, #f5f7fa);
  padding: 1px 5px;
  border-radius: 3px;
  word-break: break-all;
}

.example {
  margin: 0;
  padding: 8px 10px;
  background: var(--el-fill-color-light, #f5f7fa);
  border-radius: 4px;
  overflow-x: auto;

  code {
    display: block;
    padding: 0;
    background: transparent;
    color: var(--el-text-color-primary, #303133);
    line-height: 1.45;
    white-space: pre;
  }
}
</style>
