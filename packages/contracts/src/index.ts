import contracts from "../contracts.json";

export type SectionKey = "world" | "politics" | "business" | "tech" | "sports" | "culture" | "science";
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

export const SECTIONS = contracts.sections as { key: SectionKey; en: string; hi: string }[];
export const LANGUAGES = contracts.languages as { code: Language; label: string; native: string }[];
export const CONSENT_TIERS = contracts.consentTiers as ConsentTier[];
export const CONSENT_VERSION = contracts.consentVersion;
export const BLOCK_ALLOWLIST = contracts.blockAllowlist;
export const AI_TASKS = contracts.aiTasks as AiTask[];
