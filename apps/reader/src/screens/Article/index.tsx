import { Navigate, useLocation, useParams } from 'react-router-dom'
import { ErrorView, LoadingView } from '@/components/shared/States'
import { useStory } from '@/lib/data'
import { Seo } from '@/lib/head'
import { Layouts } from '@/lib/responsive'
import { storyHead } from '@/lib/seo'
import type { Language, StoryDetail } from '@/lib/types'
import NotFound from '@/screens/NotFound'
import ArticleDesktop from './Desktop'
import ArticleMobile from './Mobile'
import { useReadTracking } from './parts'

function Page({ story, lang }: { story: StoryDetail; lang: Language }) {
  useReadTracking(story)
  return (
    <>
      <Seo {...storyHead(story, lang)} />
      <Layouts desktop={<ArticleDesktop story={story} lang={lang} />} mobile={<ArticleMobile story={story} lang={lang} />} />
    </>
  )
}

function Loaded({ slug, lang }: { slug: string; lang: Language }) {
  const { story, notFound, error, retry } = useStory(slug)
  if (notFound) return <NotFound />
  if (error) return <ErrorView onRetry={retry} what="this story" />
  if (!story) return <LoadingView />
  // A Hindi URL for a story that has no Hindi text goes back to the English page.
  if (lang === 'hi' && !story.has_hi && story.language !== 'hi') return <Navigate to={`/story/${encodeURIComponent(story.slug)}`} replace />
  return <Page story={story} lang={lang} />
}

/** /story/:slug (English) and /hi/story/:slug (Hindi). */
export default function Article() {
  const { slug = '' } = useParams()
  const { pathname } = useLocation()
  const lang: Language = pathname.startsWith('/hi/') ? 'hi' : 'en'
  return <Loaded key={`${lang}:${slug}`} slug={decodeURIComponent(slug)} lang={lang} />
}
