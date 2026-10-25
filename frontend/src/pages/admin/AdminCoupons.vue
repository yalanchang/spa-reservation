<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <p class="text-sm text-gray-500">
        開放領取的券會出現在前台「領券中心」，符合資格的會員才能領；預約時系統會再檢查一次
      </p>
      <button type="button" class="admin-btn" @click="openForm()">新增優惠碼</button>
    </div>

    <div v-if="loading" class="admin-panel"><AdminLoading /></div>
    <div v-else class="admin-panel overflow-x-auto">
      <table v-stack-table class="admin-table min-w-[860px]">
        <thead>
          <tr>
            <th>優惠碼</th>
            <th>折扣</th>
            <th>領取資格</th>
            <th class="text-right">最低消費</th>
            <th>期間</th>
            <th class="text-right">領取</th>
            <th class="text-right">已使用</th>
            <th class="text-right">已折抵</th>
            <th>狀態</th>
            <th class="text-right">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="!coupons.length">
            <td colspan="10" class="py-12 text-center text-gray-400">還沒有優惠碼</td>
          </tr>
          <tr v-for="c in coupons" v-else :key="c.id">
            <td>
              <p class="font-mono font-medium text-gray-900">{{ c.code }}</p>
              <p class="text-xs text-gray-500">{{ c.name }}</p>
            </td>
            <td>{{ discountText(c) }}</td>
            <td>
              {{ AUDIENCES[c.audience] }}
              <p class="text-xs text-gray-500">
                {{ Number(c.is_claimable) ? '開放領取' : '只能輸入代碼' }}，每人 {{ c.per_user_limit }} 次
              </p>
            </td>
            <td class="text-right tabular-nums">
              {{ Number(c.min_spend) ? Number(c.min_spend).toLocaleString() : '—' }}
            </td>
            <td class="whitespace-nowrap tabular-nums text-gray-600">{{ periodText(c) }}</td>
            <td class="text-right tabular-nums">{{ c.claimed_count }}</td>
            <td class="text-right tabular-nums">{{ c.used_count }}{{ c.usage_limit ? ` / ${c.usage_limit}` : '' }}</td>
            <td class="text-right tabular-nums">{{ Number(c.total_discount).toLocaleString() }}</td>
            <td>
              <span class="admin-tag" :class="state(c).class">{{ state(c).label }}</span>
            </td>
            <td class="whitespace-nowrap text-right">
              <button type="button" class="admin-link" @click="openForm(c)">編輯</button>
              <button type="button" class="admin-link ml-3" @click="toggle(c)">
                {{ Number(c.is_active) ? '停用' : '啟用' }}
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <AdminModal :open="!!form" :title="form?.id ? '編輯優惠碼' : '新增優惠碼'" wide @close="form = null">
      <form v-if="form" class="grid gap-x-4 gap-y-5 sm:grid-cols-2" @submit.prevent="save">
        <div>
          <label class="admin-label" for="coupon-code">優惠碼</label>
          <input
            id="coupon-code"
            v-model="form.code"
            required
            maxlength="30"
            placeholder="例如 SPRING200"
            class="admin-input font-mono uppercase"
            :class="{ '!border-red-500 !ring-red-500': duplicateCode }"
            @input="form.code = form.code.toUpperCase()"
          />
          <p v-if="duplicateCode" class="mt-1 text-xs text-red-600">「{{ form.code }}」已經存在，請換一個代碼</p>
          <p v-else class="admin-hint">英文與數字，3–30 字</p>
        </div>
        <div>
          <label class="admin-label" for="coupon-name">活動名稱</label>
          <input
            id="coupon-name"
            v-model="form.name"
            required
            maxlength="100"
            placeholder="例如 春季限定 折 NT$200"
            class="admin-input"
          />
        </div>
        <div class="sm:col-span-2">
          <label class="admin-label" for="coupon-desc">說明</label>
          <input
            id="coupon-desc"
            v-model="form.description"
            maxlength="200"
            placeholder="例如 第一次預約就能用"
            class="admin-input"
          />
          <p class="admin-hint">顯示在前台領券中心</p>
        </div>

        <div>
          <label class="admin-label" for="coupon-type">折扣方式</label>
          <select id="coupon-type" v-model="form.discountType" class="admin-input">
            <option value="amount">折抵金額</option>
            <option value="percent">打折</option>
          </select>
        </div>
        <div>
          <label class="admin-label" for="coupon-value">{{
            form.discountType === 'percent' ? '折數' : '折抵金額'
          }}</label>
          <div class="admin-input-group">
            <span v-if="form.discountType !== 'percent'">NT$</span>
            <input
              v-if="form.discountType === 'percent'"
              id="coupon-value"
              v-model.number="form.percentRate"
              type="number"
              min="1"
              max="99"
              required
              placeholder="85"
            />
            <input
              v-else
              id="coupon-value"
              v-model.number="form.discountValue"
              type="number"
              min="1"
              required
              placeholder="200"
            />
            <span v-if="form.discountType === 'percent'">折</span>
          </div>
          <p v-if="form.discountType === 'percent'" class="admin-hint">85 折請填 85，9 折請填 90</p>
        </div>

        <div>
          <label class="admin-label" for="coupon-audience">領取資格</label>
          <select id="coupon-audience" v-model="form.audience" class="admin-input">
            <option v-for="(label, value) in AUDIENCES" :key="value" :value="value">{{ label }}</option>
          </select>
        </div>
        <div>
          <label class="admin-label" for="coupon-claimable">發放方式</label>
          <select id="coupon-claimable" v-model="form.isClaimable" class="admin-input">
            <option :value="true">公開在領券中心</option>
            <option :value="false">不公開，輸入代碼才能用</option>
          </select>
        </div>

        <div>
          <label class="admin-label" for="coupon-min">最低消費</label>
          <div class="admin-input-group">
            <span>NT$</span>
            <input id="coupon-min" v-model="form.minSpend" type="number" min="0" placeholder="不限" />
          </div>
        </div>
        <div>
          <label class="admin-label" for="coupon-per-user">每人可用</label>
          <div class="admin-input-group">
            <input id="coupon-per-user" v-model.number="form.perUserLimit" type="number" min="1" max="99" required />
            <span>次</span>
          </div>
        </div>
        <div>
          <label class="admin-label" for="coupon-limit">發放總量</label>
          <div class="admin-input-group">
            <input id="coupon-limit" v-model="form.usageLimit" type="number" min="1" placeholder="不限" />
            <span>張</span>
          </div>
          <p class="admin-hint">所有會員合計可使用的次數</p>
        </div>
        <div>
          <span class="admin-label">活動期間</span>
          <div class="flex items-center gap-2">
            <input v-model="form.startDate" type="date" class="admin-input" aria-label="開始日期" />
            <span class="text-gray-400">~</span>
            <input
              v-model="form.endDate"
              type="date"
              :min="form.startDate || undefined"
              class="admin-input"
              aria-label="結束日期"
            />
          </div>
          <p class="admin-hint">不填開始日期即刻生效，不填結束日期則永久有效</p>
        </div>
        <p v-if="similarCoupon" class="rounded-md bg-amber-50 px-4 py-3 text-amber-800 sm:col-span-2">
          已經有相同資格、相同折扣的優惠券「{{ similarCoupon.name }}」（{{ similarCoupon.code }}），確定要再建立一張嗎？
        </p>
        <div class="admin-modal-actions sm:col-span-2">
          <button type="button" class="admin-btn-outline" @click="form = null">取消</button>
          <button type="submit" class="admin-btn" :disabled="saving || duplicateCode">
            <LoadingSpinner v-if="saving" size="sm" />
            <template v-else>儲存</template>
          </button>
        </div>
      </form>
    </AdminModal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useToast } from 'vue-toastification'
