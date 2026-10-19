import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import useSWR from 'swr'
import MobileHeader from '@/components/shared/MobileHeader'
import SiteFooter from '@/components/shared/SiteFooter'
import SiteHeader from '@/components/shared/SiteHeader'
import TabBar from '@/components/shared/TabBar'
import { Ico } from '@/components/ui/icons'
import { api, put } from '@/lib/api'
import { getChoices, gpcSignal, saveConsent, type Choices } from '@/lib/consent'
import { library, useLibrary } from '@/lib/library'
import { errorMessage, useSession } from '@/lib/session'
import { isSection } from '@/lib/taxonomy'

type Account = {
  email: string
  display_name: string
  interests: string[]
  cookie_preferences: Choices
  language: 'en' | 'hi'
  timezone: string
  onboarding_completed: boolean
  streak_days: number
  longest_streak: number
  total_active_days: number
}

const INPUT = { height: '44px', border: '1px solid var(--bd)', borderRadius: '10px', padding: '0 14px', background: 'var(--bg)', color: 'var(--fg)', font: '400 15px Inter' } as const

function Switch({ title, hint, on, disabled, onChange }: { title: string; hint: string; on: boolean; disabled?: boolean; onChange?: (v: boolean) => void }) {
  return (
    <div className="lr" style={{ justifyContent: 'space-between', gap: '16px' }}>
      <div style={{ minWidth: 0 }}>
        <b style={{ fontWeight: 600 }}>{title}</b>
        <div className="mf">{hint}</div>
      </div>
      <label className="swl">
        <input type="checkbox" role="switch" aria-label={title} checked={on} disabled={disabled} onChange={(e) => onChange?.(e.target.checked)} />
        <span className="swt"><i /></span>
      </label>
    </div>
  )
}

