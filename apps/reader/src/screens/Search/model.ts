import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useFeed, useSearch } from '@/lib/data'
import { track } from '@/lib/consent'
import { useLibrary } from '@/lib/library'
import type { ScopeKey, SectionKey } from '@/lib/types'

export function useSearchModel() {
  const [params, setParams] = useSearchParams()
  const q = params.get('q') ?? ''
  const [text, setText] = useState(q)
  const [scope, setScope] = useState<ScopeKey | 'all'>('all')
  const [desk, setDesk] = useState<SectionKey | 'all'>('all')
  const { lang } = useLibrary()

  // Keep the box in step with the URL (header search, back button), and the URL in step with typing.
  useEffect(() => setText(q), [q])
  useEffect(() => {
    const t = window.setTimeout(() => {
      if (text.trim() !== q.trim()) setParams(text.trim() ? { q: text.trim() } : {}, { replace: true })
    }, 250)
    return () => window.clearTimeout(t)
  }, [text, q, setParams])

  const searching = q.trim().length >= 2
  const results = useSearch(q)
  const latest = useFeed()
  useEffect(() => {
    if (searching) track('search')
  }, [q, searching])

  const source = searching ? results : latest
  const stories = source.stories.filter((s) => (scope === 'all' || s.scope === scope) && (desk === 'all' || s.section === desk))
  return { q, text, setText, scope, setScope, desk, setDesk, searching, source, stories, lang }
}
