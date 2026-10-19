import { DEFAULT_LOCATION, districtName, districtsOf, stateName, STATES } from "@news/contracts";
import type { ScopeKey } from "./types";

export { DEFAULT_LOCATION, districtName, districtsOf, stateName, STATES };

export interface Target {
  scope: ScopeKey;
  state: string;
  district: string;
}

/** Who a story is for, in words: "Ranchi", "Jharkhand", "All India", "World". */
export function targetLabel(t: Target, lang: "en" | "hi" = "en"): string {
  if (t.scope === "local") return districtName(t.state, t.district, lang) || (lang === "hi" ? "ज़िला" : "District");
  if (t.scope === "state") return stateName(t.state, lang) || (lang === "hi" ? "राज्य" : "State");
  if (t.scope === "india") return lang === "hi" ? "पूरा भारत" : "All India";
  return lang === "hi" ? "दुनिया" : "World";
}

export function homePlace(home: { homeState?: string; homeDistrict?: string }): { state: string; district: string } {
  if (home.homeState) return { state: home.homeState, district: home.homeDistrict ?? "" };
  return { state: DEFAULT_LOCATION.state, district: DEFAULT_LOCATION.district };
}
