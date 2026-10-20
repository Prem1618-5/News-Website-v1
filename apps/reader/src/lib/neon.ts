import { createAuthClient } from '@neondatabase/neon-js/auth'
import { BetterAuthReactAdapter } from '@neondatabase/neon-js/auth/react/adapters'

/**
 * Neon Auth client (auth only, no Data API). Browser only: created on first use and only ever imported
 * dynamically, so the prerender (which runs in Node) never loads it. Needs VITE_NEON_AUTH_URL.
 */
const build = () => createAuthClient(import.meta.env.VITE_NEON_AUTH_URL as string, { adapter: BetterAuthReactAdapter() })

let client: ReturnType<typeof build> | null = null

export const getNeon = () => (client ??= build())
