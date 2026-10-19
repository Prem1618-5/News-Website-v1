import type { ComponentType } from 'react'
import { renderToString } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { DataProvider } from '@/lib/data'
import { fallbackFor } from '@/lib/prefetch'
import { SessionProvider } from '@/lib/session'
import { story, snapshot } from '@/test/fixtures'

/** Every Desktop / Mobile layout in screens/**, rendered on the server inside the router and data providers. */
const modules = import.meta.glob<{ default: ComponentType<Record<string, unknown>> }>('./screens/**/{Desktop,Mobile,Desk*}.tsx', { eager: true })

const snap = snapshot()
const searchModel = {
  q: '', text: '', setText: () => undefined, scope: 'all', setScope: () => undefined, desk: 'all', setDesk: () => undefined,
  searching: false, source: { stories: [], total: 0, loading: false, error: false, retry: () => undefined }, stories: [], lang: 'en',
}
/** Layouts that are given their data by the screen's index.tsx. */
const props: Record<string, Record<string, unknown>> = {
  'Section/': { desk: 'safety' },
  'Article/': { story: story(), lang: 'en' },
  'Writer/': { slug: 'news-app-desk' },
  'Search/': { m: searchModel },
}
const propsFor = (path: string) => Object.entries(props).find(([k]) => path.includes(`/${k}`))?.[1] ?? {}

describe('screens', () => {
  it('finds the layouts', () => {
    expect(Object.keys(modules).length).toBeGreaterThan(40)
  })

  for (const [path, mod] of Object.entries(modules)) {
    it(`renders ${path.replace('./screens/', '')}`, () => {
      const Screen = mod.default
      const html = renderToString(
        <MemoryRouter initialEntries={['/']}>
          <DataProvider fallback={fallbackFor('/section/safety', snap)}>
            <SessionProvider>
              <Screen {...propsFor(path)} />
            </SessionProvider>
          </DataProvider>
        </MemoryRouter>,
      )
      expect(html.length).toBeGreaterThan(100)
    })
  }

  it('contains no demo content from the original design', () => {
    const html = Object.entries(modules)
      .map(([path, mod]) => {
        const Screen = mod.default
        return renderToString(
          <MemoryRouter>
            <DataProvider fallback={{}}>
              <SessionProvider>
                <Screen {...propsFor(path)} />
              </SessionProvider>
            </DataProvider>
          </MemoryRouter>,
        )
      })
      .join('\n')
    for (const demo of ['Nisha Rao', 'Meera Iyer', 'Kabir Sen', 'Tara Bose', 'Isha Verma', 'G7 agrees', 'voice-first', 'Elena Vasquez', '12.4K', 'Joined March 2021']) {
      expect(html).not.toContain(demo)
    }
  })
})
