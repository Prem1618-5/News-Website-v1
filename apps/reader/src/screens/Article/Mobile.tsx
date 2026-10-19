import { Link } from 'react-router-dom'
import MobileHeader from '@/components/shared/MobileHeader'
import SiteFooter from '@/components/shared/SiteFooter'
import TabBar from '@/components/shared/TabBar'
import { RowCard, Thumb } from '@/components/story/cards'
import { AuthorCard } from '@/components/story/writers'
import { FollowToggle } from '@/components/ui/controls'
import { BlocksView } from '@/lib/blocks'
import { useMore } from '@/lib/data'
import { initials } from '@/lib/format'
import { useLang } from '@/lib/library'
import type { Language, StoryDetail } from '@/lib/types'
import { Actions, DateLine, Highlighter, PillRow, Sources, useArticleView } from './parts'
import { BLOCKS_MOBILE_STYLE } from './style'

export default function ArticleMobile({ story, lang }: { story: StoryDetail; lang: Language }) {
  const v = useArticleView(story, lang)
  const reader = useLang()
  const more = useMore(story.slug).stories
  return (
    <div className="pg m" style={{ position: 'relative', minHeight: '100dvh', overflowX: 'clip' }}>
      <MobileHeader />
      <main id="main-m">
        <article style={{ padding: '20px 16px 8px' }}>
          <PillRow story={story} v={v} />
          <h1 className="ser" lang={v.htmlLang} data-speakable style={{ margin: '14px 0', font: '600 30px/1.15 Lora,Georgia,serif' }}>{v.title}</h1>
          {v.deck ? <p className="mf" lang={v.htmlLang} data-speakable style={{ margin: '0 0 14px', fontSize: '17px', lineHeight: 1.5 }}>{v.deck}</p> : null}
          <div className="row" style={{ gap: '12px', marginBottom: '14px' }}>
            <Link to={`/writer/${story.author_slug}`} className="row" style={{ flex: '1', gap: '10px', minWidth: '0' }}>
              <span style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--soft)', color: 'var(--pt)', display: 'inline-grid', placeItems: 'center', font: '600 13px Inter', flex: 'none' }}>{initials(story.author)}</span>
              <span>
                <b style={{ display: 'block' }}>{story.author}</b>
                <span className="mf sm"><DateLine story={story} v={v} /></span>
              </span>
            </Link>
            <FollowToggle followKey={`w:${story.author_slug}`} label={`Follow ${story.author}`} />
          </div>
          <div style={{ marginBottom: '16px' }}><Actions story={story} v={v} /></div>
          <Thumb story={story} icon={64} style={{ aspectRatio: '4/3', margin: '0 0 8px', borderRadius: '14px' }} />
          {story.image_url && story.caption ? <p className="mf sm" style={{ margin: '0 0 22px' }}>{story.caption}</p> : <div style={{ height: '14px' }} />}
          <Highlighter story={story}>
            <BlocksView blocks={v.body} style={BLOCKS_MOBILE_STYLE} lang={v.htmlLang} />
          </Highlighter>
          <Sources story={story} v={v} />
        </article>
        <div style={{ padding: '12px 16px 20px' }}>
          <AuthorCard a={{ name: story.author, slug: story.author_slug, count: 1, desk: story.author === 'News APP Desk' }} />
        </div>
      </main>
      {more.length ? (
        <div style={{ margin: '0 16px 20px' }}>
          <section className="card">
            <div className="ch" style={{ padding: '18px 16px 14px' }}>
              <h2>{reader === 'hi' ? 'आपके लिए सुझाव' : 'Recommended for you'}</h2>
              <p>{reader === 'hi' ? 'आपके डेस्क के आधार पर' : 'Based on your desks'}</p>
            </div>
            {more.slice(0, 4).map((s) => <RowCard key={s.id} story={s} />)}
          </section>
        </div>
      ) : null}
      <SiteFooter gutter={16} />
      <TabBar active="today" />
    </div>
  )
}
