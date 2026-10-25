// 後台展示帳號：給面試官／訪客一鍵登入操作後台（擋掉的動作見 middleware 的 guardDemoAccount）
// 環境變數 ADMIN_DEMO_LOGIN=true 才開放
export const DEMO_ADMIN_EMAIL = 'demo-admin@spa-demo.local'

export const demoLoginEnabled = () => process.env.ADMIN_DEMO_LOGIN === 'true'
