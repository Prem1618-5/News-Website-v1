import { useState } from 'react'
import { Link } from 'react-router-dom'
import { closeConsent, getChoices, gpcSignal, saveConsent, useConsentState } from '@/lib/consent'

const wrap = { position: 'fixed', zIndex: 60, left: 12, right: 12, bottom: 'calc(96px + env(safe-area-inset-bottom))', margin: '0 auto', maxWidth: 560 } as const

function Switch({ id, label, hint, on, disabled, onChange }: { id: string; label: string; hint: string; on: boolean; disabled?: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="row" style={{ justifyContent: 'space-between', gap: 12, padding: '10px 0', borderTop: '1px solid var(--bd)' }}>
      <span style={{ minWidth: 0 }}>
        <b style={{ display: 'block' }}>{label}</b>
        <span className="mf sm">{hint}</span>
      </span>
      <span className="swl">
        <input id={id} type="checkbox" role="switch" checked={on} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
        <span className="swt"><i /></span>
      </span>
    </label>
  )
}

/** Cookie banner and preference centre. Appears only in the browser, only until a choice is saved. */
export default function ConsentBanner() {
  const { decided, open } = useConsentState()
  const [custom, setCustom] = useState(false)
  const current = getChoices()
  const [prefs, setPrefs] = useState(current?.preferences ?? true)
  const [person, setPerson] = useState(current?.personalization ?? false)
  const [analytics, setAnalytics] = useState(current?.analytics ?? false)
  const gpc = gpcSignal()
  if (decided && !open) return null

  const modal = custom || open
  const finish = (choices: Parameters<typeof saveConsent>[0]) => {
    saveConsent(choices, decided ? 'preference_center' : 'banner')
    setCustom(false)
    closeConsent()
  }
  const intro = (
    <>
      <h2 style={{ margin: 0, font: '600 18px Inter' }}>Your privacy choices</h2>
      <p className="mf" style={{ margin: '6px 0 14px' }}>
        We use essential storage to keep you signed in and remember your saved stories. With your permission we also remember preferences, tune Today to your desks and count anonymous visits so the newsroom can see what helps readers.
        {gpc ? ' Your browser sent a Global Privacy Control signal, so optional tracking stays off.' : ''} See our <Link to="/privacy" style={{ color: 'var(--pt)' }}>privacy page</Link>.
      </p>
    </>
  )

  return (
    <div role="dialog" aria-modal={modal} aria-label="Cookie and privacy choices" className="card" style={{ ...wrap, padding: 18, boxShadow: '0 18px 44px var(--sh)' }}>
      {intro}
      {modal ? (
        <>
          <Switch id="cc-essential" label="Essential" hint="Sign-in and security. Always on." on disabled onChange={() => undefined} />
          <Switch id="cc-prefs" label="Preferences" hint="Language, desks and saved stories on this device." on={prefs} onChange={setPrefs} />
          <Switch id="cc-person" label="Personalisation" hint="Tune Today to the desks you follow." on={person && !gpc} disabled={gpc} onChange={setPerson} />
          <Switch id="cc-analytics" label="Analytics" hint="Anonymous visit counts for the newsroom." on={analytics && !gpc} disabled={gpc} onChange={setAnalytics} />
          <div className="row" style={{ justifyContent: 'flex-end', marginTop: 12 }}>
            {decided ? <button className="btn" onClick={() => (setCustom(false), closeConsent())}>Cancel</button> : null}
            <button className="btn p" onClick={() => finish({ preferences: prefs, personalization: person, analytics })}>Save choices</button>
          </div>
        </>
      ) : (
        <div className="row" style={{ flexWrap: 'wrap' }}>
          <button className="btn" onClick={() => finish({ preferences: false, personalization: false, analytics: false })}>Essential only</button>
          <button className="btn" onClick={() => setCustom(true)}>Choose</button>
          {gpc ? null : <button className="btn p" onClick={() => finish({ preferences: true, personalization: true, analytics: true })}>Accept all</button>}
        </div>
      )}
    </div>
  )
}
