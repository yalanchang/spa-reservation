// 重設帳號密碼：npm run reset-password -- <email> <新密碼>
import bcrypt from 'bcryptjs'
import { queryOne, execute, getPool } from '../models/db'

const main = async () => {
  const [email, password] = process.argv.slice(2)

  if (!email || !password) {
    console.log('用法：npm run reset-password -- <email> <新密碼>')
    process.exitCode = 1
    return
  }

  if (password.length < 6) {
    console.log('新密碼至少要 6 個字元')
    process.exitCode = 1
    return
  }

  const user = await queryOne<any>('SELECT id, name FROM users WHERE email = ?', [email])
  if (!user) {
    console.log(`找不到帳號：${email}`)
    process.exitCode = 1
    return
  }

  // 與註冊時相同的加密方式
  const hashed = await bcrypt.hash(password, 12)
  await execute('UPDATE users SET password = ? WHERE id = ?', [hashed, user.id])
  console.log(`已重設 ${user.name}（${email}）的密碼`)
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(() => getPool().end())
