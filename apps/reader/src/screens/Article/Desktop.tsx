import { Link } from 'react-router-dom'
import SiteFooter from '@/components/shared/SiteFooter'
import SiteHeader from '@/components/shared/SiteHeader'
import { Thumb, TileCard, useStoryView } from '@/components/story/cards'
import { AuthorCard, WriterRow, authorsOf } from '@/components/story/writers'
import { FollowToggle } from '@/components/ui/controls'
import { BLOCKS_DESKTOP_STYLE } from './style'
import { initials } from '@/lib/format'
import { useMore, useRelated } from '@/lib/data'
import { useLang } from '@/lib/library'
import { BlocksView } from '@/lib/blocks'
import type { Language, Story, StoryDetail } from '@/lib/types'
import { Actions, DateLine, Highlighter, PillRow, Sources, useArticleView } from './parts'

function RelatedRow({ story, n }: { story: Story; n: number }) {
  const v = useStoryView(story)
  return (
    <Link to={v.href} className="lr" style={{ alignItems: 'flex-start' }}>
      <span className="num">{n}</span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span className="row" style={{ flexWrap: 'wrap' }}>
          <b className="ht" lang={v.hindi ? 'hi' : undefined} style={{ fontSize: '16px' }}>{v.title}</b>
          <span className="pill" style={{ background: 'var(--mu)', borderColor: 'transparent' }}>{v.section}</span>
        </span>
        {v.deck ? <span className="mf" lang={v.hindi ? 'hi' : undefined} style={{ display: '-webkit-box', marginTop: '2px', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{v.deck}</span> : null}
      </span>
    </Link>
  )
}

export default function ArticleDesktop({ story, lang }: { story: StoryDetail; lang: Language }) {
  const v = useArticleView(story, lang)
  const reader = useLang()
  const related = useRelated(story.slug, story.section).stories
  const more = useMore(story.slug).stories
  const asideRelated = related.length ? related : more.slice(0, 3)
  const writers = authorsOf([story, ...more]).slice(0, 3)
  return (
    <div className="pg" style={{ minHeight: '100%' }}>
      <SiteHeader active="today" />
      <div style={{ maxWidth: '1200px', margin: 'auto', padding: '28px 40px 80px', display: 'grid', gap: '32px' }}>
        <div className="cols-aside" style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 340px', gap: '28px' }}>
          <main id="main" style={{ display: 'grid', gap: '24px', alignContent: 'start', minWidth: '0' }}>
            <article className="card article-card" style={{ padding: '40px 48px' }}>
              <PillRow story={story} v={v} />
              <h1 className="ser" lang={v.htmlLang} data-speakable style={{ margin: '16px 0', font: '600 42px/1.15 Lora,Georgia,serif', letterSpacing: '-.01em' }}>{v.title}</h1>
              {v.deck ? <p className="mf" lang={v.htmlLang} data-speakable style={{ fontSize: '20px', lineHeight: '1.5', margin: '0 0 24px' }}>{v.deck}</p> : null}
              <div className="row" style={{ padding: '16px 0', borderBlock: '1px solid var(--bd)', gap: '12px', flexWrap: 'wrap' }}>
                <Link to={`/writer/${story.author_slug}`} className="row" style={{ flex: '1', gap: '12px', minWidth: '0' }}>
                  <span style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'var(--soft)', color: 'var(--pt)', display: 'inline-grid', placeItems: 'center', font: '600 14px Inter', flex: 'none' }}>{initials(story.author)}</span>
                  <span>
                    <b style={{ display: 'block' }}>{story.author}</b>
                    <span className="mf sm"><DateLine story={story} v={v} /></span>
                  </span>
                </Link>
                <FollowToggle followKey={`w:${story.author_slug}`} label={`Follow ${story.author}`} />
              </div>
              <div style={{ margin: '16px 0 0' }}><Actions story={story} v={v} /></div>
              <Thumb story={story} icon={72} style={{ aspectRatio: '16/9', margin: '28px 0 8px' }} />
              {story.image_url && story.caption ? <p className="mf sm" style={{ margin: '0 0 28px' }}>{story.caption}</p> : <div style={{ height: '20px' }} />}
              <Highlighter story={story}>
                <BlocksView blocks={v.body} style={BLOCKS_DESKTOP_STYLE} lang={v.htmlLang} />
              </Highlighter>
              <Sources story={story} v={v} />
            </article>
            <AuthorCard a={{ name: story.author, slug: story.author_slug, count: 1, desk: story.author === 'News APP Desk' }} />
          </main>
          <aside style={{ position: 'sticky', top: '84px', alignSelf: 'start', display: 'grid', gap: '24px' }}>
            {asideRelated.length ? (
              <section className="card">
                <div className="ch">
                  <h2>{reader === 'hi' ? 'संबंधित' : 'Related'}</h2>
                  <p>{reader === 'hi' ? 'इस ख़बर से जुड़ी और ख़बरें' : 'More on this story'}</p>
                </div>
                {asideRelated.map((s, i) => <RelatedRow key={s.id} story={s} n={i + 1} />)}
              </section>
            ) : null}
            {writers.length ? (
              <section className="card">
                <div className="ch">
                  <h2>{reader === 'hi' ? 'लेखक फ़ॉलो करें' : 'Writers to follow'}</h2>
                  <p>{reader === 'hi' ? 'आपको पसंद आ सकते हैं' : 'Reporters you might like'}</p>
                </div>
                {writers.map((a) => <WriterRow key={a.slug} a={a} />)}
              </section>
            ) : null}
          </aside>
        </div>
        {more.length ? (
          <section aria-labelledby="more-h">
            <h2 id="more-h" style={{ margin: '8px 0 14px', font: '700 22px Inter', letterSpacing: '-.02em' }}>{reader === 'hi' ? 'आपके लिए सुझाव' : 'Recommended for you'}</h2>
            <div className="lay-three" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '16px' }}>
              {more.slice(0, 3).map((s) => (
                <section key={s.id} className="card hv" style={{ padding: '20px' }}>
                  <TileCard story={s} />
                </section>
              ))}
            </div>
          </section>
        ) : null}
      </div>
      <SiteFooter />
    </div>
  )
}
