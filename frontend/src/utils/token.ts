// 解析 JWT 內容（只讀不驗證，驗證由後端負責）
const readPayload = (token: string | null): Record<string, any> | null => {
  try {
    const part = token?.split('.')[1]
    if (!part) return null
    const json = atob(part.replace(/-/g, '+').replace(/_/g, '/'))
    return JSON.parse(decodeURIComponent(escape(json)))
  } catch {
    return null
  }
}

// 是否為從後台登入頁登入、而且還沒過期的登入
export const hasAdminSession = (token: string | null) => {
  const payload = readPayload(token)
  return !!payload?.mfa && (!payload.exp || payload.exp * 1000 > Date.now())
}
