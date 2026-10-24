// 設定帳號角色：npm run set-role -- <email> <admin|staff|customer>
import { queryOne, execute, getPool } from '../models/db'

const ROLES = ['admin', 'staff', 'customer']

const main = async () => {
  const [email, role] = process.argv.slice(2)

  if (!email || !ROLES.includes(role)) {
    console.log('用法：npm run set-role -- <email> <admin|staff|customer>')
    process.exitCode = 1
    return
  }

  const user = await queryOne<any>('SELECT id, name, role FROM users WHERE email = ?', [email])
  if (!user) {
    console.log(`找不到帳號：${email}`)
    process.exitCode = 1
    return
  }

  await execute('UPDATE users SET role = ? WHERE id = ?', [role, user.id])
  console.log(`已將 ${user.name}（${email}）從 ${user.role} 改為 ${role}`)
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(() => getPool().end())