import apiClient from '@/api/client'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'
import AdminLoading from '@/components/admin/AdminLoading.vue'
import AdminModal from '@/components/admin/AdminModal.vue'

const AUDIENCES: Record<string, string> = {
  all: '全體會員',
  new: '新會員首次預約',
  birthday: '生日當月壽星',
  silver: '銀卡以上會員',
  gold: '金卡會員'
}

const toast = useToast()
const coupons = ref<any[]>([])
const loading = ref(true)
const saving = ref(false)
const form = ref<any | null>(null)
const today = new Date().toLocaleDateString('sv-SE')

// 15% off 顯示成「85 折」，10% off 顯示成「9 折」
const discountText = (c: any) => {
  if (c.discount_type !== 'percent') return `折 NT$ ${Number(c.discount_value).toLocaleString()}`
  const rate = 100 - Number(c.discount_value)
  return `${rate % 10 ? rate : rate / 10} 折`
}

// 代碼重複：直接擋下
const duplicateCode = computed(() => {
  const code = form.value?.code?.trim()
  return !!code && coupons.value.some((c) => c.code === code && c.id !== form.value.id)
})

// 內容重複（同資格、同折扣、都還在使用）：提醒但可以繼續建立
const similarCoupon = computed(() => {
  const f = form.value
  if (!f) return null
  const value = f.discountType === 'percent' ? 100 - Number(f.percentRate) : Number(f.discountValue)
  return (
    coupons.value.find(
      (c) =>
        c.id !== f.id &&
        Number(c.is_active) &&
        c.audience === f.audience &&
        c.discount_type === f.discountType &&
        Number(c.discount_value) === value &&
        state(c).label === '使用中'
    ) || null
  )
})

