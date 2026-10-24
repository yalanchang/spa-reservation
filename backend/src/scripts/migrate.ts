// 依檔名順序執行 migrations/ 裡的 SQL：npm run migrate
// 連線設定讀 .env（DB_HOST、DB_USER、DB_PASSWORD、DB_NAME…）
// 跑過的檔名記在 schema_migrations，下次自動跳過；第一支（init）是基準結構
import fs from 'fs'
import path from 'path'
import mysql from 'mysql2/promise'
import dotenv from 'dotenv'

dotenv.config()

const connect = (database?: string) =>
  mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database,
    ssl: { rejectUnauthorized: false },
    multipleStatements: true
  })

// 全新環境
const connectOrCreate = async (database: string) => {
  try {
    return await connect(database)
  } catch (error: any) {
    if (error.code !== 'ER_BAD_DB_ERROR') throw error
    const server = await connect()
    await server.query(
      `CREATE DATABASE \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    )
    await server.end()
    console.log(`已建立資料庫 ${database}`)
    return connect(database)
  }
}

const main = async () => {
  const dir = path.join(__dirname, '../../migrations')
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.sql')).sort()
  const database = process.env.DB_NAME || 'beauty_spa'
  const connection = await connectOrCreate(database)

  console.log(`資料庫：${process.env.DB_HOST}/${database}`)
  try {
    await connection.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        filename VARCHAR(255) PRIMARY KEY,
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)
    const [appliedRows] = await connection.query('SELECT filename FROM schema_migrations')
    const applied = new Set((appliedRows as any[]).map((row) => row.filename))

    // 
    const [userTables] = await connection.query("SHOW TABLES LIKE 'users'")
    if (applied.size === 0 && (userTables as any[]).length > 0) {
      await connection.query('INSERT INTO schema_migrations (filename) VALUES (?)', [files[0]])
      applied.add(files[0])
      console.log(`↷ ${files[0]}：既有資料庫，標記為已執行`)
    }

    const pending = files.filter((file) => !applied.has(file))
    if (pending.length === 0) console.log('沒有新的 migration')

    for (const file of pending) {
      const [results] = await connection.query(fs.readFileSync(path.join(dir, file), 'utf8'))
      await connection.query('INSERT INTO schema_migrations (filename) VALUES (?)', [file])
      const messages = (Array.isArray(results) ? results : [])
        .filter(Array.isArray)
        .flat()
        .map((row: any) => row.message)
        .filter(Boolean)
      console.log(`✔ ${file}${messages.length ? `：${messages.join('、')}` : ''}`)
    }
  } finally {
    await connection.end()
  }
}

main().catch((error) => {
  console.error('Migration 失敗：', error.message)
  process.exitCode = 1
})
