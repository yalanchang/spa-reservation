import { afterEach, describe, expect, it, vi } from 'vitest'
import { sendMail } from './mailer'

const mail = { to: 'user@example.com', subject: '驗證碼：123456', text: '你的驗證碼是 123456', html: '<p>123456</p>' }

describe('sendMail（Brevo）', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it('有 BREVO_API_KEY 時呼叫 Brevo API，並解析「名稱 <email>」寄件人', async () => {
    vi.stubEnv('BREVO_API_KEY', 'test-key')
    vi.stubEnv('MAIL_FROM', '美容預約系統 <spa@example.com>')
    const fetchMock = vi.fn().mockResolvedValue({ ok: true })
    vi.stubGlobal('fetch', fetchMock)

    await sendMail(mail)

    const [url, options] = fetchMock.mock.calls[0]
    expect(url).toBe('https://api.brevo.com/v3/smtp/email')
    expect(options.headers['api-key']).toBe('test-key')
    expect(JSON.parse(options.body)).toEqual({
      sender: { name: '美容預約系統', email: 'spa@example.com' },
      to: [{ email: 'user@example.com' }],
      subject: mail.subject,
      textContent: mail.text,
      htmlContent: mail.html
    })
  })

  it('Brevo 回傳錯誤時丟出例外', async () => {
    vi.stubEnv('BREVO_API_KEY', 'test-key')
    vi.stubEnv('MAIL_FROM', 'spa@example.com')
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 401, text: async () => 'unauthorized' }))

    await expect(sendMail(mail)).rejects.toThrow('Brevo 寄信失敗（401）')
  })
})

describe('sendMail（沒有設定寄信）', () => {
  afterEach(() => vi.unstubAllEnvs())

  it('正式環境直接報錯，不假裝寄成功', async () => {
    vi.stubEnv('BREVO_API_KEY', '')
    vi.stubEnv('SMTP_HOST', '')
    vi.stubEnv('NODE_ENV', 'production')

    await expect(sendMail(mail)).rejects.toThrow('正式環境沒有設定寄信')
  })
})