const periodText = (c: any) => {
  if (!c.start_date && !c.end_date) return '不限'
  return `${c.start_date || '即日起'} ~ ${c.end_date || '不限'}`
}

const state = (c: any) => {
  if (!Number(c.is_active)) return { label: '已停用', class: 'bg-gray-100 text-gray-500' }
  if (c.end_date && c.end_date < today) return { label: '已過期', class: 'bg-gray-100 text-gray-500' }
  if (c.start_date && c.start_date > today) return { label: '尚未開始', class: 'bg-amber-50 text-amber-700' }
  if (c.usage_limit && Number(c.used_count) >= Number(c.usage_limit))
    return { label: '已用完', class: 'bg-gray-100 text-gray-500' }
  return { label: '使用中', class: 'bg-green-50 text-green-700' }
}

const load = async () => {
  try {
    const res = (await apiClient.get('/admin/coupons')) as any
    coupons.value = res.data || []
  } catch (error: any) {
    toast.error(error?.message || '優惠碼載入失敗')
  } finally {
    loading.value = false
  }
}

const toBody = (c: any) => ({
  code: c.code,
  name: c.name,
  description: c.description || '',
  audience: c.audience,
  isClaimable: !!Number(c.is_claimable),
  perUserLimit: Number(c.per_user_limit),
  discountType: c.discount_type,
  discountValue: c.discount_value,
  minSpend: Number(c.min_spend),
  startDate: c.start_date || '',
  endDate: c.end_date || '',
  usageLimit: c.usage_limit ?? '',
  isActive: !!Number(c.is_active)
})

const openForm = (c?: any) => {
  form.value = c
    ? { id: c.id, ...toBody(c), percentRate: c.discount_type === 'percent' ? 100 - Number(c.discount_value) : 85 }
    : {
        code: '',
        name: '',
        description: '',
        audience: 'all',
        isClaimable: true,
        perUserLimit: 1,
        discountType: 'amount',
        discountValue: 200,
        percentRate: 85,
        minSpend: '',
        startDate: '',
        endDate: '',
        usageLimit: '',
        isActive: true
      }
}

const save = async () => {
  saving.value = true
  try {
    const { id, percentRate, ...rest } = form.value
    const body = {
      ...rest,
      // 打折存的是折掉的百分比：85 折 → 15
      discountValue: rest.discountType === 'percent' ? 100 - Number(percentRate) : rest.discountValue,
      minSpend: Number(rest.minSpend) || 0
    }
    if (id) await apiClient.put(`/admin/coupons/${id}`, body)
    else await apiClient.post('/admin/coupons', body)
    toast.success('優惠碼已儲存')
    form.value = null
    await load()
  } catch (error: any) {
    toast.error(error?.message || '儲存失敗')
  } finally {
    saving.value = false
  }
}

const toggle = async (c: any) => {
  try {
    await apiClient.put(`/admin/coupons/${c.id}`, { ...toBody(c), isActive: !Number(c.is_active) })
    toast.success(Number(c.is_active) ? '已停用' : '已啟用')
    await load()
  } catch (error: any) {
    toast.error(error?.message || '更新失敗')
  }
}

onMounted(load)
</script>
