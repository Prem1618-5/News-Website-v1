import { Link } from 'react-router-dom'
import DeskRail from '@/components/shared/DeskRail'
import SiteFooter from '@/components/shared/SiteFooter'
import SiteHeader from '@/components/shared/SiteHeader'
import { TileCard } from '@/components/story/cards'
import { FollowToggle } from '@/components/ui/controls'
import { SectionIcon } from '@/components/ui/icons'
import { sectionAbout, sectionName } from '@/lib/taxonomy'
import { useFollowingModel } from './model'

const pill = { height: '36px', padding: '0 14px', fontSize: '14px', background: 'var(--soft)', borderColor: 'transparent', color: 'var(--pt)' } as const

export default function FollowingDesktop() {
  const m = useFollowingModel()
  const hi = m.lang === 'hi'
  const names = m.desks.map((d) => sectionName(d, m.lang))
  return (
    <div className="pg" style={{ minHeight: '100%' }}>
      <SiteHeader active="following" />
      <div className="with-rail" style={{ maxWidth: '1320px', margin: 'auto', padding: '24px 40px 80px', display: 'grid', gridTemplateColumns: '88px minmax(0,1fr)', gap: '24px' }}>
        <DeskRail />
        <main id="main" style={{ display: 'grid', gap: '24px', alignContent: 'start', minWidth: '0' }}>
          <section className="card">
            <div className="row" style={{ padding: '24px', gap: '16px', flexWrap: 'wrap' }}>
              <div style={{ flex: '1', minWidth: '220px' }}>
                <h1 style={{ margin: '0', font: '700 30px/1.15 Inter', letterSpacing: '-.02em' }}>{hi ? 'फ़ॉलो' : 'Following'}</h1>
                <p className="mf" style={{ margin: '2px 0 0', fontSize: '15px' }}>{hi ? 'आपके फ़ॉलो किए डेस्क की रिपोर्टिंग' : 'Reporting from the desks you follow'}</p>
              </div>
              <span className="row" style={{ gap: '6px', flexWrap: 'wrap' }}>
                {m.desks.map((d) => <Link key={d} to={`/section/${d}`} className="pill" style={pill}>{sectionName(d, m.lang)}</Link>)}
                {m.writers.map((a) => <Link key={a.slug} to={`/writer/${a.slug}`} className="pill" style={pill}>{a.name}</Link>)}
              </span>
              <a href="#manage" className="btn">{hi ? 'डेस्क प्रबंधित करें' : 'Manage desks'}</a>
            </div>
          </section>
          {m.stories.length ? (
            <section className="card">
              <div className="ch">
                <h2>{hi ? 'आपके डेस्क से' : 'From your desks'}</h2>
                <p>{hi ? `${names.join(', ')} की ताज़ा ख़बरें` : `Latest from ${names.join(', ') || 'your writers'}`}</p>
              </div>
              <div className="tiles">{m.stories.map((s) => <div key={s.id}><TileCard story={s} /></div>)}</div>
            </section>
          ) : (
            <section className="card">
              <div className="ch">
                <h2>{hi ? 'अभी कुछ नया नहीं' : 'Nothing new yet'}</h2>
                <p>{hi ? 'आपके डेस्क पर नई ख़बर आते ही यहाँ दिखेगी।' : 'New stories from your desks will show up here.'}</p>
              </div>
            </section>
          )}
          <section className="card" id="manage">
            <div className="ch">
              <h2>{hi ? 'सुझाए गए डेस्क' : 'Suggested desks'}</h2>
              <p>{hi ? 'आज में और जोड़ें' : 'Add more to your Today page'}</p>
            </div>
            {m.suggested.map((s) => (
              <div className="lr" key={s.key}>
                <span className="mf"><SectionIcon k={s.key} /></span>
                <span style={{ flex: '1' }}>
                  <b style={{ fontWeight: '600', display: 'block' }}>{sectionName(s.key, m.lang)}</b>
                  <span className="mf sm">{sectionAbout(s.key, m.lang)}</span>
                </span>
                <FollowToggle followKey={s.key} label={`Follow ${s.en}`} />
              </div>
            ))}
          </section>
        </main>
      </div>
      <SiteFooter />
    </div>
  )
}
