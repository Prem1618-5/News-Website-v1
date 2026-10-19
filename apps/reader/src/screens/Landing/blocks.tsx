import { Link } from 'react-router-dom'
import { Ico, SectionIcon } from '@/components/ui/icons'
import { useFeed, useSectionCounts } from '@/lib/data'
import { fmtLongDate, isHindi, storyPath, titleOf, deckOf } from '@/lib/format'
import { useToday } from '@/lib/hooks'
import { useLang } from '@/lib/library'
import { SECTIONS, sectionAbout, sectionName } from '@/lib/taxonomy'

/** The "Today" card on the landing page: the three newest stories. */
export function LandingToday() {
  const { stories } = useFeed()
  const lang = useLang()
  const today = useToday(stories[0]?.published_at ?? '2026-01-01T00:00:00Z')
  return (
    <section className="card">
      <div className="ch">
        <h2>{lang === 'hi' ? 'आज' : 'Today'}</h2>
        <p suppressHydrationWarning>{fmtLongDate(today, lang)}</p>
      </div>
      {stories.slice(0, 3).map((s, i) => (
        <Link key={s.id} to={storyPath(s, lang === 'hi' && s.has_hi ? 'hi' : 'en')} className="lr" style={{ alignItems: 'flex-start' }}>
          <span className="num">{i + 1}</span>
          <span style={{ flex: '1' }}>
            <span className="row" style={{ flexWrap: 'wrap' }}>
              <b className="ht" lang={isHindi(s, lang) ? 'hi' : undefined} style={{ fontSize: '16px' }}>{titleOf(s, lang)}</b>
              <span className="pill" style={{ background: 'var(--mu)', borderColor: 'transparent' }}>{sectionName(s.section, lang)}</span>
            </span>
            {deckOf(s, lang) ? <span className="mf" style={{ display: 'block', marginTop: '2px' }}>{deckOf(s, lang)}</span> : null}
          </span>
        </Link>
      ))}
    </section>
  )
}

/** Every desk with its story count. */
export function LandingDesks({ mobile = false }: { mobile?: boolean }) {
  const counts = useSectionCounts()
  const lang = useLang()
  const hi = lang === 'hi'
  return (
    <section className="card">
      <div className="ch">
        <h2>{hi ? `${SECTIONS.length} डेस्क। एक जुड़ी हुई दुनिया।` : mobile ? `${SECTIONS.length} desks` : `${SECTIONS.length} desks. One connected world.`}</h2>
        <p>{hi ? 'पूरी कहानी पढ़ें।' : mobile ? 'One connected world' : 'Read across the whole story.'}</p>
      </div>
      <div style={mobile ? undefined : { display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
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
      </div>
    </section>
  )
}
