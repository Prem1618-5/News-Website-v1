import { Link } from 'react-router-dom'
import { useStoryView } from '@/components/story/cards'
import type { Language, Story } from '@/lib/types'

/**
 * Breaking news for the reader's area, above everything else on Today. The feed already leaves out other
 * states' local news, so only stories that matter here appear. Gone once the story stops being breaking.
 */
export default function BreakingBanner({ stories, lang }: { stories: Story[]; lang: Language }) {
  const first = stories[0]
  if (!first) return null
  return <Banner story={first} more={stories.length - 1} lang={lang} />
}

function Banner({ story, more, lang }: { story: Story; more: number; lang: Language }) {
  const v = useStoryView(story)
  const hi = lang === 'hi'
  return (
    <Link
      to={v.href}
      role="alert"
      style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderRadius: '14px', background: '#B42318', color: '#fff', textDecoration: 'none' }}
    >
      <span style={{ flexShrink: 0, padding: '3px 8px', borderRadius: '6px', background: 'rgba(255,255,255,.18)', font: '700 12px/1.2 Inter', letterSpacing: '.06em' }}>
        {hi ? 'ब्रेकिंग' : 'BREAKING'}
      </span>
      <span lang={v.hindi ? 'hi' : undefined} style={{ flex: 1, minWidth: 0, font: '600 16px/1.35 Inter', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
        {v.title}
      </span>
      {more > 0 ? <span style={{ flexShrink: 0, font: '500 13px Inter', opacity: 0.85 }}>{hi ? `+${more} और` : `+${more} more`}</span> : null}
    </Link>
  )
}
