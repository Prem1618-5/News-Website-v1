import useSWR from "swr";
import type { AiTask } from "@news/contracts";
import { api } from "./http";

export type { AiTask };

export interface AiStatus {
  enabled: boolean;
  tasks: AiTask[];
}

export interface AiResult {
  output: string;
  suggestions: string[];
  tags: string[];
}

const OFF: AiStatus = { enabled: false, tasks: [] };

/** AI controls render only when the API reports a configured provider. */
export function useAiStatus(): AiStatus {
  const { data } = useSWR("ai-status", () => api<AiStatus>("/ai/status", { token: null }).catch(() => OFF), {
    revalidateOnFocus: false,
    dedupingInterval: 60_000,
  });
  return data ?? OFF;
}

export const runAi = (task: AiTask, text: string, language: "en" | "hi", targetLanguage?: "en" | "hi") =>
  api<AiResult>("/ai/assist", { body: { task, text, language, ...(targetLanguage ? { target_language: targetLanguage } : {}) } });
