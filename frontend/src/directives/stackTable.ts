import type { Directive } from 'vue'

// v-stack-table：手機上把表格的每一列排成卡片，不用左右捲動（樣式在 style.css 的 .stack-table）
// 從表頭抓欄位名稱寫到每一格的 data-label；第一個有名稱的欄位當卡片標題
// 每一格都要顯示欄位名稱（例如一列數字的摘要表）就用 v-stack-table.notitle
const label = (table: HTMLTableElement, withTitle: boolean) => {
  const headers = [...table.querySelectorAll('thead th')].map((th) =>
    th.querySelector('.sr-only') ? '' : (th.textContent || '').trim()
  )
  const titleIndex = withTitle ? headers.findIndex(Boolean) : -1

  table.querySelectorAll('tbody tr').forEach((tr) => {
    ;[...tr.children].forEach((td, i) => {
      if (td.hasAttribute('colspan')) return
      if (headers[i]) td.setAttribute('data-label', headers[i])
      else td.removeAttribute('data-label')
      td.toggleAttribute('data-stack-title', i === titleIndex)
    })
  })
}

export const stackTable: Directive<HTMLTableElement> = {
  mounted(el, binding) {
    el.classList.add('stack-table')
    label(el, !binding.modifiers.notitle)
  },
  updated(el, binding) {
    label(el, !binding.modifiers.notitle)
  }
}
