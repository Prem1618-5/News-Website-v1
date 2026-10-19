import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { SaveToggle, LikeToggle } from '@/components/ui/controls'
import { Ico } from '@/components/ui/icons'
import { post } from '@/lib/api'
import { track } from '@/lib/consent'
import { fmtDate, fmtDateTime, readTime, storyPath } from '@/lib/format'
import { library, useLang } from '@/lib/library'
import { sectionName, storyPlace } from '@/lib/taxonomy'
import { useSession } from '@/lib/session'
import type { Language, StoryDetail } from '@/lib/types'
import { SITE, abs } from '@/site'

/** What this page shows: the story in the language the URL asks for. */
export function useArticleView(story: StoryDetail, lang: Language) {
  const hi = lang === 'hi' && story.has_hi
  const own = story.language === 'hi' && !story.has_hi
  return {
    hi,
    htmlLang: hi || own ? ('hi' as const) : undefined,
    title: hi ? story.title_hi : story.title,
    deck: hi ? story.deck_hi || story.deck : story.deck,
    body: hi && story.body_hi.length ? story.body_hi : story.body,
    section: sectionName(story.section, hi ? 'hi' : 'en'),
    place: storyPlace(story, hi ? 'hi' : 'en'),
    otherPath: story.has_hi ? storyPath(story, hi ? 'en' : 'hi') : null,
    date: fmtDate(story.published_at, hi ? 'hi' : 'en'),
    read: readTime(story.read_minutes, hi ? 'hi' : 'en'),
    path: storyPath(story, hi ? 'hi' : 'en'),
  }
}

/** Records the open for consented analytics and, when signed in, for the reading streak. */
export function useReadTracking(story: StoryDetail) {
  const { status } = useSession()
  useEffect(() => {
    track('article_open', { story_id: story.id.slice(0, 160), section: story.section })
  }, [story.id, story.section])
  useEffect(() => {
    if (status === 'authed') void post('/activity/read', { story_id: story.id }).catch(() => undefined)
  }, [status, story.id])
}

export function PillRow({ story, v }: { story: StoryDetail; v: ReturnType<typeof useArticleView> }) {
  return (
    <div className="row" style={{ flexWrap: 'wrap' }}>
      <Link to={`/section/${story.section}`} className="pill">{v.section}</Link>
      <span className="pill">
        <Ico name="pin" size={13} />
        {` ${v.place}`}
      </span>
    </div>
  )
}

export function DateLine({ story, v }: { story: StoryDetail; v: ReturnType<typeof useArticleView> }) {
  return (
    <>
      <time dateTime={story.published_at ?? undefined} title={fmtDateTime(story.published_at, v.hi ? 'hi' : 'en')}>{v.date}</time>
      {` · ${v.read}${v.hi ? '' : ' read'}`}
    </>
  )
}

