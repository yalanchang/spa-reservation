<template>
  <div class="space-y-4">
    <div class="flex flex-wrap items-center gap-2">
      <select v-model="preset" class="admin-input !w-auto" aria-label="期間" @change="applyPreset">
        <option value="this-month">本月</option>
        <option value="last-month">上個月</option>
        <option value="30">近 30 天</option>
        <option value="90">近 90 天</option>
        <option value="year">今年</option>
        <option value="custom">自訂</option>
      </select>
      <input v-model="from" type="date" class="admin-input !w-auto" aria-label="開始日期" @change="onCustomDate" />
      <span class="text-gray-400">~</span>
      <input v-model="to" type="date" class="admin-input !w-auto" aria-label="結束日期" @change="onCustomDate" />
      <button type="button" class="admin-btn-outline ml-auto" :disabled="exporting" @click="exportCsv">
        <LoadingSpinner v-if="exporting" size="sm" />
        <template v-else>匯出預約明細（CSV）</template>
      </button>
    </div>

    <div v-if="loading" class="admin-panel py-16"><LoadingSpinner /></div>

    <template v-else-if="data">
      <!-- 摘要：一列數字，不做卡片 -->
      <div class="admin-panel overflow-x-auto">
        <table v-stack-table.notitle class="admin-table min-w-[760px]">
          <thead>
            <tr>
              <th class="text-right">營收</th>
              <th class="text-right">完成</th>
              <th class="text-right">客單價</th>
              <th class="text-right">來客數</th>
              <th class="text-right">新會員</th>
              <th class="text-right">取消率</th>
              <th class="text-right">未到店率</th>
              <th class="text-right">優惠折抵</th>
            </tr>
          </thead>
          <tbody>
            <!-- 數字可以點，跳出這段期間的預約明細 -->
            <tr class="text-base">
              <td class="text-right">
                <button
                  type="button"
                  class="drill font-semibold"
                  @click="openDetail('營收明細', { status: 'completed' })"
                >
                  NT$ {{ money(s.revenue) }}
                </button>
              </td>
              <td class="text-right">
                <button type="button" class="drill" @click="openDetail('預約明細', { status: 'completed' })">
                  {{ s.completed }} 筆
                </button>
              </td>
              <td class="text-right tabular-nums">
                NT$ {{ money(Number(s.completed) ? Number(s.revenue) / Number(s.completed) : 0) }}
              </td>
              <td class="text-right">
                <button type="button" class="drill" @click="openDetail('來客明細', { status: 'completed' })">
                  {{ s.customers }} 人
                </button>
              </td>
              <td class="text-right">
                <button type="button" class="drill" @click="openMembers">{{ s.new_members }} 人</button>
              </td>
              <td class="text-right">
                <button type="button" class="drill" @click="openDetail('預約明細', { status: 'cancelled' })">
                  {{ rate(s.cancelled) }}
                </button>
                <p class="text-xs text-gray-400">{{ s.cancelled }} 筆</p>
              </td>
              <td class="text-right">
                <button
                  type="button"
                  class="drill"
                  :class="{ '!text-red-600': Number(s.no_show) }"
                  @click="openDetail('預約明細', { status: 'no_show' })"
                >
                  {{ rate(s.no_show) }}
                </button>
                <p class="text-xs text-gray-400">{{ s.no_show }} 筆</p>
              </td>
              <td class="text-right">
                <button type="button" class="drill" @click="openDetail('使用優惠券的預約', { coupon: '1' })">
                  NT$ {{ money(s.discount) }}
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- 趨勢圖：期間長就改成按月 -->
      <section class="admin-panel p-4">
        <div class="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h3 class="text-sm font-medium text-gray-900">{{ byMonth ? '每月趨勢' : '每日趨勢' }}</h3>
          <select v-model="metric" class="admin-input !w-auto !py-1.5" aria-label="指標">
            <option value="count">預約數（不含取消）</option>
            <option value="revenue">營收（已完成）</option>
          </select>
        </div>
        <div v-if="!buckets.length" class="py-10 text-center text-sm text-gray-400">這段期間沒有預約</div>
        <div v-else class="flex gap-2 pt-3">
          <!-- Y 軸刻度 -->
          <div class="relative h-48 w-12 shrink-0 text-right text-xs tabular-nums text-gray-400">
            <span
              v-for="t in yTicks"
              :key="t"
              class="absolute right-0 -translate-y-1/2"
              :style="{ bottom: `${(t / yMax) * 100}%` }"
            >
              {{ metric === 'revenue' ? shortMoney(t) : t }}
            </span>
          </div>
          <!-- 手機上長條縮窄塞進畫面；平板以上才保留最小寬度，太多天時左右捲動 -->
          <div class="min-w-0 flex-1 sm:overflow-x-auto">
            <div
              class="sm:[min-width:var(--chart-min)]"
              :style="{ '--chart-min': `${buckets.length * (byMonth ? 40 : 12)}px` }"
            >
              <div class="relative h-48">
                <!-- 格線 -->
                <div
                  v-for="t in yTicks"
                  :key="t"
                  class="absolute inset-x-0 border-t"
                  :class="t === 0 ? 'border-gray-300' : 'border-dashed border-gray-100'"
                  :style="{ bottom: `${(t / yMax) * 100}%` }"
                ></div>
                <div class="absolute inset-0 flex items-end gap-0.5">
                  <div
                    v-for="bucket in buckets"
                    :key="bucket.key"
                    class="group relative flex h-full flex-1 items-end justify-center"
                    :class="{ 'cursor-pointer': bucket.count }"
                    @mouseenter="hoverKey = bucket.count || bucket.revenue ? bucket.key : null"
                    @mouseleave="hoverKey = null"
                    @click="bucket.count && openBucket(bucket)"
                  >
                    <div
                      class="w-full max-w-[2.5rem] rounded-t bg-blue-600 transition-colors group-hover:bg-blue-800"
                      :style="{ height: `${(value(bucket) / yMax) * 100}%`, minHeight: value(bucket) ? '2px' : '0' }"
                    ></div>
                    <!-- 提示框：跟著滑過的長條 -->
                    <div
                      v-if="hoverKey === bucket.key"
                      class="pointer-events-none absolute z-10 whitespace-nowrap rounded-md border border-gray-200 bg-white px-3 py-2 text-xs shadow-sm"
                      :class="tooltipSide(bucket)"
                      :style="{ top: '0' }"
                    >
                      <p class="font-medium text-gray-900">{{ bucket.label }}</p>
                      <p class="text-gray-600">預約 {{ bucket.count }} 筆，營收 NT$ {{ money(bucket.revenue) }}</p>
                      <p class="mt-0.5 text-blue-600">點擊查看明細</p>
                    </div>
                  </div>
                </div>
              </div>
              <!-- X 軸日期 -->
              <div class="relative mt-1.5 h-4 text-xs tabular-nums text-gray-400">
                <span
                  v-for="(bucket, i) in buckets"
                  v-show="i % xEvery === 0"
                  :key="bucket.key"
                  class="absolute -translate-x-1/2 whitespace-nowrap"
                  :style="{ left: `${((i + 0.5) / buckets.length) * 100}%` }"
                >
                  {{ bucket.tick }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div class="grid gap-4 lg:grid-cols-2">
        <!-- 療程排行 -->
        <section class="admin-panel">
          <h3 class="border-b border-gray-200 px-4 py-3 text-sm font-medium text-gray-900">療程營收排行</h3>
          <table class="admin-table">
            <thead>
              <tr>
                <th>療程</th>
                <th class="text-right">次數</th>
                <th class="w-2/5">營收</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="!data.byService.length">
                <td colspan="3" class="py-8 text-center text-gray-400">沒有完成的預約</td>
              </tr>
              <tr
                v-for="row in data.byService"
                :key="row.name"
                class="cursor-pointer"
                @click="openDetail(`療程：${row.name}`, { status: 'completed', serviceId: String(row.id) })"
              >
                <td>
                  <span class="drill">{{ row.name }}</span>
                </td>
                <td class="text-right tabular-nums">{{ row.count }}</td>
                <td><BarCell :value="Number(row.revenue)" :max="maxServiceRevenue" /></td>
              </tr>
            </tbody>
          </table>
        </section>

        <!-- 美容師業績 -->
        <section class="admin-panel">
          <h3 class="border-b border-gray-200 px-4 py-3 text-sm font-medium text-gray-900">美容師業績</h3>
          <table class="admin-table">
            <thead>
              <tr>
                <th>美容師</th>
                <th class="text-right">服務</th>
                <th class="text-right">評分</th>
                <th class="w-2/5">營收</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="!data.byStaff.length">
                <td colspan="4" class="py-8 text-center text-gray-400">沒有完成的預約</td>
              </tr>
              <tr
                v-for="row in data.byStaff"
                :key="row.name"
                class="cursor-pointer"
                @click="openDetail(`美容師：${row.name}`, { status: 'completed', staffId: String(row.id) })"
              >
                <td>
                  <span class="drill">{{ row.name }}</span>
                </td>
                <td class="text-right tabular-nums">{{ row.count }}</td>
                <td class="text-right tabular-nums">{{ row.rating ?? '—' }}</td>
                <td><BarCell :value="Number(row.revenue)" :max="maxStaffRevenue" /></td>
              </tr>
            </tbody>
          </table>
        </section>

        <!-- 熱門時段 -->
        <section class="admin-panel">
          <h3 class="border-b border-gray-200 px-4 py-3 text-sm font-medium text-gray-900">熱門時段</h3>
          <table class="admin-table">
            <thead>
              <tr>
                <th>開始時間</th>
                <th class="w-3/5">預約數</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="!data.byHour.length">
                <td colspan="2" class="py-8 text-center text-gray-400">沒有資料</td>
              </tr>
              <tr
                v-for="row in data.byHour"
                :key="row.hour"
                class="cursor-pointer"
                @click="openDetail(`時段：${hourText(row.hour)}`, { status: 'not_cancelled', hour: String(row.hour) })"
              >
                <td>
                  <span class="drill">{{ hourText(row.hour) }}</span>
                </td>
                <td><BarCell :value="Number(row.count)" :max="maxHourCount" unit="筆" /></td>
              </tr>
            </tbody>
          </table>
        </section>

        <!-- 預約來源 -->
        <section class="admin-panel">
          <h3 class="border-b border-gray-200 px-4 py-3 text-sm font-medium text-gray-900">預約來源</h3>
          <table class="admin-table">
            <thead>
              <tr>
                <th>來源</th>
                <th class="w-3/5">預約數</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="!data.bySource.length">
                <td colspan="2" class="py-8 text-center text-gray-400">沒有資料</td>
              </tr>
              <tr
                v-for="row in data.bySource"
                :key="row.source"
                class="cursor-pointer"
                @click="openDetail(`來源：${SOURCE_LABELS[row.source] || row.source}`, { source: row.source })"
              >
                <td>
                  <span class="drill">{{ SOURCE_LABELS[row.source] || row.source }}</span>
                </td>
                <td><BarCell :value="Number(row.count)" :max="maxSourceCount" unit="筆" /></td>
              </tr>
            </tbody>
          </table>
        </section>
      </div>
    </template>

    <!-- 明細 -->
    <AdminModal :open="!!detail" :title="detail?.title || ''" wide @close="detail = null">
      <div v-if="detail">
        <div class="mb-3 flex flex-wrap items-center gap-3">
          <select v-model="detail.status" class="admin-input !w-auto" aria-label="狀態" @change="loadDetail">
            <option value="">全部狀態</option>
            <option value="not_cancelled">不含取消</option>
            <option v-for="(label, value) in STATUS_LABELS" :key="value" :value="value">{{ label }}</option>
          </select>
          <p class="text-xs text-gray-500">
            {{ detailSummary }}
          </p>
        </div>
        <div v-if="detail.loading" class="py-10"><LoadingSpinner /></div>
        <p v-else-if="!detail.rows.length" class="py-10 text-center text-gray-400">沒有資料</p>
        <div v-else class="max-h-[60vh] overflow-auto rounded-md border border-gray-200">
          <table v-stack-table class="admin-table min-w-[640px]">
            <thead class="sticky top-0">
              <tr>
                <th>時間</th>
                <th>顧客</th>
                <th>療程</th>
                <th>美容師</th>
                <th class="text-right">金額</th>
                <th>狀態</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="r in detail.rows" :key="r.id">
                <td class="whitespace-nowrap tabular-nums">
                  {{ formatDateWithWeekday(r.appointment_date) }} {{ r.start_time.slice(0, 5) }}
                </td>
                <td>
                  <p class="text-gray-900">{{ r.customer_name }}</p>
                  <p class="text-xs text-gray-500">{{ r.customer_phone }}</p>
                </td>
                <td>{{ r.service_name }}</td>
                <td class="text-gray-600">{{ r.staff_name }}</td>
                <td class="text-right tabular-nums">
                  {{ money(r.price) }}
                  <p v-if="Number(r.discount)" class="text-xs text-gray-400">折 {{ money(r.discount) }}</p>
                </td>
                <td>
                  <span class="admin-tag" :class="STATUS_CLASSES[r.status]">{{ STATUS_LABELS[r.status] }}</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </AdminModal>

    <!-- 新會員明細 -->
    <AdminModal :open="!!members" title="這段期間加入的會員" wide @close="members = null">
      <div v-if="members">
        <p class="mb-3 text-xs text-gray-500">{{ from }} ~ {{ to }}，共 {{ members.rows.length }} 位</p>
        <div v-if="members.loading" class="py-10"><LoadingSpinner /></div>
        <p v-else-if="!members.rows.length" class="py-10 text-center text-gray-400">這段期間沒有新會員</p>
        <div v-else class="max-h-[60vh] overflow-auto rounded-md border border-gray-200">
          <table v-stack-table class="admin-table min-w-[600px]">
            <thead class="sticky top-0">
              <tr>
                <th>會員</th>
                <th>電話</th>
                <th>加入日期</th>
                <th class="text-right">到店次數</th>
                <th class="text-right">累積消費</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="m in members.rows" :key="m.id">
                <td>
                  <p class="text-gray-900">{{ m.name }}</p>
                  <p class="text-xs text-gray-500">{{ m.email }}</p>
                </td>
                <td class="tabular-nums text-gray-600">{{ m.phone || '—' }}</td>
                <td class="tabular-nums text-gray-600">{{ new Date(m.created_at).toLocaleDateString('sv-SE') }}</td>
                <td class="text-right tabular-nums">{{ m.visit_count }}</td>
                <td class="text-right tabular-nums">{{ money(m.total_spend) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </AdminModal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, h } from 'vue'
import { useToast } from 'vue-toastification'
import apiClient from '@/api/client'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'
import AdminModal from '@/components/admin/AdminModal.vue'
import { STATUS_LABELS, STATUS_CLASSES, formatDateWithWeekday } from '@/utils/appointmentStatus'
import { downloadAppointmentsCsv } from '@/utils/adminExport'

const SOURCE_LABELS: Record<string, string> = {
  online: '線上預約',
  phone: '電話預約',
  walk_in: '現場預約',
  line: 'LINE 預約'
}
const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六']

// 表格裡的橫條：數字一定寫出來，長條只是輔助
const BarCell = (props: { value: number; max: number; unit?: string }) =>
  h('div', { class: 'flex items-center gap-2' }, [
    h('div', { class: 'h-2 flex-1 rounded-sm bg-gray-100' }, [
      h('div', {
        class: 'h-2 rounded-sm bg-blue-600',
        style: { width: `${props.max ? (props.value / props.max) * 100 : 0}%` }
      })
    ]),
    h(
      'span',
      { class: 'w-24 shrink-0 text-right tabular-nums text-gray-700' },
      props.unit ? `${props.value} ${props.unit}` : `NT$ ${Math.round(props.value).toLocaleString()}`
    )
  ])
BarCell.props = ['value', 'max', 'unit']

const toast = useToast()
const iso = (d: Date) => d.toLocaleDateString('sv-SE')

const preset = ref('this-month')
const from = ref('')
const to = ref('')
const data = ref<any | null>(null)
const loading = ref(true)
const exporting = ref(false)

const s = computed(() => data.value?.summary || {})
const money = (v: unknown) => Math.round(Number(v) || 0).toLocaleString()
const rate = (v: unknown) =>
  Number(s.value.total) ? `${((Number(v) / Number(s.value.total)) * 100).toFixed(1)}%` : '—'
const weekday = (date: string) => `週${WEEKDAYS[new Date(`${date}T00:00:00`).getDay()]}`

// ---- 趨勢圖
const metric = ref<'count' | 'revenue'>('count')
const hoverKey = ref<string | null>(null)

// 超過兩個月就按月顯示，不然長條太細看不清楚
const byMonth = computed(() => {
  if (!from.value || !to.value) return false
  const ms = new Date(`${to.value}T00:00:00`).getTime() - new Date(`${from.value}T00:00:00`).getTime()
  return ms / 86400000 > 62
})

// 把沒有預約的日子補 0，再依天或月份分組
const buckets = computed(() => {
  if (!data.value || !from.value || !to.value) return []
  const map = new Map<string, any>(data.value.byDay.map((d: any) => [d.date, d]))
  const list: any[] = []
  for (let d = new Date(`${from.value}T00:00:00`); d <= new Date(`${to.value}T00:00:00`); d.setDate(d.getDate() + 1)) {
    const date = iso(d)
    const key = byMonth.value ? date.slice(0, 7) : date
    let bucket = list[list.length - 1]
    if (!bucket || bucket.key !== key) {
      bucket = byMonth.value
        ? {
            key,
            from: date,
            to: date,
            count: 0,
            revenue: 0,
            label: `${d.getFullYear()} 年 ${d.getMonth() + 1} 月`,
            tick: `${d.getMonth() + 1}月`
          }
        : {
            key,
            from: date,
            to: date,
            count: 0,
            revenue: 0,
            label: `${date}（${weekday(date)}）`,
            tick: `${d.getMonth() + 1}/${d.getDate()}`
          }
      list.push(bucket)
    }
    bucket.to = date
    const row = map.get(date)
    bucket.count += Number(row?.count || 0)
    bucket.revenue += Number(row?.revenue || 0)
  }
  return list.some((b) => b.count) ? list : []
})

const value = (bucket: any) => (metric.value === 'revenue' ? bucket.revenue : bucket.count)

// Y 軸取整數刻度：1、2、5 的倍數，大約 4 格
const yStep = computed(() => {
  const max = Math.max(1, ...buckets.value.map(value))
  const raw = max / 4
  const pow = 10 ** Math.floor(Math.log10(raw))
  const step = [1, 2, 5, 10].map((m) => m * pow).find((m) => m >= raw) || pow * 10
  return Math.max(metric.value === 'count' ? 1 : 100, step)
})
const yMax = computed(() =>
  Math.max(yStep.value, Math.ceil(Math.max(1, ...buckets.value.map(value)) / yStep.value) * yStep.value)
)
const yTicks = computed(() =>
  Array.from({ length: Math.round(yMax.value / yStep.value) + 1 }, (_, i) => i * yStep.value)
)

// X 軸最多標 8 個日期
const xEvery = computed(() => Math.max(1, Math.ceil(buckets.value.length / 8)))

const shortMoney = (v: number) => (v >= 10000 ? `${(v / 10000).toLocaleString()}萬` : v.toLocaleString())

// 提示框放在圖表內的上緣；靠右邊的長條往左邊長，避免被裁掉
const tooltipSide = (bucket: any) => {
  const i = buckets.value.indexOf(bucket)
  return i > buckets.value.length / 2 ? 'right-1/2 mr-2' : 'left-1/2 ml-2'
}

const openBucket = (bucket: any) =>
  openDetail(`${bucket.label}的預約`, { status: 'not_cancelled' }, bucket.from, bucket.to)

const maxServiceRevenue = computed(() =>
  Math.max(0, ...(data.value?.byService || []).map((r: any) => Number(r.revenue)))
)
const maxStaffRevenue = computed(() => Math.max(0, ...(data.value?.byStaff || []).map((r: any) => Number(r.revenue))))
const maxHourCount = computed(() => Math.max(0, ...(data.value?.byHour || []).map((r: any) => Number(r.count))))
const maxSourceCount = computed(() => Math.max(0, ...(data.value?.bySource || []).map((r: any) => Number(r.count))))

const applyPreset = () => {
  const now = new Date()
  const y = now.getFullYear()
  const m = now.getMonth()
  if (preset.value === 'this-month') {
    from.value = iso(new Date(y, m, 1))
    to.value = iso(new Date(y, m + 1, 0))
  } else if (preset.value === 'last-month') {
    from.value = iso(new Date(y, m - 1, 1))
    to.value = iso(new Date(y, m, 0))
  } else if (preset.value === 'year') {
    from.value = iso(new Date(y, 0, 1))
    to.value = iso(new Date(y, 11, 31))
  } else if (preset.value === '30' || preset.value === '90') {
    from.value = iso(new Date(y, m, now.getDate() - Number(preset.value) + 1))
    to.value = iso(now)
  } else return
  load()
}

// 手動改日期就切到「自訂」
const onCustomDate = () => {
  preset.value = 'custom'
  load()
}

const load = async () => {
  if (!from.value || !to.value) return
  loading.value = true
  try {
    const res = (await apiClient.get('/admin/reports', { params: { from: from.value, to: to.value } })) as any
    data.value = res.data
  } catch (error: any) {
    toast.error(error?.message || '報表載入失敗')
  } finally {
    loading.value = false
  }
}

// ---- 點數字看明細
const hourText = (hour: number) => `${String(hour).padStart(2, '0')}:00 – ${String(hour).padStart(2, '0')}:59`

const members = ref<{ rows: any[]; loading: boolean } | null>(null)
const openMembers = async () => {
  members.value = { rows: [], loading: true }
  try {
    const res = (await apiClient.get('/admin/customers', {
      params: { from: from.value, to: to.value, status: 'all' }
    })) as any
    if (members.value) members.value.rows = res.data || []
  } catch (error: any) {
    toast.error(error?.message || '會員載入失敗')
  } finally {
    if (members.value) members.value.loading = false
  }
}
const detailSummary = computed(() => {
  const d = detail.value
  if (!d) return ''
  const period = d.from === d.to ? d.from : `${d.from} ~ ${d.to}`
  const total = d.rows.reduce((sum, r) => sum + Number(r.price), 0)
  return `${period}，共 ${d.rows.length} 筆${d.rows.length ? `，金額合計 NT$ ${money(total)}` : ''}`
})
const detail = ref<{
  title: string
  from: string
  to: string
  status: string
  params: Record<string, string>
  rows: any[]
  loading: boolean
} | null>(null)

// 點進來時依數字帶入預設狀態，視窗裡可以再切換
const openDetail = (title: string, params: Record<string, string>, day?: string, dayTo?: string) => {
  const { status = '', ...rest } = params
  detail.value = {
    title,
    from: day || from.value,
    to: dayTo || day || to.value,
    status,
    params: rest,
    rows: [],
    loading: true
  }
  loadDetail()
}

const loadDetail = async () => {
  const d = detail.value
  if (!d) return
  d.loading = true
  try {
    const res = (await apiClient.get('/admin/appointments', {
      params: { from: d.from, to: d.to, ...d.params, status: d.status || undefined, range: 'all' }
    })) as any
    if (detail.value === d) d.rows = res.data || []
  } catch (error: any) {
    toast.error(error?.message || '明細載入失敗')
  } finally {
    d.loading = false
  }
}

const exportCsv = async () => {
  exporting.value = true
  try {
    await downloadAppointmentsCsv(from.value, to.value)
  } catch (error: any) {
    toast.error(error?.message || '匯出失敗')
  } finally {
    exporting.value = false
  }
}

onMounted(applyPreset)
</script>

<style scoped>
/* 可以點進去看明細的數字 */
.drill {
  @apply tabular-nums text-blue-700 underline decoration-blue-200 underline-offset-4 hover:text-blue-900 hover:decoration-blue-600;
}
</style>
