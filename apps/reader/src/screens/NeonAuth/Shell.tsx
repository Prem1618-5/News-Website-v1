import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { NeonAuthUIProvider } from '@neondatabase/neon-js/auth/react'
import { AccountView, AuthView } from '@neondatabase/neon-js/auth/react/ui'
// Prebuilt styles for the sign-in widgets. They are global once loaded, so leaving these screens does a full page
// load (see `navigate` below) instead of a client-side hop, which keeps them away from the rest of the site.
import '@neondatabase/neon-js/ui/css'
import { Seo } from '@/lib/head'
import { getNeon } from '@/lib/neon'
import { NEON_AUTH_URL, markNeonUser } from '@/lib/neonToken'

const AUTH_BASE = '/auth'
const ACCOUNT_BASE = '/neon-account'

/** Neon Auth sign-in and account pages. Browser only: nothing renders until the page has mounted. */
export function NeonShell({ view }: { view: 'auth' | 'account' }) {
  const { pathname } = useParams()
  const nav = useNavigate()
  const [client, setClient] = useState<ReturnType<typeof getNeon> | null>(null)

  useEffect(() => {
    if (!NEON_AUTH_URL) return
    markNeonUser(true)
    // The auth client is a callable Proxy, so it must be wrapped: a bare function would be run as a state updater.
    setClient(() => getNeon())
  }, [])

  return (
    <main style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', padding: 16 }}>
      <Seo title={view === 'auth' ? 'Sign in' : 'Your account'} description="Sign in to save stories and follow topics." path={`${view === 'auth' ? AUTH_BASE : ACCOUNT_BASE}/${pathname ?? ''}`} noindex />
      {!NEON_AUTH_URL ? (
        <p>This sign-in option is not set up on this site.</p>
      ) : client ? (
        <NeonAuthUIProvider
          authClient={client}
          emailOTP
          basePath={AUTH_BASE}
          account={{ basePath: ACCOUNT_BASE }}
          navigate={(href: string) => (href.startsWith(AUTH_BASE) || href.startsWith(ACCOUNT_BASE) ? nav(href) : window.location.assign(href))}
          replace={(href: string) => (href.startsWith(AUTH_BASE) || href.startsWith(ACCOUNT_BASE) ? nav(href, { replace: true }) : window.location.replace(href))}
        >
          {view === 'auth' ? <AuthView pathname={pathname} /> : <AccountView pathname={pathname} />}
        </NeonAuthUIProvider>
      ) : null}
    </main>
  )
}
