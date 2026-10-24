<template>
  <form class="space-y-8" @submit.prevent="save">
    <!-- 個人資料 -->
    <section>
      <h3 class="profile-section-title">個人資料</h3>
      <div class="grid gap-5 sm:grid-cols-2">
        <div>
          <label for="profile-name" class="profile-label">姓名 <span class="text-xs text-red-500">必填</span></label>
          <input id="profile-name" v-model="form.name" maxlength="50" required class="profile-input" />
        </div>
        <div>
          <label for="profile-birthday" class="profile-label">生日</label>
          <input
            id="profile-birthday"
            v-model="form.birthday"
            type="date"
            :max="today"
            min="1900-01-01"
            class="profile-input"
          />
        </div>
        <div>
          <label for="profile-gender" class="profile-label">性別</label>
          <select id="profile-gender" v-model="form.gender" class="profile-input">
            <option value="">請選擇</option>
            <option v-for="g in GENDERS" :key="g.value" :value="g.value">{{ g.label }}</option>
          </select>
        </div>
      </div>
    </section>

    <!-- 聯絡資訊 -->
    <section>
      <h3 class="profile-section-title">聯絡資訊</h3>
      <div class="grid gap-5 sm:grid-cols-2">
        <div>
          <label for="profile-email" class="profile-label">電子郵件</label>
          <div class="flex gap-2">
            <input
              id="profile-email"
              :value="user?.email"
              readonly
              class="profile-input flex-1 cursor-default bg-gray-50 text-gray-500"
            />
            <router-link
              :to="{ path: '/profile', query: { tab: 'security' } }"
              class="flex shrink-0 items-center rounded-xl border border-primary-200 px-4 text-sm font-medium text-primary-600 transition hover:text-primary-700"
            >
              更換
            </router-link>
          </div>
        </div>
        <div>
          <label for="profile-phone" class="profile-label">聯絡電話</label>
          <input id="profile-phone" v-model="form.phone" type="tel" placeholder="您的聯絡電話" class="profile-input" />
          <p v-if="form.phone && !isValidTaiwanPhone(form.phone)" class="mt-1 text-xs text-red-500">
            手機為 09 開頭共 10 碼，市話請加區碼
          </p>
        </div>
        <div>
          <label for="profile-city" class="profile-label">縣市</label>
          <select id="profile-city" v-model="form.city" class="profile-input">
            <option value="">請選擇</option>
            <option v-for="c in TW_CITIES" :key="c" :value="c">{{ c }}</option>
          </select>
        </div>
        <div>
          <label for="profile-address" class="profile-label">地址</label>
          <input
            id="profile-address"
            v-model="form.address"
            maxlength="200"
            placeholder="區、路、號"
            class="profile-input"
          />
        </div>
      </div>
    </section>

    <!-- 緊急聯絡人 -->
    <section>
      <h3 class="profile-section-title">緊急聯絡人</h3>
      <p class="mb-3 text-sm text-gray-500"></p>
      <div class="grid gap-5 sm:grid-cols-2">
        <div>
          <label for="profile-emergency-name" class="profile-label">姓名</label>
          <input id="profile-emergency-name" v-model="form.emergencyName" maxlength="50" class="profile-input" />
        </div>
        <div>
          <label for="profile-emergency-phone" class="profile-label">電話</label>
          <input id="profile-emergency-phone" v-model="form.emergencyPhone" type="tel" class="profile-input" />
          <p v-if="form.emergencyPhone && !isValidTaiwanPhone(form.emergencyPhone)" class="mt-1 text-xs text-red-500">
            電話格式不正確
          </p>
        </div>
      </div>
    </section>

    <!-- 電子發票 -->
    <section>
      <h3 class="profile-section-title">電子發票</h3>
      <div class="grid gap-5 sm:grid-cols-2">
        <div>
          <label for="profile-carrier" class="profile-label">手機條碼載具</label>
          <input
            id="profile-carrier"
            v-model="form.invoiceCarrier"
            maxlength="8"
            placeholder="/ABC1234"
            class="profile-input uppercase"
            @input="form.invoiceCarrier = form.invoiceCarrier.toUpperCase()"
          />
          <p v-if="form.invoiceCarrier && !isValidCarrier(form.invoiceCarrier)" class="mt-1 text-xs text-red-500">
            「/」開頭加 7 碼英數字
          </p>
        </div>
        <div>
          <label for="profile-tax-id" class="profile-label">公司統一編號</label>
          <input
            id="profile-tax-id"
            v-model="form.taxId"
            inputmode="numeric"
            maxlength="8"
            placeholder="需要打統編時填寫"
            class="profile-input"
          />
          <p v-if="form.taxId && !isValidTaxId(form.taxId)" class="mt-1 text-xs text-red-500">
            統一編號不正確，請再確認一次
          </p>
        </div>
      </div>
    </section>

    <!-- 通知 -->
    <section>
      <h3 class="profile-section-title">通知設定</h3>
      <label class="flex cursor-pointer items-start gap-3 rounded-2xl border border-primary-100 p-4">
        <input v-model="form.marketingOptIn" type="checkbox" class="mt-0.5 h-4 w-4 shrink-0 accent-primary-600" />
        <span>
          <span class="block text-sm font-medium text-cocoa">接收優惠活動與新療程消息</span>
          <span class="block text-xs text-gray-500">會寄到你的信箱，隨時可以在這裡取消</span>
        </span>
      </label>
    </section>

    <div class="flex justify-end">
      <button
        type="submit"
        class="btn-cute px-8 py-2.5 disabled:opacity-50 disabled:pointer-events-none"
        :disabled="saving"
      >
        <LoadingSpinner v-if="saving" size="sm" />
        <template v-else>儲存變更</template>
      </button>
    </div>
  </form>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useToast } from 'vue-toastification'
