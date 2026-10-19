/** Site-wide constants. VITE_SITE_URL must be set for production builds (see .env.example). */
const env = import.meta.env as Record<string, string | undefined>

export const SITE = {
  name: 'News APP',
  tagline: 'Ranchi and Jharkhand news in English and Hindi',
  description:
    'Clear, sourced news from Ranchi, Jharkhand, India and the world, in English and Hindi. Read the day in minutes.',
  descriptionHi: 'रांची, झारखंड, देश और दुनिया की साफ़, स्रोत-सहित ख़बरें अंग्रेज़ी और हिंदी में।',
  url: (env.VITE_SITE_URL ?? 'http://localhost:4173').replace(/\/+$/, ''),
  email: env.VITE_CONTACT_EMAIL ?? '',
  /** Byline used when a story credits the desk rather than a named reporter. */
  deskName: 'News APP Desk',
  city: 'Ranchi',
  region: 'Jharkhand',
} as const

export const abs = (path: string) => `${SITE.url}${path.startsWith('/') ? path : `/${path}`}`
