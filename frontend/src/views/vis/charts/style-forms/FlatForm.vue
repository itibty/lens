<!--
 * @Description: 扁平配置表单容器（功能 / 样式 Tab，无折叠分组）
-->
<template>
  <div class="vis-style-form is-flat">
    <div class="vis-style-form__body">
      <slot />
    </div>
  </div>
</template>

<style lang="scss">
@use './vis-style-form.scss';
</style>
