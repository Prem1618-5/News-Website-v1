import { Suspense, useEffect } from 'react'
import { Route, Routes, useLocation } from 'react-router-dom'
import ConsentBanner from '@/components/shared/ConsentBanner'
import { track } from '@/lib/consent'
import ScrollToTop from '@/lib/ScrollToTop'
import { NotFoundScreen, ROUTES, lazyScreens } from './routes'

/** Counts page views for readers who allowed analytics. */
function Analytics() {
  const { pathname } = useLocation()
  useEffect(() => {
    const internal = !!document.referrer && new URL(document.referrer).origin === location.origin
    track('page_view', { referrer_kind: internal ? 'internal' : document.referrer ? 'search' : 'direct' })
  }, [pathname])
  return null
}

function SkipLink() {
  return (
    <a
      className="skip-link"
      href="#main"
      onClick={(e) => {
        const main = [...document.querySelectorAll<HTMLElement>('main')].find((m) => m.offsetParent !== null)
        if (main) {
          e.preventDefault()
          main.tabIndex = -1
          main.focus()
        }
      }}
    >
      Skip to content
    </a>
  )
}

export default function App() {
  return (
    <>
      <SkipLink />
      <ScrollToTop />
      <Analytics />
      <Suspense fallback={null}>
        <Routes>
          {ROUTES.map((r) => {
            const Screen = lazyScreens.get(r.path)!
            return <Route key={r.path} path={r.path} element={<Screen />} />
          })}
          <Route path="*" element={<NotFoundScreen />} />
        </Routes>
      </Suspense>
      <ConsentBanner />
    </>
  )
}