/** Like, save, share, and the switch to the other language. */
export function Actions({ story, v }: { story: StoryDetail; v: ReturnType<typeof useArticleView> }) {
  const [copied, setCopied] = useState(false)
  const url = abs(v.path)
  const text = encodeURIComponent(`${v.title} ${url}`)
  const copy = () => {
    void navigator.clipboard?.writeText(url).then(() => {
      setCopied(true)
      track('share', { story_id: story.id })
      window.setTimeout(() => setCopied(false), 2000)
    })
  }
  return (
    <div className="row" style={{ flexWrap: 'wrap' }}>
      <LikeToggle id={story.id} variant="text" />
      <SaveToggle id={story.id} variant="text" />
      <details className="pop">
        <summary className="btn"><Ico name="share" />{v.hi ? 'साझा करें' : 'Share'}</summary>
        <div className="menu">
          <button type="button" onClick={copy} style={{ border: 0, background: 'none', font: 'inherit', color: copied ? 'var(--pt)' : 'inherit', cursor: 'pointer', textAlign: 'left' }}>
            <Ico name={copied ? 'check' : 'link'} />
            {copied ? (v.hi ? 'लिंक कॉपी हुआ' : 'Link copied') : v.hi ? 'लिंक कॉपी करें' : 'Copy link'}
          </button>
          <a href={`https://wa.me/?text=${text}`} target="_blank" rel="noopener noreferrer" onClick={() => track('share', { story_id: story.id })}>WhatsApp</a>
          <a href={`https://x.com/intent/post?text=${text}`} target="_blank" rel="noopener noreferrer">X</a>
          <a href={`mailto:?subject=${encodeURIComponent(v.title)}&body=${encodeURIComponent(url)}`}>{v.hi ? 'ईमेल' : 'Email'}</a>
        </div>
      </details>
      {v.otherPath ? (
        <Link to={v.otherPath} className="btn" lang={v.hi ? undefined : 'hi'} hrefLang={v.hi ? 'en' : 'hi'}>
          {v.hi ? 'Read in English' : 'हिन्दी में पढ़ें'}
        </Link>
      ) : null}
    </div>
  )
}

/** Outbound links to the reporting this story is based on. */
export function Sources({ story, v }: { story: StoryDetail; v: ReturnType<typeof useArticleView> }) {
  if (!story.sources.length) return null
  return (
    <aside aria-label={v.hi ? 'स्रोत' : 'Sources'} style={{ marginTop: '28px', paddingTop: '20px', borderTop: '1px solid var(--bd)' }}>
      <h2 style={{ margin: '0 0 6px', font: '600 16px Inter' }}>{v.hi ? 'स्रोत' : 'Sources'}</h2>
      <p className="mf sm" style={{ margin: '0 0 10px' }}>
        {v.hi ? `${SITE.name} ने यह ख़बर नीचे दी गई रिपोर्टिंग के आधार पर अपने शब्दों में लिखी है। ` : `${SITE.name} wrote this story in its own words from the reporting below. `}
        <Link to="/editorial-standards" style={{ color: 'var(--pt)' }}>{v.hi ? 'हमारे मानक' : 'Our standards'}</Link>
      </p>
      <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'grid', gap: '6px' }}>
        {story.sources.map((s) => (
          <li key={s.url}>
            <a href={s.url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--pt)' }}>{s.name}</a>
          </li>
        ))}
      </ul>
    </aside>
  )
}

/** Select text in the story and a Highlight button appears. Highlights are listed in Saved. */
export function Highlighter({ story, children }: { story: StoryDetail; children: React.ReactNode }) {
  const root = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ x: number; y: number; text: string } | null>(null)
  const hi = useLang() === 'hi'
  useEffect(() => {
    const check = () => {
      const sel = window.getSelection()
      const text = sel?.toString().trim() ?? ''
      if (!sel || sel.isCollapsed || text.length < 8 || text.length > 600 || !root.current?.contains(sel.anchorNode) || !root.current.contains(sel.focusNode)) return setPos(null)
      const r = sel.getRangeAt(0).getBoundingClientRect()
      setPos({ x: r.left + r.width / 2, y: r.top, text })
    }
    document.addEventListener('selectionchange', check)
    return () => document.removeEventListener('selectionchange', check)
  }, [])
  return (
    <div ref={root} data-article-body>
      {children}
      {pos ? (
        <button
          type="button"
          className="btn p"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            library.addHighlight({ id: story.id, t: pos.text, d: new Date().toISOString().slice(0, 10) })
            window.getSelection()?.removeAllRanges()
            setPos(null)
          }}
          style={{ position: 'fixed', left: Math.max(8, pos.x - 50), top: Math.max(8, pos.y - 52), zIndex: 50, height: 40, boxShadow: '0 8px 24px var(--sh)' }}
        >
          {hi ? 'हाइलाइट' : 'Highlight'}
        </button>
      ) : null}
    </div>
  )
}
