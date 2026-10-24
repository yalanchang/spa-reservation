// 電子發票手機條碼：「/」加 7 碼（數字、大寫英文、. + -）
export const isValidCarrier = (value: string) => /^\/[0-9A-Z.+-]{7}$/.test(value)

// 統一編號：8 碼數字，依財政部規則檢查（112 年起檢查碼改為能被 5 整除）
export const isValidTaxId = (value: string) => {
  if (!/^\d{8}$/.test(value)) return false
  const weights = [1, 2, 1, 2, 1, 2, 4, 1]
  const digitSum = (n: number) => Math.floor(n / 10) + (n % 10)
  const sum = weights.reduce((total, w, i) => total + digitSum(Number(value[i]) * w), 0)
  // 第 7 碼是 7 時，乘積 28 的「2+8」可算 10 或 1，兩種都要試
  return sum % 5 === 0 || (value[6] === '7' && (sum + 1) % 5 === 0)
}

export const TW_CITIES = [
  '臺北市', '新北市', '桃園市', '臺中市', '臺南市', '高雄市',
  '基隆市', '新竹市', '嘉義市', '新竹縣', '苗栗縣', '彰化縣',
  '南投縣', '雲林縣', '嘉義縣', '屏東縣', '宜蘭縣', '花蓮縣',
  '臺東縣', '澎湖縣', '金門縣', '連江縣'
]
