import type { ComponentType, ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { Seo, pageTitle } from './head'
import { useLayout } from './useIsMobile'

/**
 * Renders the Desktop and Mobile layouts of a screen. During prerender and hydration both are in the HTML and CSS
 * (`.lay-d` / `.lay-m` in responsive.css) shows one; afterwards only the layout that matches the viewport stays mounted.
 * A screen with only one layout uses it everywhere, or sends the other viewport to `redirect`.
 */
export function Layouts({ desktop, mobile, redirect = '/' }: { desktop?: ReactNode; mobile?: ReactNode; redirect?: string }) {
  const layout = useLayout()
  if (desktop && !mobile) return layout === 'both' ? <div className="lay-any">{desktop}</div> : <>{desktop}</>
  if (mobile && !desktop) {
    if (layout === 'desktop') return <Navigate to={redirect} replace />
    return layout === 'both' ? <div className="lay-m">{mobile}</div> : <>{mobile}</>
  }
  if (layout === 'both')
    return (
      <>
        <div className="lay-d">{desktop}</div>
        <div className="lay-m">{mobile}</div>
      </>
    )
  return <>{layout === 'mobile' ? mobile : desktop}</>
}

type Opts = {
  title: string
  Desktop?: ComponentType
  Mobile?: ComponentType
  /** Where desktop visitors go when the screen only exists on mobile. */
  desktopRedirect?: string
  /** App screens (account, saved, states) are not for search engines. */
  index?: boolean
  description?: string
}

/** Builds a route component for a screen that has no data-driven head of its own. */
export function responsive({ title, Desktop, Mobile, desktopRedirect = '/', index = false, description = '' }: Opts) {
  return function Screen() {
    const { pathname } = useLocation()
    return (
      <>
        <Seo title={pageTitle(title)} description={description || `${title} on News APP.`} path={pathname} noindex={!index} />
        <Layouts desktop={Desktop && <Desktop />} mobile={Mobile && <Mobile />} redirect={desktopRedirect} />
      </>
    )
  }
}
