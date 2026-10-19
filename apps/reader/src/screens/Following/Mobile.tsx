import { Link } from 'react-router-dom'
import MobileHeader from '@/components/shared/MobileHeader'
import SiteFooter from '@/components/shared/SiteFooter'
import TabBar from '@/components/shared/TabBar'
import { RowCard } from '@/components/story/cards'
import { FollowToggle } from '@/components/ui/controls'
import { SectionIcon } from '@/components/ui/icons'
import { sectionAbout, sectionName } from '@/lib/taxonomy'
import { useFollowingModel } from './model'

const pill = { height: '36px', padding: '0 14px', fontSize: '14px', background: 'var(--soft)', borderColor: 'transparent', color: 'var(--pt)' } as const

export default function FollowingMobile() {
  const m = useFollowingModel()
  const hi = m.lang === 'hi'
  return (
    <div className="pg m" style={{ position: 'relative', minHeight: '100dvh', overflowX: 'clip' }}>
      <MobileHeader />
      <main id="main-m">
        <div style={{ padding: '20px 16px 12px' }}>
          <h1 style={{ margin: '0', font: '700 28px/1.15 Inter', letterSpacing: '-.02em' }}>{hi ? 'फ़ॉलो' : 'Following'}</h1>
          <p className="mf" style={{ margin: '4px 0 0', fontSize: '15px' }}>{hi ? 'आपके फ़ॉलो किए डेस्क की रिपोर्टिंग' : 'Reporting from the desks you follow'}</p>
        </div>
        <div style={{ padding: '0 16px 16px' }}>
          <span className="row" style={{ gap: '6px', flexWrap: 'wrap' }}>
            {m.desks.map((d) => <Link key={d} to={`/section/${d}`} className="pill" style={pill}>{sectionName(d, m.lang)}</Link>)}
            {m.writers.map((a) => <Link key={a.slug} to={`/writer/${a.slug}`} className="pill" style={pill}>{a.name}</Link>)}
          </span>
        </div>
        <div style={{ margin: '0 16px 20px' }}>
          <section className="card">
            <div className="ch" style={{ padding: '18px 16px 14px' }}>
              <h2>{hi ? 'आपके डेस्क से' : 'From your desks'}</h2>
              <p>{m.stories.length ? '' : hi ? 'अभी कुछ नया नहीं' : 'Nothing new yet'}</p>
            </div>
            {m.stories.map((s) => <RowCard key={s.id} story={s} />)}
          </section>
        </div>
        <div style={{ margin: '0 16px 20px' }}>
          <section className="card" id="manage">
            <div className="ch" style={{ padding: '18px 16px 14px' }}>
              <h2>{hi ? 'सुझाए गए डेस्क' : 'Suggested desks'}</h2>
              <p>{hi ? 'आज में और जोड़ें' : 'Add more to your Today page'}</p>
            </div>
            {m.suggested.map((s) => (
              <div className="lr" key={s.key} style={{ padding: '14px 16px' }}>
                <span className="mf"><SectionIcon k={s.key} /></span>
                <span style={{ flex: '1', minWidth: 0 }}>
                  <b style={{ fontWeight: '600', display: 'block' }}>{sectionName(s.key, m.lang)}</b>
                  <span className="mf sm">{sectionAbout(s.key, m.lang)}</span>
                </span>
                <FollowToggle followKey={s.key} label={`Follow ${s.en}`} />
              </div>
            ))}
          </section>
        </div>
      </main>
      <SiteFooter gutter={16} />
      <TabBar active="today" />
    </div>
  )
}
