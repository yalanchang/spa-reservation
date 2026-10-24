// 把本機資料庫（.env 的 DB_*）整份複製到另一個資料庫（TARGET_DB_*）：結構＋資料
//   TARGET_DB_HOST=… TARGET_DB_PORT=… TARGET_DB_USER=… TARGET_DB_PASSWORD=… TARGET_DB_NAME=… npm run db:copy
// 目標資料庫必須是空的，避免覆蓋到既有資料
import mysql from 'mysql2/promise'
import dotenv from 'dotenv'

dotenv.config()

const BATCH_SIZE = 500

const connect = (prefix: '' | 'TARGET_') =>
  mysql.createConnection({
    host: process.env[`${prefix}DB_HOST`],
    port: Number(process.env[`${prefix}DB_PORT`]) || 3306,
    user: process.env[`${prefix}DB_USER`],
    password: process.env[`${prefix}DB_PASSWORD`] || '',
    database: process.env[`${prefix}DB_NAME`],
    ssl: { rejectUnauthorized: false },
    // 日期維持原本的字串，不經過時區轉換
    dateStrings: true
  })

const main = async () => {
  const missing = ['TARGET_DB_HOST', 'TARGET_DB_USER', 'TARGET_DB_NAME'].filter((key) => !process.env[key])
  if (missing.length) {
    console.log(`缺少 ${missing.join('、')}`)
    console.log(
      '用法：TARGET_DB_HOST=… TARGET_DB_PORT=… TARGET_DB_USER=… TARGET_DB_PASSWORD=… TARGET_DB_NAME=… npm run db:copy'
    )
    process.exitCode = 1
    return
  }

  const sameDb =
    process.env.TARGET_DB_HOST === process.env.DB_HOST &&
    (Number(process.env.TARGET_DB_PORT) || 3306) === (Number(process.env.DB_PORT) || 3306) &&
    process.env.TARGET_DB_NAME === process.env.DB_NAME
  if (sameDb) {
    console.log('目標和來源是同一個資料庫，已停止')
    process.exitCode = 1
    return
  }

  console.log(`來源：${process.env.DB_HOST}/${process.env.DB_NAME}`)
  console.log(`目標：${process.env.TARGET_DB_HOST}/${process.env.TARGET_DB_NAME}\n`)

  // 任一邊連線失敗，都要把已經開啟的連線關掉，程式才會結束
  let source: mysql.Connection | undefined
  let target: mysql.Connection | undefined
  try {
    source = await connect('')
    target = await connect('TARGET_')

    const [existing] = await target.query<any[]>("SHOW FULL TABLES WHERE Table_type = 'BASE TABLE'")
    if (existing.length) {
      console.log(
        `目標資料庫已經有 ${existing.length} 張資料表（${existing.map((r) => Object.values(r)[0]).join('、')}），為了避免覆蓋資料已停止`
      )
      process.exitCode = 1
      return
    }

    const [tables] = await source.query<any[]>("SHOW FULL TABLES WHERE Table_type = 'BASE TABLE'")
    const names: string[] = tables.map((r) => String(Object.values(r)[0]))

    // 先關掉外鍵檢查，資料表就不用照相依順序建立
    await target.query('SET FOREIGN_KEY_CHECKS = 0')

    for (const name of names) {
      const [[create]] = await source.query<any[]>(`SHOW CREATE TABLE \`${name}\``)
      await target.query(create['Create Table'])

      const [rows] = await source.query<any[]>(`SELECT * FROM \`${name}\``)
      if (rows.length) {
        const columns = Object.keys(rows[0])
        const columnList = columns.map((c) => `\`${c}\``).join(', ')
        for (let i = 0; i < rows.length; i += BATCH_SIZE) {
          const batch = rows.slice(i, i + BATCH_SIZE).map((row) => columns.map((c) => row[c]))
          await target.query(`INSERT INTO \`${name}\` (${columnList}) VALUES ?`, [batch])
        }
      }
      console.log(`✔ ${name}：${rows.length} 筆`)
    }

    await target.query('SET FOREIGN_KEY_CHECKS = 1')

    // 核對兩邊筆數
    let mismatch = 0
    for (const name of names) {
      const [[a]] = await source.query<any[]>(`SELECT COUNT(*) AS n FROM \`${name}\``)
      const [[b]] = await target.query<any[]>(`SELECT COUNT(*) AS n FROM \`${name}\``)
      if (Number(a.n) !== Number(b.n)) {
        mismatch++
        console.log(`✘ ${name} 筆數不符：來源 ${a.n}、目標 ${b.n}`)
      }
    }
    console.log(mismatch ? '\n有資料表筆數不符，請檢查上面的訊息' : `\n完成，${names.length} 張資料表的筆數都一致`)
    if (mismatch) process.exitCode = 1
  } finally {
    await source?.end()
    await target?.end()
  }
}

main().catch((error) => {
  console.error('複製失敗：', error.message)
  process.exitCode = 1
})
