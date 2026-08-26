<script setup lang="ts" name="Page404">
const state = reactive({
  jumpTime: 20,
  oops: '抱歉!',
  headline: '当前页面不存在...',
  info: '请检查您输入的网址是否正确，或点击下面的按钮返回首页。',
  btn: '返回首页',
})

let timer: ReturnType<typeof setInterval> | undefined

function clearTimer() {
  if (!timer)
    return

  clearInterval(timer)
  timer = undefined
}

function timeChange() {
  timer = setInterval(() => {
    if (state.jumpTime) {
      state.jumpTime--
    }
    else {
      goHome()
    }
  }, 1000)
}

const router = useRouter()
function goHome() {
  clearTimer()
  router.push({ name: 'Index' })
}

onMounted(() => {
  timeChange()
})
onBeforeUnmount(() => {
  clearTimer()
})
</script>

<template>
  <div class="error-container">
    <div class="error-content">
      <el-row :gutter="20">
        <el-col :xs="24" :sm="24" :md="12" :lg="12" :xl="12">
          <div class="pic-error">
            <img
              alt="401"
              class="pic-error-parent"
              src="@/assets/images/error/404.png"
            >
            <img
              alt="401"
              class="left pic-error-child"
              src="@/assets/images/error/cloud.png"
            >
            <img
              alt="401"
              class="pic-error-child"
              src="@/assets/images/error/cloud.png"
            >
            <img
              alt="401"
              class="pic-error-child"
              src="@/assets/images/error/cloud.png"
            >
          </div>
        </el-col>

        <el-col :xs="24" :sm="24" :md="12" :lg="12" :xl="12">
          <div class="bullshit">
            <div class="bullshit-oops">
              {{ state.oops }}
            </div>
            <div class="bullshit-headline">
              {{ state.headline }}
            </div>
            <div class="bullshit-info">
              {{ state.info }}
            </div>
            <div class="bullshit-return-home" @click="goHome">
              {{ state.jumpTime }}s&nbsp;{{ state.btn }}
            </div>
          </div>
        </el-col>
      </el-row>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.error-container {
  position: absolute;
  top: 40%;
  left: 50%;
  transform: translate(-50%, -50%);

  .error-content {
    .pic-error {
      position: relative;
      float: left;
      width: 120%;
      overflow: hidden;

      &-parent {
        width: 100%;
      }

      &-child {
        position: absolute;

        &.left {
          top: 17px;
          left: 220px;
          width: 80px;
          opacity: 0;
          animation-name: cloudLeft;
          animation-duration: 2s;
          animation-timing-function: linear;
          animation-delay: 1s;
          animation-fill-mode: forwards;
        }

        &.mid {
          top: 10px;
          left: 420px;
          width: 46px;
          opacity: 0;
          animation-name: cloudMid;
          animation-duration: 2s;
          animation-timing-function: linear;
          animation-delay: 1.2s;
          animation-fill-mode: forwards;
        }

        &.right {
          top: 100px;
          left: 500px;
          width: 62px;
          opacity: 0;
          animation-name: cloudRight;
          animation-duration: 2s;
          animation-timing-function: linear;
          animation-delay: 1s;
          animation-fill-mode: forwards;
        }

        @keyframes cloudLeft {
          0% {
            top: 17px;
            left: 220px;
            opacity: 0;
          }

          20% {
            top: 33px;
            left: 188px;
            opacity: 1;
          }

          80% {
            top: 81px;
            left: 92px;
            opacity: 1;
          }

          100% {
            top: 97px;
            left: 60px;
            opacity: 0;
          }
        }

        @keyframes cloudMid {
          0% {
            top: 10px;
            left: 420px;
            opacity: 0;
          }

          20% {
            top: 40px;
            left: 360px;
            opacity: 1;
          }

          70% {
            top: 130px;
            left: 180px;
            opacity: 1;
          }

          100% {
            top: 160px;
            left: 120px;
            opacity: 0;
          }
        }

        @keyframes cloudRight {
          0% {
            top: 100px;
            left: 500px;
            opacity: 0;
          }

          20% {
            top: 120px;
            left: 460px;
            opacity: 1;
          }

          80% {
            top: 180px;
            left: 340px;
            opacity: 1;
          }

          100% {
            top: 200px;
            left: 300px;
            opacity: 0;
          }
        }
      }
    }

    .bullshit {
      position: relative;
      float: left;
      width: 300px;
      padding: 30px 0;
      overflow: hidden;

      &-oops {
        margin-bottom: 20px;
        color: var(--el-color-primary);
        font-weight: bold;
        font-size: 32px;
        line-height: 40px;
        opacity: 0;
        animation-name: slideUp;
        animation-duration: 0.5s;
        animation-fill-mode: forwards;
      }

      &-headline {
        margin-bottom: 10px;
        color: #222;
        font-weight: bold;
        font-size: 20px;
        line-height: 24px;
        opacity: 0;
        animation-name: slideUp;
        animation-duration: 0.5s;
        animation-delay: 0.1s;
        animation-fill-mode: forwards;
      }

      &-info {
        margin-bottom: 30px;
        color: var(--el-color-info);
        font-size: 13px;
        line-height: 21px;
        opacity: 0;
        animation-name: slideUp;
        animation-duration: 0.5s;
        animation-delay: 0.2s;
        animation-fill-mode: forwards;
      }

      &-return-home {
        display: block;
        float: left;
        width: 110px;
        height: 36px;
        color: #fff;
        font-size: 14px;
        line-height: 36px;
        text-align: center;
        background: var(--el-color-primary);
        border-radius: 100px;
        cursor: pointer;
        opacity: 0;
        animation-name: slideUp;
        animation-duration: 0.5s;
        animation-delay: 0.3s;
        animation-fill-mode: forwards;
      }

      @keyframes slideUp {
        0% {
          transform: translateY(60px);
          opacity: 0;
        }

        100% {
          transform: translateY(0);
          opacity: 1;
        }
      }
    }
  }
}
</style>
