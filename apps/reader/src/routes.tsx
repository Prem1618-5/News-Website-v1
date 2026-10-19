import { lazy, type ComponentType, type LazyExoticComponent } from 'react'
import { matchRoutes } from 'react-router-dom'

type Loader = () => Promise<{ default: ComponentType }>
type Entry = { path: string; load: Loader }

/**
 * Route table: one lazy chunk per screen. Every screen renders a Desktop or Mobile layout by viewport width
 * (see lib/responsive). Routes marked "preview" are design-review states: noindex, kept out of the sitemap.
 */
export const ROUTES: Entry[] = [
  { path: '/', load: () => import('@/screens/Today') },
  { path: '/story/:slug', load: () => import('@/screens/Article') },
  { path: '/hi/story/:slug', load: () => import('@/screens/Article') },
  { path: '/section/:desk', load: () => import('@/screens/Section') },
  { path: '/writer', load: () => import('@/screens/Writer') },
  { path: '/writer/:slug', load: () => import('@/screens/Writer') },
  { path: '/categories', load: () => import('@/screens/Categories') },
  { path: '/search', load: () => import('@/screens/Search') },
  { path: '/following', load: () => import('@/screens/Following') },
  { path: '/saved', load: () => import('@/screens/Saved') },
  { path: '/notifications', load: () => import('@/screens/Notifications') },
  { path: '/account', load: () => import('@/screens/Account') },
  { path: '/location', load: () => import('@/screens/Location') },
  { path: '/landing', load: () => import('@/screens/Landing') },
  { path: '/login', load: () => import('@/screens/Login') },
  { path: '/signup', load: () => import('@/screens/Signup') },
  { path: '/forgot-password', load: () => import('@/screens/Forgot') },
  { path: '/onboarding', load: () => import('@/screens/Onboarding') },
  { path: '/onboarding/2', load: () => import('@/screens/Onboarding2') },
  { path: '/about', load: () => import('@/screens/Info/About') },
  { path: '/editorial-standards', load: () => import('@/screens/Info/Standards') },
  { path: '/contact', load: () => import('@/screens/Info/Contact') },
  { path: '/privacy', load: () => import('@/screens/Info/Privacy') },
  // preview: empty and error states, design system
  { path: '/following/empty', load: () => import('@/screens/FollowingEmpty') },
  { path: '/saved/empty', load: () => import('@/screens/SavedEmpty') },
  { path: '/search/no-results', load: () => import('@/screens/NoResults') },
  { path: '/notifications/empty', load: () => import('@/screens/NoNotifications') },
  { path: '/states/loading', load: () => import('@/screens/Loading') },
  { path: '/states/offline', load: () => import('@/screens/Offline') },
  { path: '/states/load-error', load: () => import('@/screens/LoadError') },
  { path: '/states/no-highlights', load: () => import('@/screens/NoHighlights') },
  { path: '/states/feedback', load: () => import('@/screens/Feedback') },
  { path: '/design-system', load: () => import('@/screens/System') },
  { path: '/404', load: () => import('@/screens/NotFound') },
]

const NOT_FOUND: Loader = () => import('@/screens/NotFound')

export const lazyScreens = new Map<string, LazyExoticComponent<ComponentType>>(ROUTES.map((r) => [r.path, lazy(r.load)]))
export const NotFoundScreen = lazy(NOT_FOUND)

/** Load the chunk for a URL ahead of rendering, so hydration finds the screen ready. */
export async function preloadRoute(pathname: string): Promise<void> {
  const match = matchRoutes(ROUTES.map((r) => ({ path: r.path })), pathname)?.[0]
  const entry = match && ROUTES.find((r) => r.path === match.route.path)
  await (entry ? entry.load() : NOT_FOUND())
}
