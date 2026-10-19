import { Writable } from 'node:stream'
import { renderToPipeableStream } from 'react-dom/server'
import { StaticRouter } from 'react-router-dom'
import App from './App'
import { DataProvider } from './lib/data'
import { HeadContext, headHtml, type HeadCollector, type HeadData } from './lib/head'
import { fallbackFor } from './lib/prefetch'
import { SessionProvider } from './lib/session'
import { ROUTES } from './routes'

export { buildArtifacts, staticPages, authorSlugs, PRIVATE_PATHS } from './build/artifacts'
export { fallbackFor, headHtml, ROUTES }

export type Rendered = { html: string; head: HeadData | null }

/** Renders one URL to HTML for the static build. Waits for every lazy screen, so the HTML is complete. */
export function render(url: string, fallback: Record<string, unknown>): Promise<Rendered> {
  const collector: HeadCollector = { current: null }
  return new Promise((resolve, reject) => {
    const chunks: string[] = []
    const sink = new Writable({
      write(chunk, _enc, done) {
        chunks.push(chunk.toString())
        done()
      },
      final(done) {
        resolve({ html: chunks.join(''), head: collector.current })
        done()
      },
    })
    const stream = renderToPipeableStream(
      <HeadContext.Provider value={collector}>
        <DataProvider fallback={fallback}>
          <StaticRouter location={url}>
            <SessionProvider>
              <App />
            </SessionProvider>
          </StaticRouter>
        </DataProvider>
      </HeadContext.Provider>,
      { onAllReady: () => stream.pipe(sink), onShellError: reject, onError: (e) => console.error(`[render ${url}]`, e) },
    )
  })
}
