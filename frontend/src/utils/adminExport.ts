import apiClient from '@/api/client'

// 匯出要帶登入 token，不能直接開網址，先抓成檔案再觸發下載
export const downloadAppointmentsCsv = async (from: string, to: string) => {
  let blob: Blob
  try {
    blob = await apiClient.get('/admin/appointments/export', {
      params: { from, to },
      responseType: 'blob'
    }) as unknown as Blob
  } catch (error: any) {
    // 錯誤訊息也會是 Blob，轉回 JSON 才看得到原因
    if (error instanceof Blob) throw JSON.parse(await error.text())
    throw error
  }

  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `預約明細_${from}_${to}.csv`
  link.click()
  URL.revokeObjectURL(url)
}
