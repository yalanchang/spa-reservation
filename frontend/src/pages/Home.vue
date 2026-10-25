<template>
  <div>
    <!-- 活動消息：一次一則，停留後快速切換下一則；細條貼在導覽列下方 -->
    <section
      v-if="marqueeWords.length"
      class="full-bleed -mt-8 bg-primary-100/70"
      aria-label="活動消息"
      @mouseenter="promoPaused = true"
      @mouseleave="promoPaused = false"
    >
      <div class="relative h-7 overflow-hidden" aria-live="polite">
        <Transition name="promo">
          <p
            :key="promoIndex"
            class="absolute inset-0 flex items-center justify-center whitespace-nowrap px-4 text-xs font-medium tracking-wide text-primary-600"
          >
            <span class="mr-2 text-primary-400" aria-hidden="true">{{
              PROMO_SYMBOLS[promoIndex % PROMO_SYMBOLS.length]
            }}</span>
            {{ marqueeWords[promoIndex % marqueeWords.length] }}
            <span class="ml-2 text-primary-400" aria-hidden="true">{{
              PROMO_SYMBOLS[promoIndex % PROMO_SYMBOLS.length]
            }}</span>
          </p>
        </Transition>
      </div>
    </section>

    <div class="space-y-20 sm:space-y-28">
      <!-- 主視覺：滿版粉色底，緊貼跑馬燈；桌機一個畫面內看得到完整照片 -->
      <section
        class="full-bleed relative flex items-center overflow-hidden bg-primary-50 py-10 sm:py-12 lg:min-h-[calc(100svh-4rem-1.75rem)]"
        :class="{ '-mt-8': !marqueeWords.length }"
        @mousemove="onMouseMove"
        @mouseleave="mouse = { x: 0, y: 0 }"
      >
        <div
          class="container relative mx-auto grid items-center gap-10 px-6 sm:px-12 lg:grid-cols-[auto_auto] lg:justify-center lg:gap-20 xl:gap-28"
        >
          <div class="text-center lg:text-left">
            <p class="text-sm font-semibold tracking-[0.2em] text-primary-500">K-BEAUTY SPA</p>
            <h1 class="mt-5 text-4xl font-extrabold leading-tight text-cocoa sm:text-5xl">
              把疲憊交給我們<br />
              把<span class="text-primary-600">美麗</span>留給自己
            </h1>
            <p class="mt-6 text-base text-gray-500 sm:text-lg">韓式肌膚管理與身體舒壓療程</p>
            <div class="mt-8 flex flex-col justify-center gap-3 sm:flex-row lg:justify-start">
              <router-link to="/booking" class="btn-cute text-lg">立即預約</router-link>
              <router-link to="/services" class="btn-cute-outline text-lg">服務項目</router-link>
            </div>
          </div>

          <!-- 照片牌組：自動輪播，滑過展開、點擊切換 -->
          <!-- 桌機兩欄靠中間；照片寬度跟著螢幕高度縮，照片加進度點不超出一個畫面 -->
          <div class="relative mx-auto w-full max-w-md lg:w-[min(28rem,calc((100svh-13rem)*0.8))]">
            <div
              class="relative aspect-[4/5] w-full transition-transform duration-300 ease-out"
              :style="deckTilt"
              @mouseenter="deckHover = true"
              @mouseleave="deckHover = false"
            >
              <button
                v-for="(photo, i) in heroPhotos"
                :key="photo.src"
                type="button"
                class="absolute inset-0 overflow-hidden rounded-[2.5rem] shadow-soft-lg transition-all duration-700 ease-[cubic-bezier(0.34,1.4,0.64,1)]"
                :class="i === active ? 'cursor-default' : 'cursor-pointer'"
                :style="cardStyle(i)"
                :aria-label="`顯示${photo.label}`"
                @click="active = i"
              >
                <img :src="photo.src" :alt="photo.label" class="h-full w-full object-cover" />
              </button>
            </div>

            <!-- 進度點 -->
            <div class="mt-6 flex justify-center gap-2">
              <button
                v-for="(photo, i) in heroPhotos"
                :key="photo.src"
                type="button"
                class="h-2 rounded-full transition-all duration-300"
                :class="i === active ? 'w-8 bg-primary-500' : 'w-2 bg-primary-200'"
                :aria-label="`切換到${photo.label}`"
                @click="active = i"
              ></button>
            </div>
          </div>
        </div>
      </section>

      <!-- 我們的堅持：左邊照片，右邊條列 -->
      <section class="grid items-center gap-10 lg:grid-cols-[1fr_1.1fr] lg:gap-16">
        <img
          v-reveal
          src="/images/home/why-us.jpg"
          alt="毛巾、保養品與粉色鬱金香"
          class="aspect-[4/3] w-full rounded-[2rem] object-cover"
        />
        <div>
          <div v-reveal>
            <p class="text-sm font-semibold tracking-[0.2em] text-primary-500">WHY US</p>
            <h2 class="mt-2 text-3xl font-bold text-cocoa">我們的堅持</h2>
            <p class="mt-3 text-gray-500">從進門到離開，每個細節都為了讓你真正放鬆</p>
          </div>
          <ol class="mt-8 divide-y divide-primary-100 border-y border-primary-100">
            <li v-for="(feature, i) in features" :key="feature.title" v-reveal="i * 120" class="flex gap-5 py-6">
              <span class="w-10 shrink-0 text-2xl font-extrabold text-primary-300">0{{ i + 1 }}</span>
              <div>
                <h3 class="text-lg font-bold text-cocoa">{{ feature.title }}</h3>
                <p class="mt-1 leading-relaxed text-gray-500">{{ feature.description }}</p>
              </div>
            </li>
          </ol>
        </div>
      </section>

      <!-- 依心情探索療程 -->
      <section>
        <div v-reveal class="text-center">
          <p class="text-sm font-semibold tracking-[0.2em] text-primary-500">FIND YOUR CARE</p>
          <h2 class="mt-2 text-3xl font-bold text-cocoa">今天，想怎麼照顧自己？</h2>
          <p class="mt-3 text-gray-500">依照你現在的感受，找到適合的照顧方式</p>
        </div>

        <!-- 依心情探索：四張照片對應四個分類，點了帶到服務項目並篩好分類 -->
        <div v-if="careMoods.length" v-reveal class="mt-10 grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
          <router-link
            v-for="mood in careMoods"
            :key="mood.categoryId"
            :to="{ path: '/services', query: { category: mood.categoryId } }"
            class="group relative aspect-[3/4] overflow-hidden rounded-3xl"
          >
            <img :src="mood.image" :alt="mood.category" class="h-full w-full object-cover" />
            <div
              class="absolute bottom-3 left-3 right-3 rounded-2xl bg-white/95 px-4 py-3 sm:bottom-4 sm:left-4 sm:right-4"
            >
              <p class="font-bold text-cocoa transition-colors group-hover:text-primary-600 sm:text-lg">
                {{ mood.title }}
              </p>
              <p class="mt-0.5 text-xs text-gray-500 sm:text-sm">{{ mood.line }}</p>
            </div>
          </router-link>
        </div>
      </section>

      <!-- 預約流程 -->
      <section>
        <div v-reveal class="text-center">
          <p class="text-sm font-semibold tracking-[0.2em] text-primary-500">HOW IT WORKS</p>
          <h2 class="mt-2 text-3xl font-bold text-cocoa">預約流程</h2>
        </div>
        <div class="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-3">
          <div v-for="(step, i) in steps" :key="step.title" v-reveal="i * 120" class="text-center">
            <div
              class="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary-600 text-lg font-bold text-white shadow-soft"
            >
              {{ i + 1 }}
            </div>
            <h3 class="mt-4 text-lg font-bold text-cocoa">{{ step.title }}</h3>
            <p class="mt-1 text-sm text-gray-500">{{ step.description }}</p>
          </div>
        </div>
      </section>

      <!-- 行動呼籲 -->
      <section v-reveal>
        <div class="group relative overflow-hidden rounded-4xl">
          <img src="/images/home/space.jpg" alt="舒適的護理空間" class="absolute inset-0 h-full w-full object-cover" />
          <div class="absolute inset-0 bg-cocoa/55"></div>
          <div class="relative px-8 py-16 text-center text-white sm:px-14 sm:py-20 sm:text-left">
            <h2 class="text-2xl font-bold sm:text-3xl">今天，就來好好寵愛自己</h2>
            <p class="mt-2 text-white/85">線上選好時段，到店立即享受</p>
            <router-link
              to="/booking"
              class="mt-8 inline-flex rounded-full bg-white px-7 py-3 font-semibold text-primary-600 shadow-soft transition active:scale-95 hover:font-bold"
            >
              馬上預約
            </router-link>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import apiClient from '@/api/client'
