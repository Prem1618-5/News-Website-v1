import type { ReactNode } from 'react'
import { Ico, type IconName } from '@/components/ui/icons'

/** The design's centred empty-state card, for use inside a screen that must keep its own controls (e.g. the search box). */
export default function EmptyCard({ icon = 'search', title, text, children }: { icon?: IconName; title: string; text: string; children?: ReactNode }) {
  return (
    <div style={{ display: 'grid', justifyItems: 'center', textAlign: 'center', gap: '14px', padding: '48px 24px' }}>
      <span style={{ width: '96px', height: '96px', borderRadius: '50%', background: 'var(--soft)', color: 'var(--pt)', display: 'grid', placeItems: 'center' }}>
        <Ico name={icon} size={40} />
      </span>
      <h2 style={{ margin: '8px 0 0', font: '700 22px/1.2 Inter', letterSpacing: '-.02em' }}>{title}</h2>
      <p className="mf" style={{ margin: 0, fontSize: '16px', maxWidth: '42ch' }}>{text}</p>
      {children ? <div className="row" style={{ flexWrap: 'wrap', justifyContent: 'center', marginTop: '8px' }}>{children}</div> : null}
    </div>
  )
}
