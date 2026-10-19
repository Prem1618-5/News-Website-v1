import { authorsOf } from '@/components/story/writers'
import { useAuthor } from '@/lib/data'
import { useLibrary } from '@/lib/library'
import { SITE } from '@/site'

export const DESK_SLUG = 'news-app-desk'

export function useWriterModel(slug: string) {
  const feed = useAuthor(slug)
  const { lang } = useLibrary()
  const author = authorsOf(feed.stories)[0] ?? { name: slug === DESK_SLUG ? SITE.deskName : slug, slug, count: 0, desk: slug === DESK_SLUG }
  return {
    feed, lang, author,
    name: author.name,
    stories: feed.stories,
    total: feed.total,
    desks: [...new Set(feed.stories.map((s) => s.section))],
  }
}