import { useServicesStore } from '@/stores/services'

const servicesStore = useServicesStore()
// 依心情探索：每個分類配一句感受與一張照片，沒列到的分類用預設文案
const MOOD_COPY: Record<string, { title: string; line: string; image: string }> = {
  身體按摩: { title: '想好好放鬆', line: '精油與熱石，卸下一身緊繃', image: '/images/services/oil-massage.jpg' },
  臉部護理: { title: '想讓肌膚喘口氣', line: '清潔、保濕，找回透亮', image: '/images/services/facial-basic.jpg' },
  美體課程: { title: '想煥然一新', line: '去角質與岩盤浴，身體輕盈', image: '/images/services/body-scrub.jpg' },
  手足護理: { title: '想寵愛自己', line: '手足保養，從細節開始', image: '/images/services/hand-care.jpg' }
}

const careMoods = computed(() => {
  const seen = new Map<number, string>()
  for (const s of servicesStore.services) {
    if (!seen.has(s.category_id)) seen.set(s.category_id, s.category_name || '')
  }
  return [...seen.entries()].slice(0, 4).map(([categoryId, category]) => ({
    categoryId,
    category,
    ...(MOOD_COPY[category] || { title: category, line: '看看這個分類的療程', image: '/images/home/hero-main.jpg' })
  }))
})

