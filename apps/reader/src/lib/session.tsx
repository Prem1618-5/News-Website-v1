import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { ApiError, api, post, put } from './api'
import { library, mergeLibraries, type Library } from './library'
import { readerId } from './consent'

export type User = { id: string; email: string; display_name: string }
type Status = 'loading' | 'anon' | 'authed'

type Ctx = {
  status: Status
  user: User | null
  login: (email: string, password: string) => Promise<void>
  signup: (displayName: string, email: string, password: string) => Promise<{ confirmationRequired: boolean }>
  logout: () => Promise<void>
}

const SessionContext = createContext<Ctx | null>(null)

type SessionPayload = { authenticated: boolean; user?: { id?: string; email?: string; user_metadata?: { display_name?: string } } | null; confirmation_required?: boolean }

const toUser = (p: SessionPayload): User | null =>
  p.authenticated && p.user?.id ? { id: p.user.id, email: p.user.email ?? '', display_name: p.user.user_metadata?.display_name ?? '' } : null

type ServerState = Partial<Library> & { cm?: unknown; theme?: string; sz?: number }

export function SessionProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>('loading')
  const [user, setUser] = useState<User | null>(null)
  const timer = useRef<number | undefined>(undefined)

  const adopt = useCallback((next: User | null) => {
    setUser(next)
    setStatus(next ? 'authed' : 'anon')
  }, [])

  // Pull the saved shelf once signed in, merge it with what this device has, then keep both in step.
  useEffect(() => {
    if (status !== 'authed') {
      library.onChange(null)
      return
    }
    let live = true
    api<ServerState>('/reader/state', { headers: { 'X-Legacy-Reader-Id': readerId() } })
      .then((remote) => {
        if (!live) return
        const merged = mergeLibraries(library.get(), remote)
        library.adopt(merged)
        void push(merged)
      })
      .catch(() => {
        /* the local shelf keeps working */
      })
    const push = (s: Library) =>
      put('/reader/state', { saved: s.saved.slice(0, 500), liked: s.liked.slice(0, 500), follow: s.follow.slice(0, 80), hl: s.hl.slice(0, 1000), lang: s.lang, cm: {}, theme: '', sz: 0 }).catch(() => undefined)
    library.onChange((s) => {
      window.clearTimeout(timer.current)
      timer.current = window.setTimeout(() => void push(s), 800)
    })
    return () => {
      live = false
      library.onChange(null)
    }
  }, [status])

  useEffect(() => {
    let live = true
    api<SessionPayload>('/auth/session')
      .then((p) => live && adopt(toUser(p)))
      .catch(() => live && adopt(null))
    return () => {
      live = false
    }
  }, [adopt])

  const value = useMemo<Ctx>(
    () => ({
      status,
      user,
      login: async (email, password) => {
        const p = await post<SessionPayload>('/auth/login', { email, password })
        adopt(toUser(p))
      },
      signup: async (displayName, email, password) => {
        const p = await post<SessionPayload>('/auth/signup', { display_name: displayName, email, password })
        adopt(toUser(p))
        return { confirmationRequired: !!p.confirmation_required }
      },
      logout: async () => {
        try {
          await post('/auth/logout')
        } finally {
          adopt(null)
        }
      },
    }),
    [status, user, adopt],
  )

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}

export function useSession(): Ctx {
  const ctx = useContext(SessionContext)
  if (!ctx) throw new Error('useSession must be used inside <SessionProvider>')
  return ctx
}

export const errorMessage = (e: unknown) => (e instanceof ApiError || e instanceof Error ? e.message : 'Something went wrong. Try again.')
