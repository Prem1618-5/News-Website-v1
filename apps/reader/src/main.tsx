import { StrictMode } from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { DataProvider } from './lib/data'
import { SessionProvider } from './lib/session'
import { preloadRoute } from './routes'
import './styles/index.css'

declare global {
  interface Window {
    /** SWR fallback written into prerendered pages: the data that page was rendered with. */
    __DATA__?: Record<string, unknown>
  }
}

async function start() {
  const root = document.getElementById('root')!
  const app = (
    <StrictMode>
      <DataProvider fallback={window.__DATA__}>
        <BrowserRouter>
          <SessionProvider>
            <App />
          </SessionProvider>
        </BrowserRouter>
      </DataProvider>
    </StrictMode>
  )
  // Prerendered pages are hydrated. The 404 shell and the dev server have nothing to hydrate: render from scratch.
  if (root.firstElementChild && !root.hasAttribute('data-spa')) {
    await preloadRoute(location.pathname)
    hydrateRoot(root, app)
  } else {
    createRoot(root).render(app)
  }
}

void start()

// Installable app and offline reading. Production only: in development a worker would serve stale modules.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => void navigator.serviceWorker.register('/sw.js'))
}
