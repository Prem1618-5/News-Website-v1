import { Link } from 'react-router-dom'
import MobileHeader from '@/components/shared/MobileHeader'
import SiteFooter from '@/components/shared/SiteFooter'
import SiteHeader from '@/components/shared/SiteHeader'
import TabBar from '@/components/shared/TabBar'
import { Ico } from '@/components/ui/icons'
import { useLang } from '@/lib/library'
import { SCOPES } from '@/lib/taxonomy'
import './location.css'

/** Where the news is from. Coverage is Ranchi and Jharkhand today, so there is one place to "choose". */
export function LocationBody({ mobile }: { mobile: boolean }) {
  const hi = useLang() === 'hi'
  const card = (
    <section className="card">
      <div className="ch" style={mobile ? { padding: '18px 16px 14px' } : undefined}>
        <h1 style={{ margin: 0, font: '600 22px/1.2 Inter', letterSpacing: '-.02em' }}>{hi ? 'आपका क्षेत्र' : 'Your area'}</h1>
        <p>{hi ? 'अभी हम रांची और झारखंड कवर करते हैं। और शहर जल्द जुड़ेंगे।' : 'We cover Ranchi and Jharkhand today. More places are coming.'}</p>
      </div>
      <label className="lr" style={{ padding: '14px 20px', position: 'relative' }}>
        <input type="radio" name="loc" aria-label="Ranchi, Jharkhand" defaultChecked style={{ position: 'absolute', inset: 0, opacity: 0, margin: 0, cursor: 'pointer' }} />
        <span className="mf"><Ico name="pin" size={20} /></span>
        <b style={{ flex: 1, fontWeight: 600 }}>{hi ? 'रांची, झारखंड' : 'Ranchi, Jharkhand'}</b>
        <span className="ck" style={{ color: 'var(--pt)' }}><Ico name="check" size={20} /></span>
      </label>
      <div className="mf sm" style={{ padding: '14px 20px 6px' }}>{hi ? 'ख़बरें कैसे बँटी हैं' : 'How stories are grouped'}</div>
      {SCOPES.map((s) => (
        <div className="lr" key={s.key} style={{ padding: '12px 20px' }}>
          <b style={{ minWidth: 88, fontWeight: 600 }}>{hi ? s.labelHi : s.label}</b>
          <span className="mf">{hi ? s.placeHi : s.place}</span>
        </div>
      ))}
      <div style={{ padding: '16px 20px 20px' }}>
        <Link to="/" className="btn p">{hi ? 'आज की ख़बरें देखें' : "Back to Today's news"}</Link>
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
