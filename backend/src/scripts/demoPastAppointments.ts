// 建立「已完成」的過去預約，方便測試寫心得
//   npm run demo:past -- <email>          建立 3 筆
//   npm run demo:past -- <email> --clear  刪除這個指令建立的預約（連同心得）
import { query, queryOne, execute, getPool } from '../models/db'

const main = async () => {
  const [email, flag] = process.argv.slice(2)
  if (!email) {
    console.log('用法：npm run demo:past -- <email> [--clear]')
    process.exitCode = 1
    return
  }

  const user = await queryOne<any>('SELECT id, name, phone FROM users WHERE email = ?', [email])
  if (!user) {
    console.log(`找不到帳號：${email}`)
    process.exitCode = 1
    return
  }

  if (flag === '--clear') {
    const [result] = await execute(
      "DELETE FROM appointments WHERE user_id = ? AND appointment_no LIKE 'DEMO-%'",
      [user.id]
    )
    console.log(`已刪除 ${(result as any).affectedRows} 筆模擬預約`)
    return
  }

  const services = await query<any>('SELECT id, name, duration, price FROM services WHERE is_active = 1 ORDER BY id LIMIT 3')
  const staff = await query<any>('SELECT id, name FROM staff WHERE is_active = 1 ORDER BY id')

  for (const [i, service] of services.entries()) {
    const daysAgo = (i + 1) * 3
    const start = `${String(10 + i * 2).padStart(2, '0')}:00`
    const endMinutes = (10 + i * 2) * 60 + service.duration
    const end = `${String(Math.floor(endMinutes / 60)).padStart(2, '0')}:${String(endMinutes % 60).padStart(2, '0')}`
    const stylist = staff[i % staff.length]

    await execute(
      `INSERT INTO appointments
         (appointment_no, user_id, staff_id, service_id, customer_name, customer_phone,
          appointment_date, start_time, end_time, duration, price, status)
       VALUES (?, ?, ?, ?, ?, ?, DATE_SUB(CURDATE(), INTERVAL ? DAY), ?, ?, ?, ?, 'completed')`,
      [
        `DEMO-${Date.now()}-${i}`, user.id, stylist.id, service.id,
        user.name, user.phone || '0912345678',
        daysAgo, start, end, service.duration, service.price
      ]
    )
    console.log(`✔ ${daysAgo} 天前 ${start}「${service.name}」美容師 ${stylist.name}`)
  }
  console.log(`已替 ${user.name}（${email}）建立 ${services.length} 筆已完成的預約，到「我的預約」就能寫心得`)
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(() => getPool().end())
