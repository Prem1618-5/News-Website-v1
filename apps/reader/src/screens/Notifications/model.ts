import { useNotices } from '@/lib/hooks'
import { useLibrary } from '@/lib/library'

export function useNoticesModel() {
  const { notices, unread, ready } = useNotices()
  const { lang } = useLibrary()
  return { ready, unread, lang, breaking: notices.filter((n) => n.kind === 'breaking'), rest: notices.filter((n) => n.kind !== 'breaking'), none: ready && notices.length === 0 }
}