import apiClient from '@/api/client'
import { useAuthStore } from '@/stores/auth'
import { isValidTaiwanPhone } from '@/utils/phone'
import { isValidCarrier, isValidTaxId, TW_CITIES } from '@/utils/invoice'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'

const GENDERS = [
  { value: 'female', label: '女' },
  { value: 'male', label: '男' },
  { value: 'other', label: '不透露' }
]

const toast = useToast()
const authStore = useAuthStore()
const user = computed(() => authStore.user)
const today = new Date().toISOString().slice(0, 10)

const form = ref({
  name: user.value?.name || '',
  phone: user.value?.phone || '',
  birthday: user.value?.birthday || '',
  gender: user.value?.gender || '',
  city: user.value?.city || '',
  address: user.value?.address || '',
  emergencyName: user.value?.emergency_name || '',
  emergencyPhone: user.value?.emergency_phone || '',
  invoiceCarrier: user.value?.invoice_carrier || '',
  taxId: user.value?.tax_id || '',
  marketingOptIn: !!user.value?.marketing_opt_in
})
const saving = ref(false)

// 送出前先在前端擋掉格式錯誤，後端也會再檢查一次
const firstError = () => {
  const f = form.value
  if (f.phone && !isValidTaiwanPhone(f.phone)) return '聯絡電話格式不正確'
  if (f.emergencyPhone && !isValidTaiwanPhone(f.emergencyPhone)) return '緊急聯絡人電話格式不正確'
  if (f.invoiceCarrier && !isValidCarrier(f.invoiceCarrier)) return '手機條碼格式不正確'
  if (f.taxId && !isValidTaxId(f.taxId)) return '統一編號不正確'
  return ''
}

const save = async () => {
  const error = firstError()
  if (error) {
    toast.warning(error)
    return
  }
  saving.value = true
  try {
    const res = (await apiClient.put('/auth/profile', form.value)) as any
    authStore.setSession(authStore.token!, res.data)
    toast.success('資料已更新')
  } catch (error: any) {
    toast.error(error?.message || '更新失敗，請稍後再試')
  } finally {
    saving.value = false
  }
}
</script>
