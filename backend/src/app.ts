import express from 'express'
import cors from 'cors'
import morgan from 'morgan'
import dotenv from 'dotenv'
import path from 'path'
import oauthRoutes from './routes/oauth.routes'
import authRoutes from './routes/auth.routes'
import servicesRoutes from './routes/services.routes'
import appointmentsRoutes from './routes/appointments.routes'
import staffRoutes from './routes/staff.routes'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3001

// 中間件
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.ALLOWED_ORIGIN 
    : 'http://localhost:3000',
  credentials: true
}))
app.use(morgan('dev'))
app.use(express.json())
app.use('/uploads', express.static(path.join(__dirname, '../public/uploads'))) 
app.use(express.urlencoded({ extended: true }))

// 路由
app.use('/api/auth', authRoutes)
app.use('/api/oauth', oauthRoutes)
app.use('/api/services', servicesRoutes)
app.use('/api/appointments', appointmentsRoutes)
app.use('/api/staff', staffRoutes)



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
  console.log(` 後端伺服器運行在 http://localhost:${PORT}`)
})

export default app