import { authorsOf } from '@/components/story/writers'
import { useFeed } from '@/lib/data'
import { useLibrary } from '@/lib/library'
import { SECTIONS, isSection } from '@/lib/taxonomy'

export function useFollowingModel() {
  const feed = useFeed()
  const { follow, lang } = useLibrary()
  const desks = follow.filter(isSection)
  const writerSlugs = follow.filter((k) => k.startsWith('w:')).map((k) => k.slice(2))
  const writers = authorsOf(feed.stories).filter((a) => writerSlugs.includes(a.slug))
  const stories = feed.stories.filter((s) => desks.includes(s.section) || writerSlugs.includes(s.author_slug))
  return {
    feed, lang, desks, writers, stories, none: follow.length === 0,
    suggested: SECTIONS.filter((s) => !desks.includes(s.key)).slice(0, 6),
  }
}
