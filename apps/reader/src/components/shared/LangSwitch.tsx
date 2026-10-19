import { useLocation, useNavigate } from 'react-router-dom'
import { library, useLang } from '@/lib/library'
import { track } from '@/lib/consent'
import type { Language } from '@/lib/types'

/** EN / हिं reading-language switch. On a story page it also moves to that story's other-language URL. */
export default function LangSwitch() {
  const lang = useLang()
  const { pathname, search } = useLocation()
  const navigate = useNavigate()
  const pick = (next: Language) => {
    if (next === lang) return
    library.setLang(next)
    track('language_switch', { language: next })
    const m = pathname.match(/^(?:\/hi)?(\/story\/.+)$/)
    if (m) navigate(`${next === 'hi' ? '/hi' : ''}${m[1]}${search}`, { replace: true })
  }
  const btn = (code: Language, label: string, hi?: boolean) => (
    <button
      type="button"
      lang={hi ? 'hi' : undefined}
      translate="no"
      aria-pressed={lang === code}
      onClick={() => pick(code)}
      style={{ height: 38, minWidth: 40, padding: '0 10px', borderRadius: 8, border: 0, cursor: 'pointer', font: '600 13px Inter', background: lang === code ? 'var(--card)' : 'transparent', color: lang === code ? 'var(--fg)' : 'var(--mf)', boxShadow: lang === code ? '0 1px 3px var(--sh)' : 'none' }}
    >
      {label}
    </button>
  )
  return (
    <div role="group" aria-label="Reading language" style={{ display: 'inline-flex', padding: 3, gap: 2, border: '1px solid var(--bd)', borderRadius: 12, background: 'var(--mu)', flex: 'none' }}>
      {btn('en', 'EN')}
      {btn('hi', 'हिं', true)}
    </div>
  )
}
