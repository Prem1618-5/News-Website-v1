import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { DISTRICTS, STATES, districtsOf, placeLabel } from '@news/contracts'
import MobileHeader from '@/components/shared/MobileHeader'
import SiteFooter from '@/components/shared/SiteFooter'
import SiteHeader from '@/components/shared/SiteHeader'
import TabBar from '@/components/shared/TabBar'
import { Ico } from '@/components/ui/icons'
import { useMounted } from '@/lib/hooks'
import { library, useLibrary } from '@/lib/library'
import { SCOPES } from '@/lib/taxonomy'
import './location.css'

const SELECT = { height: '44px', border: '1px solid var(--bd)', borderRadius: '10px', padding: '0 12px', background: 'var(--bg)', color: 'var(--fg)', font: '400 15px Inter', width: '100%' } as const

/** Where the reader lives. Their district's news comes first, then their state's, then India and the world. */
export function LocationBody({ mobile }: { mobile: boolean }) {
  const { place, lang, placeChosen } = useLibrary()
  const mounted = useMounted()
  const navigate = useNavigate()
  const hi = lang === 'hi'
  const [state, setState] = useState(place.state)
  const [district, setDistrict] = useState(place.district)
  useEffect(() => {
    if (!mounted) return
    setState(place.state)
    setDistrict(place.district)
  }, [mounted, place.state, place.district])
  const districts = districtsOf(state)
  const covered = Object.keys(DISTRICTS)

  const save = () => {
    library.setPlace({ state, district })
    navigate('/')
  }

  const card = (
    <section className="card">
      <div className="ch" style={mobile ? { padding: '18px 16px 14px' } : undefined}>
        <h1 style={{ margin: 0, font: '600 22px/1.2 Inter', letterSpacing: '-.02em' }}>{hi ? 'आपका क्षेत्र' : 'Your area'}</h1>
        <p>
          {hi
            ? 'आपके ज़िले की ख़बरें सबसे पहले, फिर राज्य की, फिर देश और दुनिया की।'
            : 'News from your district comes first, then your state, then India and the world.'}
        </p>
      </div>
      <div style={{ padding: mobile ? '4px 16px 8px' : '4px 20px 8px', display: 'grid', gap: '14px' }}>
        <label style={{ display: 'grid', gap: '6px', fontWeight: 500 }}>
          {hi ? 'राज्य' : 'State'}
          <select value={state} onChange={(e) => (setState(e.target.value), setDistrict(''))} style={SELECT}>
            {STATES.map((s) => (
              <option key={s.code} value={s.code}>{hi ? s.hi : s.en}</option>
            ))}
          </select>
        </label>
        {districts.length ? (
          <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
            <legend style={{ fontWeight: 500, marginBottom: '6px' }}>{hi ? 'ज़िला या शहर' : 'District or city'}</legend>
            <div style={{ maxHeight: mobile ? 'none' : '320px', overflowY: 'auto', border: '1px solid var(--bd)', borderRadius: '12px' }}>
              {districts.map((d) => (
                <label key={d.key} className="lr" style={{ padding: '12px 14px', position: 'relative' }}>
                  <input type="radio" name="district" value={d.key} checked={district === d.key} onChange={() => setDistrict(d.key)} style={{ position: 'absolute', inset: 0, opacity: 0, margin: 0, cursor: 'pointer' }} />
                  <span className="mf"><Ico name="pin" size={18} /></span>
                  <b style={{ flex: 1, fontWeight: 500 }}>
                    {hi ? d.hi : d.en}
                    {d.city ? <span className="mf sm" style={{ fontWeight: 400 }}> · {d.city}</span> : null}
                  </b>
                  <span className="ck" style={{ color: 'var(--pt)' }}><Ico name="check" size={18} /></span>
                </label>
              ))}
            </div>
          </fieldset>
        ) : (
          <p className="mf sm" style={{ margin: 0 }}>
            {hi ? 'इस राज्य के लिए अभी ज़िले नहीं जोड़े गए; राज्य की ख़बरें पहले दिखेंगी।' : 'Districts for this state are not listed yet; state news will come first.'}
          </p>
        )}
        <button type="button" className="btn p" onClick={save} disabled={!!districts.length && !district}>
          {hi ? 'सहेजें और ख़बरें देखें' : 'Save and see my news'}
        </button>
        {mounted && placeChosen ? <p className="mf sm" style={{ margin: 0 }}>{hi ? 'अभी: ' : 'Now: '}{placeLabel(place, lang)}</p> : null}
      </div>
      <div className="mf sm" style={{ padding: '14px 20px 6px' }}>{hi ? 'ख़बरें कैसे सजती हैं' : 'How your front page is ordered'}</div>
      {SCOPES.map((s, i) => (
        <div className="lr" key={s.key} style={{ padding: '12px 20px' }}>
          <b style={{ minWidth: 24, fontWeight: 600 }}>{i + 1}</b>
          <b style={{ minWidth: 88, fontWeight: 600 }}>{hi ? s.labelHi : s.label}</b>
          <span className="mf">{hi ? s.placeHi : s.place}</span>
        </div>
      ))}
      <p className="mf sm" style={{ padding: '6px 20px 0', margin: 0 }}>
        {hi
          ? `ज़िले की पूरी सूची अभी ${covered.length} राज्य के लिए है। ब्रेकिंग ख़बरें हमेशा ऊपर रहती हैं।`
          : `Full district lists cover ${covered.length} state so far. Breaking news always stays on top.`}
      </p>
      <div style={{ padding: '16px 20px 20px' }}>
        <Link to="/" className="mf">{hi ? 'वापस आज की ख़बरों पर' : "Back to Today's news"}</Link>
      </div>
    </section>
  )
  if (mobile)
    return (
      <div className="pg m" style={{ position: 'relative', minHeight: '100dvh', overflowX: 'clip' }}>
        <MobileHeader />
        <main id="main-m" style={{ padding: '20px 16px' }}>{card}</main>
        <SiteFooter gutter={16} />
        <TabBar active="today" />
      </div>
    )
  return (
    <div className="pg" style={{ minHeight: '100%' }}>
      <SiteHeader />
      <main id="main" style={{ maxWidth: '640px', margin: '48px auto' }}>{card}</main>
      <SiteFooter />
    </div>
  )
}
