import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { put } from '@/lib/api'
import { getChoices, saveConsent } from '@/lib/consent'
import { library, useLibrary } from '@/lib/library'
import { useSession } from '@/lib/session'
import { SECTIONS, isSection, sectionAbout, sectionName } from '@/lib/taxonomy'
import { Ico, SectionIcon } from '@/components/ui/icons'

const bar = (width: string) => (
  <div style={{ height: '6px', borderRadius: '3px', background: 'var(--mu)' }}>
    <div style={{ width, height: '6px', borderRadius: '3px', background: 'var(--pr)', transition: 'width .4s' }} />
  </div>
)

function Shell({ mobile, step, children, footer }: { mobile: boolean; step: 1 | 2; children: React.ReactNode; footer: React.ReactNode }) {
  const gutter = mobile ? '16px' : '24px'
  return (
    <div className={mobile ? 'pg m' : 'pg'} style={mobile ? { position: 'relative', minHeight: '100dvh', overflowX: 'clip' } : { minHeight: '100%' }}>
      <div className="ob">
        <header className="row" style={{ maxWidth: '880px', margin: 'auto', padding: `0 ${gutter}`, height: '72px' }}>
          <Link to="/" className="row" style={{ font: '700 20px Inter', gap: '10px' }}>
            <span style={{ width: '32px', height: '32px', borderRadius: '9px', background: 'var(--pr)', color: '#fff', display: 'grid', placeItems: 'center', fontSize: '17px' }}>N</span>
            <span translate="no">News APP</span>
          </Link>
          <span style={{ flex: '1' }} />
          <span className="mf">Step {step} of 2</span>
        </header>
        <main style={{ maxWidth: '880px', margin: 'auto', padding: `16px ${gutter} ${mobile ? '120px' : '64px'}`, display: 'grid', gap: '24px' }}>
          {bar(step === 1 ? '50%' : '100%')}
          {children}
          {mobile ? null : footer}
        </main>
        {mobile ? (
          <div className="row" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: '16px', background: 'var(--glass)', backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)', borderTop: '1px solid var(--bd)', justifyContent: 'flex-end' }}>
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  )
}

/** Step 1: pick desks (any of the 13) and the reading language. */
export function OnboardingStep1({ mobile }: { mobile: boolean }) {
  const { follow } = useLibrary()
  const { user } = useSession()
  const first = user?.display_name.split(' ')[0]
  const [english, setEnglish] = useState(true)
  const [hindi, setHindi] = useState(true)
  const desks = follow.filter(isSection)
  const toggle = (k: string) => library.setFollow(follow.includes(k) ? follow.filter((x) => x !== k) : [...follow, k])
  const next = () => {
    if (hindi && !english) library.setLang('hi')
    if (english && !hindi) library.setLang('en')
  }
  return (
    <Shell
      mobile={mobile}
      step={1}
      footer={
        <>
          <span className="mf need" style={{ marginRight: 'auto' }}>Choose at least one topic</span>
          <Link to="/onboarding/2" className="btn p cta" onClick={next}>Continue</Link>
        </>
      }
    >
      <div>
        <h1 className="ser" style={{ margin: '0 0 8px', font: mobile ? '600 32px/1.1 Lora' : '600 40px/1.1 Lora' }}>{first ? `Good to have you, ${first}.` : 'Good to have you.'}</h1>
        <p className="mf" style={{ margin: '0', fontSize: '17px' }}>Choose what you want to see first. You can change it any time.</p>
      </div>
      <section className="card">
        <div className="ch">
          <h2>What are you following?</h2>
          <p>Choose at least one topic.</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: mobile ? '1fr' : '1fr 1fr 1fr', gap: '12px', padding: '0 20px 20px' }}>
          {SECTIONS.map((s) => (
            <label className="tl" key={s.key}>
              <input type="checkbox" aria-label={s.en} checked={desks.includes(s.key)} onChange={() => toggle(s.key)} />
              <span className="tlb">
                <span className="mf"><SectionIcon k={s.key} /></span>
                <span style={{ flex: '1' }}>
                  <b style={{ display: 'block', fontWeight: 600 }}>{sectionName(s.key)}</b>
                  <span className="mf sm">{sectionAbout(s.key)}</span>
                </span>
                <span className="ck"><Ico name="check" /></span>
              </span>
            </label>
          ))}
        </div>
      </section>
      <section className="card">
        <div className="ch">
          <h2>Stories I read</h2>
          <p>The app stays in English. Stories can be in either language.</p>
        </div>
        <div style={{ padding: '0 20px 20px' }}>
          <div className="row rc">
            <label>
              <input type="checkbox" checked={english} onChange={(e) => setEnglish(e.target.checked || hindi)} />
              <span className="pill" lang="en">English</span>
            </label>
            <label>
              <input type="checkbox" checked={hindi} onChange={(e) => setHindi(e.target.checked || english)} />
              <span className="pill" lang="hi">हिन्दी</span>
            </label>
          </div>
        </div>
      </section>
    </Shell>
  )
}

