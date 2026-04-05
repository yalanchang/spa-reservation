import mysql from 'mysql2/promise'
import dotenv from 'dotenv'

dotenv.config()

let pool: mysql.Pool | null = null

export const getPool = (): mysql.Pool => {
  if (pool) return pool

  pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'beauty_spa',
    ssl: { rejectUnauthorized: false }, 
    waitForConnections: true,
    connectionLimit: 5,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0
  })

  return pool
}

export const query = async <T = any>(sql: string, params?: any[]): Promise<T[]> => {
  const [rows] = await getPool().execute(sql, params)
  return rows as T[]
}

export const queryOne = async <T = any>(sql: string, params?: any[]): Promise<T | null> => {
  const rows = await query<T>(sql, params)
  return rows[0] || null
}

export const execute = async (sql: string, params?: any[]): Promise<any> => {
  return await getPool().execute(sql, params)
}
