export const STATUS_LABELS: Record<string, string> = {
  pending: '待確認',
  confirmed: '已確認',
  completed: '已完成',
  cancelled: '已取消',
  no_show: '未到店'
}

// 後台狀態標籤的顏色
export const STATUS_CLASSES: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-700',
  confirmed: 'bg-green-50 text-green-700',
  completed: 'bg-blue-50 text-blue-700',
  cancelled: 'bg-gray-100 text-gray-500',
  no_show: 'bg-red-50 text-red-600'
}

// 後台把預約改成某個狀態時的按鈕文字
export const STATUS_ACTIONS: Record<string, string> = {
  confirmed: '確認預約',
  completed: '標記完成',
  no_show: '未到店',
  cancelled: '取消預約'
}

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六']

// 10/24（五）
export const formatDateWithWeekday = (value: string) => {
  const d = new Date(value)
  return `${d.getMonth() + 1}/${d.getDate()}（${WEEKDAYS[d.getDay()]}）`
}
