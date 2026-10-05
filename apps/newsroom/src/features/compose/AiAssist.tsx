import { useState } from "react";
import { Sparkles } from "lucide-react";
import { runAi, useAiStatus, type AiTask } from "@/api/ai";
import { Button } from "@/components/ui/primitives";
import type { Language } from "@/domain/types";

const ACTIONS: { task: AiTask; label: string }[] = [
  { task: "headline", label: "Suggest headlines" },
  { task: "summary", label: "Write a summary" },
];

/** Hidden entirely until the API has an AI key configured. */
export function AiAssist({
  getText,
  language,
  onHeadline,
  onSummary,
}: {
  getText: () => string;
  language: Language;
  onHeadline: (v: string) => void;
  onSummary: (v: string) => void;
}) {
  const status = useAiStatus();
  const [busy, setBusy] = useState<AiTask | null>(null);
  const [error, setError] = useState<string>();
  const [options, setOptions] = useState<string[]>([]);

  if (!status.enabled) return null;

  const run = async (task: AiTask) => {
    const text = getText().trim();
    if (!text) return setError("Write a few lines first so there is something to work from.");
    setBusy(task);
    setError(undefined);
    setOptions([]);
    try {
      const r = await runAi(task, text, language);
      if (task === "headline") setOptions(r.suggestions);
      else onSummary(r.output);
    } catch (e) {
      setError(e instanceof Error ? e.message : "AI help is not available right now.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <section aria-labelledby="ai-h" className="space-y-2 rounded-xl border border-line bg-white p-3">
      <h3 id="ai-h" className="flex items-center gap-1.5 text-[13px] font-medium text-ink">
        <Sparkles className="size-4 text-brand" aria-hidden="true" />
        Writing help
      </h3>
      <div className="flex flex-wrap gap-2">
        {ACTIONS.map((a) => (
          <Button key={a.task} size="sm" disabled={busy !== null} onClick={() => run(a.task)}>
            {busy === a.task ? "Working..." : a.label}
          </Button>
        ))}
      </div>
      {error && <p role="alert" className="text-[12px] text-bad">{error}</p>}
      {options.length > 0 && (
        <ul className="space-y-1">
          {options.map((o) => (
            <li key={o}>
              <button onClick={() => { onHeadline(o); setOptions([]); }} className="w-full rounded-lg px-2 py-1.5 text-left text-[13px] text-ink hover:bg-wash">
                {o}
              </button>
            </li>
          ))}
        </ul>
      )}
      <p className="text-[11px] text-muted">Suggestions only. You decide what to keep.</p>
    </section>
  );
}