export function AccountBody({ mobile }: { mobile: boolean }) {
  const { status, user, logout } = useSession()
  const navigate = useNavigate()
  const lib = useLibrary()
  const { data: account, mutate } = useSWR<Account>(status === 'authed' ? '/account' : null)
  const [name, setName] = useState('')
  const [note, setNote] = useState('')
  const [choices, setChoices] = useState<Choices | null>(null)
  const gpc = gpcSignal()
  useEffect(() => setChoices(getChoices()), [])
  useEffect(() => account && setName(account.display_name), [account])

  const save = async (patch: Partial<Account>) => {
    if (!account) return
    setNote('')
    try {
      const body = {
        display_name: patch.display_name ?? account.display_name,
        interests: lib.follow.filter(isSection).slice(0, 7),
        cookie_preferences: patch.cookie_preferences ?? getChoices() ?? account.cookie_preferences,
        timezone: account.timezone,
        language: patch.language ?? lib.lang,
        onboarding_completed: account.onboarding_completed,
      }
      await mutate(await put<Account>('/account', body), { revalidate: false })
      setNote('Saved.')
    } catch (e) {
      setNote(errorMessage(e))
    }
  }
  const setPrivacy = (patch: Partial<Choices>) => {
    const next = saveConsent({ ...(getChoices() ?? {}), ...patch }, 'preference_center')
    setChoices(next)
    void save({ cookie_preferences: next })
  }
  const download = async () => {
    const data = await api<unknown>('/me/export')
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }))
    const a = Object.assign(document.createElement('a'), { href: url, download: 'news-app-my-data.json' })
    a.click()
    URL.revokeObjectURL(url)
  }
  const signOut = async () => {
    await logout()
    navigate('/')
  }

  const pad = mobile ? '16px' : '24px'
  const guest = status !== 'authed'
  const sections = (
    <>
      <section className="card" id="profile" style={{ scrollMarginTop: '96px' }}>
        <div className="ch" style={mobile ? { padding: '18px 16px 14px' } : undefined}>
          <h2>Profile</h2>
          <p>{guest ? 'You are reading as a guest' : 'How the newsroom knows you'}</p>
        </div>
        {guest ? (
          <div style={{ padding: `0 ${pad} 24px`, display: 'grid', gap: 12 }}>
            <p className="mf" style={{ margin: 0 }}>Log in to keep your saved stories, followed desks and reading streak on every device.</p>
            <div className="row" style={{ flexWrap: 'wrap' }}>
              <Link to="/login" className="btn p">Log in</Link>
              <Link to="/signup" className="btn">Create account</Link>
            </div>
          </div>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault()
              void save({ display_name: name.trim() })
            }}
            style={{ padding: `0 ${pad} 24px`, display: 'grid', gap: 16 }}
          >
            <div style={{ display: 'grid', gridTemplateColumns: mobile ? '1fr' : '1fr 1fr', gap: '16px' }}>
              <label style={{ display: 'grid', gap: '6px', fontWeight: 500 }}>
                Display name
                <input type="text" value={name} minLength={1} maxLength={80} onChange={(e) => setName(e.target.value)} style={INPUT} />
              </label>
              <label style={{ display: 'grid', gap: '6px', fontWeight: 500 }}>
                Email address
                <input type="email" value={user?.email ?? ''} readOnly style={{ ...INPUT, color: 'var(--mf)' }} />
              </label>
            </div>
            <div className="row">
              <button className="btn p" type="submit" disabled={!name.trim()}>Save changes</button>
              {note ? <span role="status" className="mf">{note}</span> : null}
            </div>
          </form>
        )}
      </section>

      <section className="card" id="habits" style={{ scrollMarginTop: '96px' }}>
        <div className="ch" style={mobile ? { padding: '18px 16px 14px' } : undefined}>
          <h2>Reading</h2>
          <p>Language, desks and your streak</p>
        </div>
        <div className="lr" style={{ justifyContent: 'space-between', gap: '16px' }}>
          <div>
            <b style={{ fontWeight: 600 }}>Reading language</b>
            <div className="mf">Headlines and stories show in this language when a translation exists.</div>
          </div>
          <div className="sg" role="radiogroup" aria-label="Reading language">
            {(['en', 'hi'] as const).map((l) => (
              <label key={l}>
                <input type="radio" name={`lang-${mobile ? 'm' : 'd'}`} checked={lib.lang === l} onChange={() => (library.setLang(l), void save({ language: l }))} />
                <span lang={l === 'hi' ? 'hi' : undefined}>{l === 'en' ? 'English' : 'हिन्दी'}</span>
              </label>
            ))}
          </div>
        </div>
        <div className="lr" style={{ justifyContent: 'space-between', gap: '16px' }}>
          <div>
            <b style={{ fontWeight: 600 }}>Followed desks and writers</b>
            <div className="mf">{lib.follow.length ? `${lib.follow.length} followed` : 'You are not following anything yet'}</div>
          </div>
          <Link to="/following" className="btn">Manage</Link>
        </div>
        {account ? (
          <div className="lr" style={{ justifyContent: 'space-between', gap: '16px' }}>
            <div>
              <b style={{ fontWeight: 600 }}>Reading streak</b>
              <div className="mf">{account.streak_days} {account.streak_days === 1 ? 'day' : 'days'} in a row · best {account.longest_streak} · {account.total_active_days} days read</div>
            </div>
          </div>
        ) : null}
      </section>

      <section className="card" id="privacy" style={{ scrollMarginTop: '96px' }}>
        <div className="ch" style={mobile ? { padding: '18px 16px 14px' } : undefined}>
          <h2>Privacy</h2>
          <p>{gpc ? 'Your browser sent Global Privacy Control, so optional tracking stays off.' : 'Your choices are recorded and you can change them any time.'}</p>
        </div>
        <Switch title="Essential" hint="Sign-in, security and saved stories on this device. Always on." on disabled />
        <Switch title="Preferences" hint="Remember language and desks." on={choices?.preferences ?? true} onChange={(v) => setPrivacy({ preferences: v })} />
        <Switch title="Personalisation" hint="Tailor Today to the desks you follow." on={!gpc && !!choices?.personalization} disabled={gpc} onChange={(v) => setPrivacy({ personalization: v })} />
        <Switch title="Anonymous analytics" hint="Aggregated and anonymous. Never sold." on={!gpc && !!choices?.analytics} disabled={gpc} onChange={(v) => setPrivacy({ analytics: v })} />
        <div className="row" style={{ padding: `16px ${pad} 24px`, flexWrap: 'wrap' }}>
          {guest ? null : <button className="btn" onClick={() => void download()}>Download my data</button>}
          <Link to="/privacy" className="btn">Privacy policy</Link>
        </div>
      </section>
    </>
  )

  if (mobile)
    return (
      <div className="pg m" style={{ position: 'relative', minHeight: '100dvh', overflowX: 'clip' }}>
        <MobileHeader />
        <main id="main-m">
          <div style={{ padding: '20px 16px 12px' }}>
            <h1 style={{ margin: 0, font: '700 28px/1.15 Inter', letterSpacing: '-.02em' }}>{user?.display_name || 'You'}</h1>
            <p className="mf" style={{ margin: '4px 0 0', fontSize: '15px' }}>{user?.email ?? 'Account and privacy'}</p>
          </div>
          <div style={{ margin: '0 16px 20px', display: 'grid', gap: 16 }}>{sections}</div>
          {guest ? null : (
            <div style={{ margin: '0 16px 20px' }}>
              <button className="btn" style={{ width: '100%', color: '#DC2626' }} onClick={() => void signOut()}>Log out</button>
            </div>
          )}
        </main>
        <SiteFooter gutter={16} />
        <TabBar active="account" />
      </div>
    )

  const nav = [
    ['profile', 'Profile'],
    ['habits', 'Reading'],
    ['privacy', 'Privacy'],
  ] as const
  return (
    <div className="pg" style={{ minHeight: '100%' }}>
      <SiteHeader />
      <div className="cols-aside" style={{ maxWidth: '1200px', margin: 'auto', padding: '28px 40px 80px', display: 'grid', gridTemplateColumns: '280px minmax(0,1fr)', gap: '28px' }}>
        <aside style={{ position: 'sticky', top: '84px', alignSelf: 'start' }}>
          <div className="card">
            {nav.map(([id, label], i) => (
              <Link key={id} to={`/account#${id}`} className="lr an" style={{ padding: '14px 18px', ...(i === 0 ? { borderTop: 0 } : {}) }}>
                <b style={{ flex: 1, fontWeight: 600 }}>{label}</b>
                <span className="mf"><Ico name="chevron" size={16} /></span>
              </Link>
            ))}
            {guest ? null : (
              <button className="lr" onClick={() => void signOut()} style={{ padding: '14px 18px', color: '#DC2626', width: '100%', background: 'none', border: 0, borderTop: '1px solid var(--bd)', cursor: 'pointer', font: 'inherit', textAlign: 'left' }}>
                <b style={{ flex: 1, fontWeight: 600 }}>Log out</b>
              </button>
            )}
          </div>
        </aside>
        <main id="main" style={{ display: 'grid', gap: '24px', alignContent: 'start', minWidth: 0 }}>
          <h1 className="sr-only">Account</h1>
          {sections}
        </main>
      </div>
      <SiteFooter />
    </div>
  )
}
