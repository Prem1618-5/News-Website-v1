import type { CSSProperties, ReactNode } from 'react'
import { SECTION_ICON } from '@/lib/taxonomy'
import type { SectionKey } from '@/lib/types'

const paths: Record<string, ReactNode> = {
  heart: <path d="M12 20s-8-5-8-11a4.5 4.5 0 018-2.5A4.5 4.5 0 0120 9c0 6-8 11-8 11z" />,
  bookmark: <path d="M6 3h12v18l-6-4-6 4z" />,
  check: <path d="M5 12l5 5 9-10" />,
  pin: (
    <>
      <path d="M12 21s7-6 7-12a7 7 0 10-14 0c0 6 7 12 7 12z" />
      <circle cx="12" cy="9" r="2.5" />
    </>
  ),
  chevron: <path d="M9 6l6 6-6 6" />,
  close: <path d="M6 6l12 12M18 6L6 18" />,
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-4-4" />
    </>
  ),
  bell: <path d="M6 17v-6a6 6 0 0112 0v6l2 2H4zM10 21h4" />,
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c1-5 15-5 16 0" />
    </>
  ),
  share: (
    <>
      <circle cx="6" cy="12" r="2" />
      <circle cx="18" cy="6" r="2" />
      <circle cx="18" cy="18" r="2" />
      <path d="M8 11l8-4M8 13l8 4" />
    </>
  ),
  link: <path d="M10 14a4 4 0 005 0l3-3a4 4 0 00-5-5l-1 1M14 10a4 4 0 00-5 0l-3 3a4 4 0 005 5l1-1" />,
  warn: <path d="M12 3l10 18H2zM12 10v4M12 17h.01" />,
  home: <path d="M3 11l9-8 9 8M5 10v10h14V10" />,
  grid: (
    <>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </>
  ),
  rss: <path d="M5 5a14 14 0 0114 14M5 11a8 8 0 018 8M6 19h.01" />,
}

export type IconName = keyof typeof paths

export function Ico({ name, size = 18, fill = false, style }: { name: IconName; size?: number; fill?: boolean; style?: CSSProperties }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={fill ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={style}>
      {paths[name]}
    </svg>
  )
}

/** A desk's outline icon. Markup comes from the static SECTION_ICON table, never from data. */
export function SectionIcon({ k, size = 22, style }: { k: SectionKey; size?: number; style?: CSSProperties }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={style}
      dangerouslySetInnerHTML={{ __html: SECTION_ICON[k] }}
    />
  )
}
