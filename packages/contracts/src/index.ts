import contracts from "../contracts.json";

export type SectionKey =
  | "world" | "politics" | "business" | "tech" | "sports" | "culture" | "science"
  | "health" | "safety" | "justice" | "education" | "environment" | "entertainment";
/**
 * Coverage level of a story. Local and state stories also carry a state code and (local) a district key,
 * and feeds rank them for readers in that place: local, then state, then national and world.
 */
export type ScopeKey = "local" | "state" | "india" | "world";
export type Priority = "normal" | "breaking";
export type Language = "en" | "hi";
export type ConsentId = "necessary" | "preferences" | "analytics" | "personalization" | "notifications";
export type AiTask = "headline" | "summary" | "proofread" | "translate" | "tags" | "seo";

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

export interface StateInfo {
  code: string;
  en: string;
  hi: string;
}

export interface DistrictInfo {
  key: string;
  en: string;
  hi: string;
  /** Best-known city when it differs from the district name (East Singhbhum: Jamshedpur). */
  city?: string;
}

export interface Place {
  state: string;
  district?: string;
}

export const SECTIONS = contracts.sections as SectionInfo[];
export const SCOPES = contracts.scopes as ScopeInfo[];
export const STATES = contracts.states as StateInfo[];
export const DISTRICTS = contracts.districts as Record<string, DistrictInfo[]>;
export const DEFAULT_LOCATION = contracts.defaultLocation as Required<Place>;
export const PRIORITIES = contracts.priorities as { key: Priority; label: string; labelHi: string }[];
/** How long a breaking story keeps its banner and its boost after it goes live. */
export const BREAKING_HOURS = contracts.breakingHours as number;
export const LANGUAGES = contracts.languages as { code: Language; label: string; native: string }[];
export const CONSENT_TIERS = contracts.consentTiers as ConsentTier[];
export const CONSENT_VERSION = contracts.consentVersion;
export const BLOCK_ALLOWLIST = contracts.blockAllowlist;
export const AI_TASKS = contracts.aiTasks as AiTask[];

const stateByCode = new Map(STATES.map((s) => [s.code, s]));

export const stateName = (code: string | undefined, lang: Language = "en"): string => {
  const s = code ? stateByCode.get(code) : undefined;
  return s ? (lang === "hi" ? s.hi : s.en) : "";
};

export const districtsOf = (state: string | undefined): DistrictInfo[] => (state ? DISTRICTS[state] ?? [] : []);

export const districtName = (state: string | undefined, key: string | undefined, lang: Language = "en"): string => {
  const d = districtsOf(state).find((x) => x.key === key);
  return d ? (lang === "hi" ? d.hi : d.en) : "";
};

/** "Ranchi, Jharkhand", or just the state when no district is chosen. */
export const placeLabel = (place: Partial<Place> | undefined, lang: Language = "en"): string =>
  [districtName(place?.state, place?.district, lang), stateName(place?.state, lang)].filter(Boolean).join(", ");
