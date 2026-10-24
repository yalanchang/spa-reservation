import type { Directive } from 'vue'

// v-reveal：捲動到畫面內時淡入上浮；v-reveal="100" 可設定延遲毫秒，做出依序出現的效果
const observer =
  typeof IntersectionObserver !== 'undefined'
    ? new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              const el = entry.target as HTMLElement
              el.classList.add('is-revealed')
              observer?.unobserve(el)
              // 出場後清掉延遲，避免影響之後的互動動畫
              setTimeout(() => (el.style.transitionDelay = ''), 700 + (parseFloat(el.style.transitionDelay) || 0))
            }
          })
        },
        { threshold: 0.12 }
      )
    : null

export const reveal: Directive<HTMLElement, number | undefined> = {
  mounted(el, binding) {
    el.classList.add('reveal')
    if (binding.value) el.style.transitionDelay = `${binding.value}ms`
    if (observer) observer.observe(el)
    else el.classList.add('is-revealed')
  },
  unmounted(el) {
    observer?.unobserve(el)
  }
}

declare module 'vue' {
  interface ComponentCustomProperties {
    vReveal: typeof reveal
  }
}