onMounted(() => {
  // 每次進首頁都重新抓，評分才會是最新的
  servicesStore.fetchServices()
})

// 滑鼠位置：x、y 介於 -1 到 1，給照片牌組傾斜用
const mouse = ref({ x: 0, y: 0 })
const onMouseMove = (e: MouseEvent) => {
  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
  mouse.value = {
    x: ((e.clientX - rect.left) / rect.width - 0.5) * 2,
    y: ((e.clientY - rect.top) / rect.height - 0.5) * 2
  }
}

// 主視覺照片牌組
const heroPhotos = [
  { src: '/images/home/hero-main.jpg', label: '臉部護理' },
  { src: '/images/services/oil-massage.jpg', label: '精油按摩' },
  { src: '/images/services/hot-stone.jpg', label: '熱石按摩' },
  { src: '/images/services/hand-care.jpg', label: '手部保養' }
]
const active = ref(0)
const deckHover = ref(false)

// 牌組跟著滑鼠微微傾斜
const deckTilt = computed(() => ({
  transform: `perspective(1200px) rotateY(${mouse.value.x * 6}deg) rotateX(${-mouse.value.y * 6}deg)`
}))

// 依與目前照片的距離決定位置：0 在最前面，1、2 在後面左右交錯，3 藏在最後
const cardStyle = (i: number) => {
  const offset = (i - active.value + heroPhotos.length) % heroPhotos.length
  const spread = deckHover.value ? 1.8 : 1
  const layouts = [
    { x: 0, rotate: 0, scale: 1, opacity: 1 },
    { x: 34, rotate: 6, scale: 0.92, opacity: 1 },
    { x: -34, rotate: -6, scale: 0.86, opacity: 1 },
    { x: 0, rotate: 0, scale: 0.8, opacity: 0 }
  ]
  const l = layouts[offset]
  return {
    transform: `translateX(${l.x * spread}px) rotate(${l.rotate * spread}deg) scale(${l.scale})`,
    opacity: l.opacity,
    zIndex: heroPhotos.length - offset
  }
}

// 活動消息每 3.5 秒換下一則，滑鼠停在上面時暫停
const promoIndex = ref(0)
const promoPaused = ref(false)
let promoTimer: ReturnType<typeof setInterval> | undefined

// 每 4 秒換下一張，滑鼠停在牌組上時暫停
let timer: ReturnType<typeof setInterval> | undefined
onMounted(() => {
  // 活動消息一律輪流顯示（減少動態效果時只是不播滑動動畫）
  promoTimer = setInterval(() => {
    if (!promoPaused.value && marqueeWords.value.length)
      promoIndex.value = (promoIndex.value + 1) % marqueeWords.value.length
  }, 3500)
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  timer = setInterval(() => {
    if (!deckHover.value) active.value = (active.value + 1) % heroPhotos.length
  }, 4000)
})
onUnmounted(() => {
  clearInterval(timer)
  clearInterval(promoTimer)
})

// 每則活動前後的裝飾符號，依序輪替
const PROMO_SYMBOLS = ['✦', '♡', '✿', '★', '❀']

// 活動消息：在後台「跑馬燈公告」管理
const marqueeWords = ref<string[]>([])
onMounted(async () => {
  try {
    const res = (await apiClient.get('/site/announcements')) as any
    marqueeWords.value = (res.data || []).map((a: any) => a.content)
  } catch {
    // 載入失敗就不顯示跑馬燈
  }
})

const features = [
  { title: '專業手技', description: '美容師皆受過完整訓練，依你的膚況與身體狀態調整力道與流程。' },
  { title: '溫和用品', description: '選用溫和、低刺激的保養品，敏感肌也能安心享受。' },
  { title: '獨立空間', description: '每位顧客皆使用獨立包廂，柔和燈光與安靜環境，專心放鬆。' }
]

const steps = [
  { title: '選擇療程', description: '瀏覽服務項目，挑選適合的療程' },
  { title: '預約時段', description: '選擇美容師、日期與時段' },
  { title: '到店體驗', description: '準時到店，其餘交給我們' }
]
</script>

<style scoped>
/* 活動消息：舊的往左滑出、新的從右邊滑入 */
.promo-enter-active,
.promo-leave-active {
  transition:
    transform 0.3s cubic-bezier(0.22, 1, 0.36, 1),
    opacity 0.3s ease;
}
.promo-enter-from {
  transform: translateX(60%);
  opacity: 0;
}
.promo-leave-to {
  transform: translateX(-60%);
  opacity: 0;
}
@media (prefers-reduced-motion: reduce) {
  .promo-enter-active,
  .promo-leave-active {
    transition: none;
  }
}

/* 跑馬燈撐滿整個視窗寬度，不受內容容器限制 */
.full-bleed {
  margin-left: calc(50% - 50vw);
  margin-right: calc(50% - 50vw);
}
</style>
