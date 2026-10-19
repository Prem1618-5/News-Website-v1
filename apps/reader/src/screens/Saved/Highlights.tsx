import { Link } from 'react-router-dom'
import { Ico } from '@/components/ui/icons'
import { fmtDate, storyPath, titleOf } from '@/lib/format'
import type { Highlight } from '@/lib/library'
import type { Language, Story } from '@/lib/types'

/** Passages the reader highlighted, each with its story and date. */
export default function Highlights({ items, storyOf, onRemove, lang, cols = 2 }: { items: Highlight[]; storyOf: (h: Highlight) => Story | undefined; onRemove: (h: Highlight) => void; lang: Language; cols?: 1 | 2 }) {
  const hi = lang === 'hi'
  if (!items.length)
    return (
      <p className="mf" style={{ margin: 0, padding: '0 20px 24px' }}>
        {hi ? 'अभी कोई हाइलाइट नहीं। किसी भी ख़बर में कोई अंश चुनें, वह यहाँ सहेजा जाएगा।' : 'No highlights yet. Select a passage in any story to keep it here.'}
      </p>
    )
  return (
    <div style={{ display: 'grid', gridTemplateColumns: cols === 2 ? '1fr 1fr' : '1fr', gap: '12px', padding: '0 20px 20px' }}>
      {items.map((h) => {
        const s = storyOf(h)
        return (
          <div key={`${h.id}:${h.t}`} style={{ background: 'var(--soft)', borderRadius: '12px', padding: '20px' }}>
            <blockquote className="ser" style={{ margin: '0 0 14px', font: '400 18px/1.5 Lora' }}>{h.t}</blockquote>
            <div className="row">
              <span style={{ flex: '1', minWidth: 0 }}>
                {s ? <Link to={storyPath(s)} className="sm" style={{ display: 'block', fontWeight: 700 }}>{titleOf(s, lang)}</Link> : null}
                <span className="mf sm">{fmtDate(h.d, lang)}</span>
              </span>
              <button className="ib" aria-label="Remove highlight" onClick={() => onRemove(h)}><Ico name="close" /></button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
