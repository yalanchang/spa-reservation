const BRAND = '#d63d6a'
const BRAND_LIGHT = '#fff5f7'
const BRAND_BORDER = '#ffccd8'
const TEXT = '#5b4a4f'
const MUTED = '#9a8a8f'

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)

interface CodeMail {
  name: string
  title: string
  action: string
  code: string
  minutes: number
  sentAt: string
}

export const verificationCodeHtml = ({ name, title, action, code, minutes, sentAt }: CodeMail) => `<!doctype html>
<html lang="zh-Hant">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:0;background:#fffaf7;">
<!-- 收件匣預覽文字 -->
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">你的驗證碼是 ${code}，${minutes} 分鐘內有效</div>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#fffaf7;">
  <tr>
    <td align="center" style="padding:32px 16px;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;background:#ffffff;border-radius:20px;overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,'PingFang TC','Microsoft JhengHei',sans-serif;">
        <tr>
          <td style="background:${BRAND};padding:22px 32px;">
            <p style="margin:0;color:#ffffff;font-size:13px;letter-spacing:3px;">K-BEAUTY SPA</p>
            <p style="margin:4px 0 0;color:#ffffff;font-size:20px;font-weight:bold;">美容預約系統</p>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;">
            <p style="margin:0;color:${TEXT};font-size:16px;">${escapeHtml(name)} 你好：</p>
            <p style="margin:12px 0 0;color:${TEXT};font-size:15px;line-height:1.7;">
              您正在${escapeHtml(action)}，請在頁面輸入下方的驗證碼：
            </p>

            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:24px 0;">
              <tr>
                <td align="center" style="background:${BRAND_LIGHT};border:1px dashed ${BRAND_BORDER};border-radius:16px;padding:24px 12px;">
                  <p style="margin:0;color:${MUTED};font-size:13px;">${escapeHtml(title)}</p>
                  <p style="margin:8px 0 0;color:${BRAND};font-size:38px;font-weight:bold;letter-spacing:12px;font-family:'SFMono-Regular',Menlo,Consolas,monospace;">${code}</p>
                  <p style="margin:8px 0 0;color:${MUTED};font-size:13px;">${sentAt} 寄出，${minutes} 分鐘內有效</p>
                </td>
              </tr>
            </table>

            <p style="margin:0;color:${MUTED};font-size:13px;line-height:1.7;">
              重新寄送後，舊的驗證碼就會失效，請以最新一封為準。<br>
              如果不是你本人操作，請忽略這封信，你的帳號不會有任何變更。
            </p>
          </td>
        </tr>
        <tr>
          <td style="border-top:1px solid ${BRAND_LIGHT};padding:20px 32px;background:#fffafb;">
            <p style="margin:0;color:${MUTED};font-size:12px;line-height:1.8;">
              美容預約系統<br>
              台北市信義區　02-1234-5678<br>
              此信由系統自動寄出，請勿直接回覆。
            </p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`
