import { Link } from 'react-router-dom'
import { Ico, SectionIcon } from '@/components/ui/icons'
import { initials, isHindi, storyPath, timeAgo, titleOf } from '@/lib/format'
import { markNoticesSeen, useNotices, type Notice } from '@/lib/hooks'
import { useLang } from '@/lib/library'
import { sectionName } from '@/lib/taxonomy'

const clamp2 = { display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' } as const

function Row({ n }: { n: Notice }) {
  const lang = useLang()
  const s = n.story
  const href = storyPath(s, lang === 'hi' && s.has_hi ? 'hi' : 'en')
  const hi = isHindi(s, lang) ? 'hi' : undefined
  const when = timeAgo(s.published_at, lang)
  if (n.kind === 'breaking')
    return (
      <Link to={href} className="nr b">
        <span style={{ width: 36, height: 36, borderRadius: 10, background: '#FEE2E2', color: '#B91C1C', display: 'grid', placeItems: 'center', flex: 'none' }}>
          <Ico name="warn" size={20} />
        </span>
        <span style={{ flex: 1, minWidth: 0 }}>
          <span className="bk" style={{ height: 20, fontSize: 10, padding: '0 8px' }}><i />BREAKING</span>
          <span lang={hi} style={{ ...clamp2, fontSize: 14, marginTop: 2, fontWeight: 600 }}>{titleOf(s, lang)}</span>
          <span className="sm" style={{ display: 'block', marginTop: 2, color: '#52525B' }}>{sectionName(s.section, lang)} · {when}</span>
        </span>
      </Link>
    )
  const person = n.kind === 'writer'
  return (
    <Link to={href} className="nr">
      {person ? (
        <span style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--soft)', color: 'var(--pt)', display: 'inline-grid', placeItems: 'center', font: '600 12px Inter', flex: 'none' }}>{initials(s.author)}</span>
      ) : (
        <span style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--mu)', color: 'var(--mf)', display: 'grid', placeItems: 'center', flex: 'none' }}>
          {n.kind === 'near' ? <Ico name="pin" size={20} /> : <SectionIcon k={s.section} size={20} />}
        </span>
      )}
      <span style={{ flex: 1, minWidth: 0 }}>
        <b style={{ fontSize: 14, display: 'block' }}>
          {n.kind === 'near' ? (lang === 'hi' ? 'आपके पास · रांची' : 'Near you · Ranchi') : person ? `${s.author} ${lang === 'hi' ? 'ने लिखा' : 'published'}` : `${sectionName(s.section, lang)} ${lang === 'hi' ? 'डेस्क' : 'desk'}`}
        </b>
        <span lang={hi} style={{ ...clamp2, fontSize: 14, marginTop: 2, color: 'var(--mf)' }}>{titleOf(s, lang)}</span>
        <span className="sm" style={{ display: 'block', marginTop: 2, color: 'var(--mf)' }}>{when}</span>
      </span>
      {n.unread ? <i style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--pr)', flex: 'none', marginTop: 6 }} /> : null}
    </Link>
  )
}

/** Bell with the notification popover. Content is built after mount, so prerendered HTML carries no personal state. */
export function NoticeMenu({ menuOpen }: { menuOpen?: boolean }) {
  const { notices, unread, ready } = useNotices()
  const lang = useLang()
  const shown = notices.slice(0, 4)
  return (
    <details className="pop npop" open={menuOpen || undefined} onToggle={(e) => e.currentTarget.open && markNoticesSeen()}>
      <summary className="ib bell" aria-label={unread ? `Notifications, ${unread} new` : 'Notifications'}>
        <Ico name="bell" />
        {unread ? <span className="bdg">{unread > 9 ? '9+' : unread}</span> : null}
      </summary>
      <div className="nmenu">
        <div className="row" style={{ justifyContent: 'space-between', padding: '14px 16px' }}>
          <b style={{ fontSize: 16 }}>{lang === 'hi' ? 'सूचनाएँ' : 'Notifications'}</b>
          <span className="mf sm">{ready && unread ? (lang === 'hi' ? `${unread} नई` : `${unread} new`) : ''}</span>
        </div>
        {shown.map((n) => (
          <Row key={n.id} n={n} />
        ))}
        {ready && shown.length === 0 ? <p className="mf" style={{ padding: '4px 16px 16px', margin: 0 }}>{lang === 'hi' ? 'अभी कोई नई सूचना नहीं।' : "You're all caught up."}</p> : null}
        <div style={{ padding: '12px 16px', borderTop: '1px solid var(--bd)' }}>
          <Link to="/notifications" className="btn p" style={{ width: '100%' }}>{lang === 'hi' ? 'सभी सूचनाएँ देखें' : 'See all notifications'}</Link>
        </div>
      </div>
    </details>
  )
}
