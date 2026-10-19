import type { Block, Snapshot, StoryDetail } from '@/lib/types'

const p = (text: string): Block => ({ id: text.slice(0, 4), type: 'paragraph', props: {}, content: [{ type: 'text', text, styles: {} }], children: [] })

export const story = (over: Partial<StoryDetail> = {}): StoryDetail => ({
  id: 'ranchi-airport-ready',
  slug: 'ranchi-airport-ready',
  section: 'business',
  scope: 'local',
  state: 'JH',
  district: 'ranchi',
  title: 'Ranchi airport says it is ready for international flights',
  title_hi: 'रांची हवाई अड्डा अंतरराष्ट्रीय उड़ानों के लिए तैयार',
  deck: 'Awaits only a proposal from an airline.',
  deck_hi: 'बस किसी एयरलाइन के प्रस्ताव का इंतज़ार।',
  author: 'News APP Desk',
  author_slug: 'news-app-desk',
  read_minutes: 2,
  live: false,
  urgency: 2,
  breaking: false,
  image_url: '',
  caption: '',
  source_name: 'The CSR Journal',
  source_url: 'https://thecsrjournal.in/x',
  language: 'en',
  has_hi: true,
  published_at: '2026-10-19T06:30:00.000Z',
  updated_at: '2026-10-19T06:30:00.000Z',
  body: [p('The airport is ready.'), p('Customs and immigration are in place.')],
  body_hi: [p('हवाई अड्डा तैयार है।')],
  sources: [{ name: 'The CSR Journal', url: 'https://thecsrjournal.in/x' }],
  ...over,
})

export const snapshot = (): Snapshot => ({
  generated_at: '2026-10-19T07:00:00.000Z',
  sections: [{ key: 'business', count: 2 }, { key: 'safety', count: 1 }],
  stories: [
    story(),
    story({ id: 'bus-overturns', slug: 'bus-overturns', section: 'safety', title: 'Bus overturns on NH-33', title_hi: 'बस पलटी', has_hi: true, published_at: '2026-10-19T05:00:00.000Z', updated_at: '2026-10-19T05:00:00.000Z' }),
    story({ id: 'hindi-only', slug: 'hindi-only', title: 'Hindi original', has_hi: false, title_hi: '', language: 'hi', published_at: '2026-10-10T05:00:00.000Z', updated_at: null }),
  ],
})
