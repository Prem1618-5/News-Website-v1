/** Neon Auth glue that is safe to import anywhere: the SDK itself is only loaded on demand, in the browser. */
export const NEON_AUTH_URL = ((import.meta.env.VITE_NEON_AUTH_URL as string | undefined) ?? '').trim()

const FLAG = 'news_neon'

/** Remember that this browser has used Neon sign-in, so other visitors never pay for a session check. */
export function markNeonUser(on: boolean) {
  try {
    if (on) localStorage.setItem(FLAG, '1')
    else localStorage.removeItem(FLAG)
  } catch {
    /* storage blocked: Neon sign-in then simply is not restored on the next visit */
  }
}

export function isNeonUser(): boolean {
  try {
    return !!NEON_AUTH_URL && typeof window !== 'undefined' && localStorage.getItem(FLAG) === '1'
  } catch {
    return false
  }
}

/** The current Neon JWT (the SDK refreshes it before it expires), or null when there is no Neon session. */
export async function neonJwt(): Promise<string | null> {
  if (!NEON_AUTH_URL || typeof window === 'undefined') return null
  const { getNeon } = await import('./neon')
  const session = await getNeon().getSession()
  return session.data?.session?.token ?? null
}

export async function neonSignOut(): Promise<void> {
  if (!NEON_AUTH_URL) return
  const { getNeon } = await import('./neon')
  await getNeon().signOut()
}
