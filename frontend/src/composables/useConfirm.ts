import { reactive } from 'vue'

interface ConfirmOptions {
  title: string
  message?: string
  confirmText?: string
  cancelText?: string
  danger?: boolean
}

export const confirmState = reactive({
  open: false,
  options: { title: '' } as ConfirmOptions,
  resolve: null as ((value: boolean) => void) | null
})

// 取代瀏覽器的 confirm()，回傳使用者是否按下確認
export const useConfirm = () => (options: ConfirmOptions) =>
  new Promise<boolean>((resolve) => {
    confirmState.options = options
    confirmState.resolve = resolve
    confirmState.open = true
  })

export const closeConfirm = (result: boolean) => {
  confirmState.open = false
  confirmState.resolve?.(result)
  confirmState.resolve = null
}
