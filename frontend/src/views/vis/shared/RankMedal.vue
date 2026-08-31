<script setup lang="ts">
import { useId } from 'vue'

defineProps<{
  rank: number
  tone: 'gold' | 'silver' | 'bronze'
}>()

const ribbonMaskId = `rank-medal-ribbon-${useId().replaceAll(':', '')}`
</script>

<template>
  <svg
    class="rank-medal"
    :class="`is-${tone}`"
    viewBox="0 0 48 58"
    fill="none"
    role="img"
    :aria-label="`第 ${rank} 名`"
  >
    <g opacity="0.9">
      <mask
        :id="ribbonMaskId"
        maskUnits="userSpaceOnUse"
        x="8"
        y="36"
        width="32"
        height="22"
      >
        <path
          d="M8 36.002v8.8a3.2 3.2 0 0 0 2.4 3.099v6.536a1.824 1.824 0 0 0 2.689 1.613l3.307-1.764a1.825 1.825 0 0 1 1.72 0l5.187 2.767a1.825 1.825 0 0 0 1.639.041l6.046-2.845a1.825 1.825 0 0 1 1.736.097l2.314 1.423a1.824 1.824 0 0 0 2.786-1.557v-6.377A3.2 3.2 0 0 0 40 44.802v-8.8H8Z"
          fill="white"
        />
      </mask>
      <g :mask="`url(#${ribbonMaskId})`">
        <rect class="ribbon-dark" x="10.285" y="35.927" width="5.485" height="21.482" />
        <rect class="ribbon-main" x="4.8" y="36.001" width="5.6" height="21.6" />
        <rect class="ribbon-main" x="15.77" y="35.927" width="5.485" height="21.482" />
        <rect class="ribbon-dark" x="21.255" y="35.927" width="5.485" height="21.482" />
        <rect class="ribbon-main" x="26.739" y="35.927" width="5.485" height="21.482" />
        <rect class="ribbon-dark" x="32.224" y="35.927" width="5.596" height="21.482" />
        <path class="ribbon-main" d="M37.824 36.001H43.2v21.6h-5.376z" />
      </g>
    </g>
    <path
      class="medal-main"
      d="M12.002 3.219C23.479-3.407 38.155.525 44.781 12.002c6.627 11.477 2.694 26.152-8.783 32.779-11.477 6.626-26.153 2.694-32.779-8.783C-3.407 24.521.525 9.845 12.002 3.219Z"
    />
    <path
      class="medal-light"
      fill-rule="evenodd"
      clip-rule="evenodd"
      d="M40.823 33.713c-5.364 9.29-17.245 12.474-26.536 7.11-9.29-5.364-12.474-17.245-7.11-26.536C12.541 4.996 24.422 1.813 33.713 7.177c9.29 5.364 12.474 17.245 7.11 26.536Zm3.958 2.285c-6.626 11.477-21.302 15.41-32.779 8.783C.525 38.155-3.407 23.479 3.219 12.002 9.845.525 24.521-3.407 35.998 3.219c11.477 6.626 15.41 21.302 8.783 32.779Z"
    />
    <circle class="medal-light" cx="24" cy="24" r="13.141" />
    <text
      class="medal-number"
      x="24"
      y="29"
      text-anchor="middle"
      font-size="14"
      font-weight="800"
    >{{ rank }}</text>
  </svg>
</template>

<style scoped>
.rank-medal {
  --medal-main: #c0c8d0;
  --medal-dark: #88929a;
  --medal-light: #d8e2ea;

  display: block;
  width: 100%;
  height: auto;
  overflow: visible;
}

.rank-medal.is-gold {
  --medal-main: #ffbd29;
  --medal-dark: #a96808;
  --medal-light: #ffda6a;
}

.rank-medal.is-bronze {
  --medal-main: #cd7f32;
  --medal-dark: #814714;
  --medal-light: #e4a568;
}

.ribbon-main,
.medal-main {
  fill: var(--medal-main);
}

.ribbon-dark,
.medal-number {
  fill: var(--medal-dark);
}

.medal-light {
  fill: var(--medal-light);
}
</style>
