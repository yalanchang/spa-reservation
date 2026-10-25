import express from 'express'
import cors from 'cors'
import morgan from 'morgan'
import dotenv from 'dotenv'
import oauthRoutes from './routes/oauth.routes'
import authRoutes from './routes/auth.routes'
import servicesRoutes from './routes/services.routes'
import appointmentsRoutes from './routes/appointments.routes'
import reviewsRoutes from './routes/reviews.routes'
import adminRoutes from './routes/admin.routes'
import { warmUpMailer } from './utils/mailer'
import staffRoutes from './routes/staff.routes'
import siteRoutes from './routes/site.routes'
import couponsRoutes from './routes/coupons.routes'
import { query } from './models/db'
import { guardDemoAccount } from './middleware/auth.middleware'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3001

// 中間件
app.use(
  cors({
    origin: process.env.NODE_ENV === 'production' ? process.env.ALLOWED_ORIGIN : 'http://localhost:3000',
    credentials: true
  })
)
app.use(morgan('dev'))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
// 展示帳號不能變更帳號權限與個人資料
app.use(guardDemoAccount)

// 路由
app.use('/api/auth', authRoutes)
app.use('/api/oauth', oauthRoutes)
app.use('/api/services', servicesRoutes)
app.use('/api/appointments', appointmentsRoutes)
app.use('/api/reviews', reviewsRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/staff', staffRoutes)
app.use('/api/site', siteRoutes)
app.use('/api/coupons', couponsRoutes)

// 健康檢查：GitHub Actions 定時呼叫，讓 Render 和 Aiven 資料庫保持活動
app.get('/api/health', async (req, res) => {
  try {
    await query('SELECT 1')
    res.json({ success: true, db: 'ok' })
  } catch (error: any) {
    res.status(503).json({ success: false, db: error.code || error.message })
  }
})

// 404 處理
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: '找不到此路由'
  })
})

// 錯誤
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Server error:', err.stack)
  res.status(500).json({
    success: false,
    message: '伺服器錯誤'
  })
})

app.listen(PORT, () => {
  warmUpMailer()
  console.log(` 後端伺服器運行在 http://localhost:${PORT}`)
})

export default app
