import { useEffect, useState } from 'react'
import { useLang } from '@/lib/library'
import { useMounted } from '@/lib/hooks'

interface InstallEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const DISMISSED = 'news-install-dismissed'
const VISITS = 'news-visits'
const QUIET_DAYS = 14

let deferred: InstallEvent | null = null
const listeners = new Set<() => void>()
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    deferred = e as InstallEvent
    listeners.forEach((l) => l())
  })
}

const read = (k: string) => {
  try {
    return localStorage.getItem(k)
  } catch {
    return null
  }
}
const write = (k: string, v: string) => {
  try {
    localStorage.setItem(k, v)
  } catch {
    /* private mode */
  }
}

/**
 * "Add News APP to your home screen", on phones only, from the second visit, a few seconds in, never over the
 * consent banner's first showing. Chrome/Android use the browser's own install dialog; iPhone Safari gets the
 * Share → Add to Home Screen hint. Dismissal is remembered for two weeks.
 */
export default function InstallSheet() {
  const mounted = useMounted()
  const hi = useLang() === 'hi'
  const [show, setShow] = useState(false)
  const [ios, setIos] = useState(false)

  useEffect(() => {
    if (!mounted) return
    const standalone = matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true
    const phone = matchMedia('(max-width: 767.98px)').matches
    const quiet = Date.now() - Number(read(DISMISSED) ?? 0) < QUIET_DAYS * 86_400_000
    const visits = Number(read(VISITS) ?? 0) + 1
    write(VISITS, String(visits))
    if (standalone || !phone || quiet || visits < 2) return
    const ua = navigator.userAgent
    const isIos = /iphone|ipad|ipod/i.test(ua) && /safari/i.test(ua) && !/crios|fxios|edgios/i.test(ua)
    setIos(isIos)
    const ready = () => (deferred || isIos) && setShow(true)
    const t = window.setTimeout(ready, 8000)
    listeners.add(ready)
    return () => {
      window.clearTimeout(t)
      listeners.delete(ready)
    }
  }, [mounted])

  if (!show) return null
  const close = () => {
    write(DISMISSED, String(Date.now()))
    setShow(false)
  }
  return (
    <div role="dialog" aria-label={hi ? 'ऐप इंस्टॉल करें' : 'Install the app'} className="card" style={{ position: 'fixed', left: 12, right: 12, bottom: 'calc(96px + env(safe-area-inset-bottom))', zIndex: 20, padding: '16px', boxShadow: '0 14px 34px var(--sh)' }}>
      <div className="row" style={{ gap: '12px', alignItems: 'flex-start' }}>
        <img src="/icon-192.png" alt="" width={44} height={44} style={{ borderRadius: '10px' }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <b style={{ display: 'block', fontSize: '15px' }}>{hi ? 'News APP को होम स्क्रीन पर रखें' : 'Add News APP to your home screen'}</b>
          <span className="mf sm" style={{ display: 'block', marginTop: '2px' }}>
            {ios
              ? hi ? 'नीचे शेयर बटन दबाएँ, फिर “होम स्क्रीन में जोड़ें”।' : 'Tap the Share button below, then “Add to Home Screen”.'
              : hi ? 'एक टैप में खुलता है, कमज़ोर नेटवर्क पर भी।' : 'Opens in one tap, even on a weak connection.'}
          </span>
        </div>
        <button type="button" className="ib" aria-label={hi ? 'बंद करें' : 'Close'} onClick={close}>×</button>
      </div>
      {!ios ? (
        <button
          type="button"
          className="btn p"
          style={{ width: '100%', marginTop: '12px' }}
          onClick={async () => {
            if (!deferred) return close()
            await deferred.prompt()
            const { outcome } = await deferred.userChoice
            deferred = null
            if (outcome !== 'accepted') close()
            else setShow(false)
          }}
        >
          {hi ? 'इंस्टॉल करें' : 'Install'}
        </button>
      ) : null}
    </div>
  )
}
