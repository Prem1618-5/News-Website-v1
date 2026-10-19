import { useSyncExternalStore } from 'react'

/** Phone layout below this width; desktop layout at and above it. Keep in sync with the media queries in responsive.css. */
export const MOBILE_MAX = 767.98
export const TABLET_MAX = 1100
const query = `(max-width: ${MOBILE_MAX}px)`

export type Layout = 'both' | 'mobile' | 'desktop'

function subscribe(cb: () => void) {
  const mq = window.matchMedia(query)
  mq.addEventListener('change', cb)
  return () => mq.removeEventListener('change', cb)
}

/**
 * Which layout to render. "both" while prerendering and hydrating: the HTML then contains both layouts and CSS
 * shows the right one, so phones never flash the desktop design (or the reverse). Once hydrated, only the
 * matching layout stays mounted.
 */
export function useLayout(): Layout {
  return useSyncExternalStore(subscribe, () => (window.matchMedia(query).matches ? 'mobile' : 'desktop'), () => 'both')
}

export const useIsMobile = () => useLayout() === 'mobile'
