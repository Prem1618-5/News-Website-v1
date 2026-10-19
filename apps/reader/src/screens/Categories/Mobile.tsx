import { Link } from 'react-router-dom'
import MobileHeader from '@/components/shared/MobileHeader'
import SiteFooter from '@/components/shared/SiteFooter'
import TabBar from '@/components/shared/TabBar'
import { Ico, SectionIcon } from '@/components/ui/icons'
import { useSectionCounts } from '@/lib/data'
import { useLang } from '@/lib/library'
import { SECTIONS, sectionAbout, sectionName } from '@/lib/taxonomy'

export default function CategoriesMobile() {
  const counts = useSectionCounts()
  const lang = useLang()
  const hi = lang === 'hi'
  return (
    <div className="pg m" style={{ position: 'relative', minHeight: '100dvh', overflowX: 'clip' }}>
      <MobileHeader />
      <main id="main-m">
        <div style={{ padding: '20px 16px 4px' }}>
          <h1 style={{ margin: '0', font: '700 28px/1.15 Inter', letterSpacing: '-.02em' }}>{hi ? 'डेस्क' : 'Categories'}</h1>
          <p className="mf" style={{ margin: '4px 0 16px', fontSize: '15px' }}>{hi ? 'डेस्क के हिसाब से पढ़ें, या अपनी पसंद के डेस्क फ़ॉलो करें।' : 'Browse by desk, or follow the ones you care about.'}</p>
        </div>
        <div style={{ margin: '0 16px 20px' }}>
          <section className="card">
            <div className="ch" style={{ padding: '18px 16px 14px' }}>
              <h2>{hi ? 'सभी डेस्क' : 'All desks'}</h2>
              <p>{hi ? `${SECTIONS.length} डेस्क, एक जुड़ी हुई दुनिया` : `${SECTIONS.length} desks, one connected world`}</p>
            </div>
            {SECTIONS.map((s) => (
              <Link key={s.key} to={`/section/${s.key}`} className="lr" style={{ padding: '14px 18px' }}>
                <span className="mf"><SectionIcon k={s.key} size={20} /></span>
                <span style={{ flex: '1' }}>
                  <b style={{ fontWeight: '600', display: 'block' }}>{sectionName(s.key, lang)}</b>
                  <span className="mf sm">{sectionAbout(s.key, lang)}</span>
                </span>
                {counts[s.key] !== undefined ? <span className="cnt">{counts[s.key]}</span> : null}
                <span className="mf"><Ico name="chevron" size={16} /></span>
              </Link>
            ))}
          </section>
        </div>
      </main>
      <SiteFooter gutter={16} />
      <TabBar active="categories" />
    </div>
  )
}
