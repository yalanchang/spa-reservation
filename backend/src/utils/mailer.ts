import dns from 'dns'
import fs from 'fs'
import net from 'net'
import path from 'path'
import nodemailer from 'nodemailer'

interface Mail {
  to: string
  subject: string
  text: string
  html: string
}

// 有設定 SMTP 才真的寄信；沒設定時把信件內容寫進 backend/logs/dev-mail.log，方便本機測試
const DEV_MAIL_LOG = path.join(__dirname, '../../logs/dev-mail.log')

// nodemailer 10 會自己查 DNS，在部分網路（DNS 伺服器是 IPv6）會卡住很久；
// 改用系統的查詢先拿到 IPv4，記住 10 分鐘，憑證仍以原本的主機名稱檢查
const DNS_CACHE_MS = 10 * 60 * 1000
let cachedAddress: { host: string; address: string; at: number } | null = null

const resolveSmtpAddress = async (host: string): Promise<string> => {
  if (net.isIP(host)) return host
  if (cachedAddress?.host === host && Date.now() - cachedAddress.at < DNS_CACHE_MS) return cachedAddress.address
  const { address } = await dns.promises.lookup(host, { family: 4 })
  cachedAddress = { host, address, at: Date.now() }
  return address
}

// 伺服器啟動時先查好寄信主機，第一封信就不用等 DNS
export const warmUpMailer = () => {
  if (!process.env.SMTP_HOST) return
  resolveSmtpAddress(process.env.SMTP_HOST).catch((error) => console.error('Resolve SMTP host error:', error))
}

export const sendMail = async (mail: Mail): Promise<void> => {
  if (!process.env.SMTP_HOST) {
    const entry = `[${new Date().toLocaleString('zh-TW')}] 收件人：${mail.to}\n主旨：${mail.subject}\n${mail.text}\n\n`
    fs.mkdirSync(path.dirname(DEV_MAIL_LOG), { recursive: true })
    fs.appendFileSync(DEV_MAIL_LOG, entry)
    console.log(`\n[寄信模擬，已寫入 logs/dev-mail.log]\n${entry}`)
    return
  }

  const host = process.env.SMTP_HOST
  const port = Number(process.env.SMTP_PORT) || 587
  const address = await resolveSmtpAddress(host)

  const transporter = nodemailer.createTransport({
    host: address,
    port,
    secure: port === 465,
    auth: {
      user: process.env.SMTP_USER,
      // Google 應用程式密碼複製時常帶空格，去掉才是正確的密碼
      pass: (process.env.SMTP_PASS || '').replace(/\s/g, '')
    },
    tls: { servername: host },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 20000
  })

  await transporter.sendMail({
    from: process.env.MAIL_FROM || process.env.SMTP_USER,
    ...mail
  })
}
