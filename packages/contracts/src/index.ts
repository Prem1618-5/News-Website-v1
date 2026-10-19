import contracts from "../contracts.json";

export type SectionKey =
  | "world" | "politics" | "business" | "tech" | "sports" | "culture" | "science"
  | "health" | "safety" | "justice" | "education" | "environment" | "entertainment";
/** Coverage area of a story: where it happens. Drives the Local / State / National / World switch. */
export type ScopeKey = "ranchi" | "jharkhand" | "india" | "world";
export type Language = "en" | "hi";
export type ConsentId = "necessary" | "preferences" | "analytics" | "personalization" | "notifications";
export type AiTask = "headline" | "summary" | "proofread" | "translate" | "tags";

export interface ConsentTier {
  id: ConsentId;
  tier: string;
  required: boolean;
  label: string;
  description: string;
}

export interface SectionInfo {
  key: SectionKey;
  en: string;
  hi: string;
  /** Accent colour used for the desk dot and charts. */
  color: string;
  about: string;
  aboutHi: string;
}

export interface ScopeInfo {
  key: ScopeKey;
  label: string;
  labelHi: string;
  place: string;
  placeHi: string;
}

export const SECTIONS = contracts.sections as SectionInfo[];
export const SCOPES = contracts.scopes as ScopeInfo[];
export const LANGUAGES = contracts.languages as { code: Language; label: string; native: string }[];
export const CONSENT_TIERS = contracts.consentTiers as ConsentTier[];
export const CONSENT_VERSION = contracts.consentVersion;
export const BLOCK_ALLOWLIST = contracts.blockAllowlist;
export const AI_TASKS = contracts.aiTasks as AiTask[];
