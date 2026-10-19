import { useEffect, useState, type ReactNode } from 'react'
import { Layouts } from '@/lib/responsive'
import FollowingEmptyDesktop from '@/screens/FollowingEmpty/Desktop'
import FollowingEmptyMobile from '@/screens/FollowingEmpty/Mobile'
import LoadErrorDesktop from '@/screens/LoadError/Desktop'
import LoadErrorMobile from '@/screens/LoadError/Mobile'
import LoadingDesktop from '@/screens/Loading/Desktop'
import LoadingMobile from '@/screens/Loading/Mobile'
import NoHighlightsDesktop from '@/screens/NoHighlights/Desktop'
import NoHighlightsMobile from '@/screens/NoHighlights/Mobile'
import NoNotificationsDesktop from '@/screens/NoNotifications/Desktop'
import NoNotificationsMobile from '@/screens/NoNotifications/Mobile'
import NoResultsDesktop from '@/screens/NoResults/Desktop'
import NoResultsMobile from '@/screens/NoResults/Mobile'
import OfflineDesktop from '@/screens/Offline/Desktop'
import OfflineMobile from '@/screens/Offline/Mobile'
import SavedEmptyDesktop from '@/screens/SavedEmpty/Desktop'
import SavedEmptyMobile from '@/screens/SavedEmpty/Mobile'

/** The design's state screens, usable inside any data screen. */
export const LoadingView = () => <Layouts desktop={<LoadingDesktop />} mobile={<LoadingMobile />} />
export const ErrorView = ({ onRetry, what }: { onRetry?: () => void; what?: string }) => (
  <Layouts desktop={<LoadErrorDesktop onRetry={onRetry} what={what} />} mobile={<LoadErrorMobile onRetry={onRetry} what={what} />} />
)
export const OfflineView = ({ onRetry }: { onRetry?: () => void }) => <Layouts desktop={<OfflineDesktop onRetry={onRetry} />} mobile={<OfflineMobile onRetry={onRetry} />} />
export const NoResultsView = ({ q }: { q: string }) => <Layouts desktop={<NoResultsDesktop q={q} />} mobile={<NoResultsMobile q={q} />} />
export const SavedEmptyView = () => <Layouts desktop={<SavedEmptyDesktop />} mobile={<SavedEmptyMobile />} />
export const FollowingEmptyView = () => <Layouts desktop={<FollowingEmptyDesktop />} mobile={<FollowingEmptyMobile />} />
export const NoNotificationsView = () => <Layouts desktop={<NoNotificationsDesktop />} mobile={<NoNotificationsMobile />} />
export const NoHighlightsView = () => <Layouts desktop={<NoHighlightsDesktop />} mobile={<NoHighlightsMobile />} />

/** True once the browser reports it is offline. Always false while prerendering. */
export function useOffline(): boolean {
  const [offline, setOffline] = useState(false)
  useEffect(() => {
    const sync = () => setOffline(!navigator.onLine)
    sync()
    window.addEventListener('online', sync)
    window.addEventListener('offline', sync)
    return () => {
      window.removeEventListener('online', sync)
      window.removeEventListener('offline', sync)
    }
  }, [])
  return offline
}

/** Shows the loading, offline or error screen instead of `children` until the data is there. */
export function DataGate({ loading, error, retry, what, children }: { loading: boolean; error: boolean; retry: () => void; what?: string; children: ReactNode }) {
  const offline = useOffline()
  if (loading) return <LoadingView />
  if (error) return offline ? <OfflineView onRetry={retry} /> : <ErrorView onRetry={retry} what={what} />
  return <>{children}</>
}
