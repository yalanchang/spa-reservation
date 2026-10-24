import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import Toast, { POSITION } from 'vue-toastification'
import 'vue-toastification/dist/index.css'
import { reveal } from './directives/reveal'
import './style.css'  

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)
app.use(Toast, {
  position: POSITION.TOP_CENTER,
  timeout: 2500,
  maxToasts: 1,
  draggable: false,
  closeButton: false,
  hideProgressBar: true,
  newestOnTop: true
})
app.directive('reveal', reveal)

// 日期、時間欄位點任何地方都直接打開選擇器，不用對準右邊的小圖示
document.addEventListener('click', (event) => {
  const target = event.target
  if (!(target instanceof HTMLInputElement) || !['date', 'time'].includes(target.type)) return
  if (target.disabled || target.readOnly) return
  try {
    target.showPicker()
  } catch {
    // 舊瀏覽器沒有 showPicker，維持原本的行為
  }
})
app.mount('#app')
