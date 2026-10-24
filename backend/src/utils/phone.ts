// 去掉空白、-、括號，+886 轉成 0
export const normalizeTaiwanPhone = (phone: string) =>
  phone.replace(/[\s\-()]/g, '').replace(/^\+886/, '0')

// 手機：09 開頭共 10 碼；市話：02–08 區碼開頭共 9–10 碼
export const isValidTaiwanPhone = (phone: string) => {
  const p = normalizeTaiwanPhone(phone)
  return /^09\d{8}$/.test(p) || /^0[2-8]\d{7,8}$/.test(p)
}
