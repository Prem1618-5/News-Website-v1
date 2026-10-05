import useSWR from "swr";
import { tokenStore } from "./staffAuth";

export type AiTask = "headline" | "summary" | "proofread" | "translate" | "tags";

export interface AiStatus {
  enabled: boolean;
  provider: string | null;
  tasks: AiTask[];
}

export interface AiResult {
  output: string;
  suggestions: string[];
  tags: string[];
}

const BASE = `${import.meta.env.VITE_API_BASE ?? ""}/api/ai`;
const OFF: AiStatus = { enabled: false, provider: null, tasks: [] };

async function fetchStatus(): Promise<AiStatus> {
  try {
    const res = await fetch(`${BASE}/status`);
    return res.ok ? await res.json() : OFF;
  } catch {
    return OFF;
  }
}

/** AI controls render only when the API reports a configured provider. */
export function useAiStatus(): AiStatus {
  const { data } = useSWR("ai-status", fetchStatus, { revalidateOnFocus: false, dedupingInterval: 60_000 });
  return data ?? OFF;
}

export async function runAi(task: AiTask, text: string, language: "en" | "hi"): Promise<AiResult> {
  const token = tokenStore.get();
  const res = await fetch(`${BASE}/assist`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify({ task, text, language }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(typeof body.detail === "string" ? body.detail : "AI help is not available right now.");
  return body as AiResult;
}
