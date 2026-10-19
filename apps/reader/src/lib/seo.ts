/** Structured data and page-level SEO helpers. Pure functions, shared by the screens and the prerender step. */
import { placeLabel } from '@news/contracts'
import { SITE, abs } from '@/site'
import { blocksText } from './blocks'
import { fmtLongDate, storyPath, titleOf, deckOf } from './format'
import { DEFAULT_IMAGE, pageTitle, type HeadData } from './head'
import { sectionAbout, sectionName } from './taxonomy'
import type { Language, SectionKey, Story, StoryDetail } from './types'

const ORG_ID = `${SITE.url}/#organization`
const SITE_ID = `${SITE.url}/#website`

export const clip = (text: string, max: number) => {
  const t = text.replace(/\s+/g, ' ').trim()
  if (t.length <= max) return t
  const cut = t.slice(0, max - 1)
  return `${cut.slice(0, cut.lastIndexOf(' ') > 40 ? cut.lastIndexOf(' ') : cut.length).replace(/[,;:.\s-]+$/, '')}…`
}

export const organizationLd = () => ({
  '@context': 'https://schema.org',
  '@type': 'NewsMediaOrganization',
  '@id': ORG_ID,
  name: SITE.name,
  url: SITE.url,
  logo: { '@type': 'ImageObject', url: abs('/icon-512.png'), width: 512, height: 512 },
  description: SITE.description,
  areaServed: [{ '@type': 'City', name: SITE.city }, { '@type': 'State', name: SITE.region }],
  knowsLanguage: ['en-IN', 'hi-IN'],
  publishingPrinciples: abs('/editorial-standards'),
  ethicsPolicy: abs('/editorial-standards'),
  correctionsPolicy: abs('/editorial-standards#corrections'),
  actionableFeedbackPolicy: abs('/contact'),
  ...(SITE.email ? { email: SITE.email } : {}),
})

export const websiteLd = () => ({
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  '@id': SITE_ID,
  url: SITE.url,
  name: SITE.name,
  description: SITE.description,
  inLanguage: ['en-IN', 'hi-IN'],
  publisher: { '@id': ORG_ID },
  potentialAction: {
    '@type': 'SearchAction',
    target: { '@type': 'EntryPoint', urlTemplate: `${SITE.url}/search?q={search_term_string}` },
    'query-input': 'required name=search_term_string',
  },
})

export const breadcrumbLd = (items: [name: string, path: string][]) => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: items.map(([name, path], i) => ({ '@type': 'ListItem', position: i + 1, name, item: abs(path) })),
})

export const itemListLd = (stories: Story[], lang: Language = 'en') => ({
  '@context': 'https://schema.org',
  '@type': 'ItemList',
  itemListElement: stories.slice(0, 20).map((s, i) => ({ '@type': 'ListItem', position: i + 1, url: abs(storyPath(s, lang)), name: titleOf(s, lang) })),
})

export const isDesk = (author: string) => author === SITE.deskName

export function articleLd(story: StoryDetail, lang: Language) {
  const body = lang === 'hi' && story.body_hi.length ? story.body_hi : story.body
  const url = abs(storyPath(story, lang))
  const place = story.scope === 'local' || story.scope === 'state' ? placeLabel({ state: story.state, district: story.scope === 'local' ? story.district : '' }) : ''
  return {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    '@id': `${url}#article`,
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    url,
    headline: clip(titleOf(story, lang), 110),
    description: describeStory(story, lang),
    inLanguage: lang === 'hi' ? 'hi-IN' : 'en-IN',
    datePublished: story.published_at ?? undefined,
    dateModified: story.updated_at ?? story.published_at ?? undefined,
    articleSection: sectionName(story.section, lang),
    isAccessibleForFree: true,
    wordCount: blocksText(body).split(/\s+/).filter(Boolean).length,
    articleBody: blocksText(body),
    image: [story.image_url ? (story.image_url.startsWith('http') ? story.image_url : abs(story.image_url)) : abs(DEFAULT_IMAGE)],
    author: isDesk(story.author)
      ? { '@type': 'Organization', name: SITE.deskName, url: abs(`/writer/${story.author_slug}`) }
      : { '@type': 'Person', name: story.author, url: abs(`/writer/${story.author_slug}`) },
    publisher: { '@type': 'NewsMediaOrganization', '@id': ORG_ID, name: SITE.name, logo: { '@type': 'ImageObject', url: abs('/icon-512.png') } },
    ...(place ? { contentLocation: { '@type': 'Place', name: place } } : {}),
    ...(story.sources.length
      ? { citation: story.sources.map((s) => ({ '@type': 'CreativeWork', name: s.name, url: s.url })), isBasedOn: story.sources[0].url }
      : {}),
    speakable: { '@type': 'SpeakableSpecification', cssSelector: ['[data-speakable]'] },
  }
}

