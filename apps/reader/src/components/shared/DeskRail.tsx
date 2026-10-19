import { Link } from 'react-router-dom'
import { SectionIcon } from '@/components/ui/icons'
import { useLang } from '@/lib/library'
import { SECTIONS, sectionName } from '@/lib/taxonomy'

/** Desktop left rail: one icon per desk. `active` marks the desk being read. */
export default function DeskRail({ active }: { active?: string }) {
  const lang = useLang()
  return (
    <aside className="rl desk-rail" aria-label="Desks" style={{ position: 'sticky', top: '84px', alignSelf: 'start', display: 'grid', gap: '2px', justifyItems: 'center', maxHeight: 'calc(100vh - 100px)', overflowY: 'auto' }}>
      <span className="mf" style={{ font: '600 11px Inter', letterSpacing: '.12em', marginBottom: '6px' }}>{lang === 'hi' ? 'डेस्क' : 'DESKS'}</span>
      {SECTIONS.map((s) => (
        <Link
          key={s.key}
          to={`/section/${s.key}`}
          aria-label={sectionName(s.key, lang)}
          aria-current={active === s.key ? 'page' : undefined}
          style={{ width: '72px', padding: '6px 0 5px', borderRadius: '14px', display: 'grid', justifyItems: 'center', gap: '4px', font: '500 12px Inter', ...(active === s.key ? { background: 'var(--soft)', color: 'var(--pt)' } : { color: 'var(--mf)' }) }}
        >
          <span style={{ position: 'relative' }}>
            <SectionIcon k={s.key} />
            <i className="dk" style={{ position: 'absolute', right: '-6px', top: '-4px', width: '8px', height: '8px', borderRadius: '50%', background: s.color, transition: 'transform .2s', border: '2px solid var(--bg)', boxSizing: 'content-box' }} />
          </span>
          {sectionName(s.key, lang)}
        </Link>
      ))}
    </aside>
  )
}
