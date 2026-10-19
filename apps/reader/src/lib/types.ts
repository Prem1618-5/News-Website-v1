import type { ScopeKey, SectionKey, Language } from '@news/contracts'

export type { ScopeKey, SectionKey, Language }

export type InlineText = { type: 'text'; text: string; styles?: Record<string, unknown> }
export type InlineLink = { type: 'link'; href: string; content: InlineText[] }
export type Block = {
  id?: string
  type: string
  props?: Record<string, unknown>
  content?: (InlineText | InlineLink)[] | Record<string, unknown>
  children?: Block[]
}

export type Source = { name: string; url: string }

/** A story as it appears in feeds (no body). */
export type Story = {
  id: string
  slug: string
  section: SectionKey
  scope: ScopeKey
  title: string
  title_hi: string
  deck: string
  deck_hi: string
  author: string
  author_slug: string
  read_minutes: number
  live: boolean
  urgency: number
  image_url: string
  caption: string
  source_name: string
  source_url: string
  language: Language
  has_hi: boolean
  published_at: string | null
  updated_at: string | null
}

export type StoryDetail = Story & { body: Block[]; body_hi: Block[]; sources: Source[] }
export type Page = { total: number; items: Story[] }

/** Shape of GET /api/snapshot, which the static build prerenders from. */
export type Snapshot = {
  generated_at: string
  sections: { key: SectionKey; count: number }[]
  stories: StoryDetail[]
}