export function describeStory(story: Story, lang: Language): string {
  const deck = deckOf(story, lang)
  return clip(deck || titleOf(story, lang), 158)
}

export function storyHead(story: StoryDetail, lang: Language): HeadData {
  const hi = lang === 'hi' && story.has_hi
  const l: Language = hi ? 'hi' : story.language === 'hi' ? 'hi' : 'en'
  const path = storyPath(story, hi ? 'hi' : 'en')
  return {
    title: pageTitle(titleOf(story, hi ? 'hi' : 'en')),
    description: describeStory(story, hi ? 'hi' : 'en'),
    path,
    lang: l,
    type: 'article',
    image: story.image_url || undefined,
    published: story.published_at,
    modified: story.updated_at ?? story.published_at,
    section: sectionName(story.section, hi ? 'hi' : 'en'),
    author: story.author,
    markdown: `/story/${encodeURIComponent(story.slug)}.md`,
    alternates: story.has_hi
      ? [['en-IN', storyPath(story, 'en')], ['hi-IN', storyPath(story, 'hi')], ['x-default', storyPath(story, 'en')]]
      : undefined,
    jsonLd: [
      articleLd(story, hi ? 'hi' : 'en'),
      breadcrumbLd([
        [SITE.name, '/'],
        [sectionName(story.section, hi ? 'hi' : 'en'), `/section/${story.section}`],
        [titleOf(story, hi ? 'hi' : 'en'), path],
      ]),
    ],
  }
}

export function sectionHead(key: SectionKey, stories: Story[]): HeadData {
  const name = sectionName(key)
  return {
    title: pageTitle(`${name} news`),
    description: clip(`${sectionAbout(key)} Latest ${name.toLowerCase()} stories from Ranchi, Jharkhand, India and the world, in English and Hindi.`, 158),
    path: `/section/${key}`,
    jsonLd: [
      { '@context': 'https://schema.org', '@type': 'CollectionPage', name: `${name} news`, url: abs(`/section/${key}`), isPartOf: { '@id': SITE_ID } },
      breadcrumbLd([[SITE.name, '/'], [name, `/section/${key}`]]),
      itemListLd(stories),
    ],
  }
}

export const todayLabel = (iso: string, lang: Language = 'en') => fmtLongDate(iso, lang)

/** Markdown copy of a story for AI agents and people who want plain text. */
export function storyMarkdown(story: StoryDetail): string {
  const lines = [`# ${story.title}`, '']
  if (story.deck) lines.push(`> ${story.deck}`, '')
  lines.push(
    `- Section: ${sectionName(story.section)}`,
    `- Published: ${story.published_at ?? ''}`,
    `- By: ${story.author}`,
    `- URL: ${abs(storyPath(story))}`,
    ...(story.has_hi ? [`- हिंदी: ${abs(storyPath(story, 'hi'))}`] : []),
    '',
  )
  const toMd = (blocks: StoryDetail['body']) =>
    blocks
      .map((b, i, all) => {
        const text = blocksText([b])
        if (b.type === 'bulletListItem') return `- ${text}`
        if (b.type === 'numberedListItem') return `${all.slice(0, i + 1).filter((x) => x.type === 'numberedListItem').length}. ${text}`
        if (b.type === 'heading') return `\n## ${text}`
        if (b.type === 'quote') return `> ${text}`
        return `\n${text}`
      })
      .join('\n')
  lines.push(toMd(story.body).trim())
  if (story.sources.length) lines.push('', '## Sources', ...story.sources.map((s) => `- [${s.name}](${s.url})`))
  if (story.body_hi.length) lines.push('', '---', '', `# ${story.title_hi}`, '', story.deck_hi ? `> ${story.deck_hi}\n` : '', toMd(story.body_hi).trim())
  return lines.join('\n').replace(/\n{3,}/g, '\n\n') + '\n'
}