function Row({ title, hint, on, onChange }: { title: string; hint: string; on: boolean; onChange?: (v: boolean) => void }) {
  return (
    <div className="lr" style={{ justifyContent: 'space-between', gap: '16px' }}>
      <div style={{ minWidth: 0 }}>
        <b style={{ fontWeight: 600 }}>{title}</b>
        <div className="mf">{hint}</div>
      </div>
      <label className="swl">
        <input type="checkbox" role="switch" aria-label={title} checked={on} disabled={!onChange} onChange={(e) => onChange?.(e.target.checked)} />
        <span className="swt"><i /></span>
      </label>
    </div>
  )
}

/** Step 2: privacy choices. Saved to the consent ledger and, when signed in, to the account. */
export function OnboardingStep2({ mobile }: { mobile: boolean }) {
  const navigate = useNavigate()
  const { status, user } = useSession()
  const lib = useLibrary()
  const existing = getChoices()
  const [personal, setPersonal] = useState(existing?.personalization ?? true)
  const [analytics, setAnalytics] = useState(existing?.analytics ?? true)
  const [busy, setBusy] = useState(false)
  const finish = async () => {
    setBusy(true)
    const saved = saveConsent({ preferences: true, personalization: personal, analytics }, 'banner')
    if (status === 'authed') {
      await put('/account', {
        display_name: user?.display_name || 'Reader',
        interests: lib.follow.filter(isSection).slice(0, 7),
        cookie_preferences: saved,
        timezone: 'Asia/Kolkata',
        language: lib.lang,
        onboarding_completed: true,
      }).catch(() => undefined)
    }
    navigate('/')
  }
  return (
    <Shell
      mobile={mobile}
      step={2}
      footer={
        <>
          <Link to="/onboarding" className="btn" style={{ marginRight: 'auto' }}>Back</Link>
          <button type="button" className="btn p" disabled={busy} onClick={() => void finish()}>Finish and open Today</button>
        </>
      }
    >
      <div>
        <h1 className="ser" style={{ margin: '0 0 8px', font: mobile ? '600 32px/1.1 Lora' : '600 40px/1.1 Lora' }}>Make Today yours.</h1>
        <p className="mf" style={{ margin: '0', fontSize: '17px' }}>
          Personalisation helps us tailor your stories and improve the app. Essential is always on; the rest is your call.
        </p>
      </div>
      <section className="card">
        <div className="ch">
          <h2>Personalisation and privacy</h2>
          <p>Change any of this later in Account, Privacy.</p>
        </div>
        <Row title="Essential" hint="Sign-in, security and your saved stories on this device. Always on." on />
        <Row title="Personalisation" hint="Tailor Today to the desks you follow." on={personal} onChange={setPersonal} />
        <Row title="Anonymous usage analytics" hint="Aggregated and anonymous. Never sold. Shows us what confuses people." on={analytics} onChange={setAnalytics} />
      </section>
    </Shell>
  )
}
