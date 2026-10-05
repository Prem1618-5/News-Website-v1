import { useState } from "react";
import { Lock, Trash2 } from "lucide-react";
import clsx from "clsx";
import { authorize } from "@/domain/capabilities";
import { MISTAKE_CATEGORIES, SEVERITY_POINTS, type Article, type MistakeCategory, type Severity, type Verdict } from "@/domain/types";
import { claimArticle, getStaff, releaseArticle, submitVerdict, type MistakeInput } from "@/domain/workflow";
import { useNewsroom } from "@/state/store";
import { Button, Countdown, Pill, inputCls, textareaCls } from "@/components/ui/primitives";

export function ReviewPanel({ article: a }: { article: Article }) {
  const { state, actor, run } = useNewsroom();
  const author = getStaff(state, a.authorId);
  const decision = authorize(actor, "article.review", { article: a, author });
  const holder = a.cycle?.claimedBy && (a.cycle.claimExpiresAt ?? 0) > Date.now() ? getStaff(state, a.cycle.claimedBy) : undefined;
  const mine = holder?.id === actor.id;

  if (!decision.allowed) {
    return (
      <p className="flex items-start gap-2 text-[13px] text-muted">
        <Lock className="mt-0.5 size-4 shrink-0" aria-hidden="true" /> {decision.reason}
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {a.cycle && (
        <div className="rounded-xl border border-line bg-white p-3 text-[13px]">
          <p className="text-muted">Editor reply due in</p>
          <p className="text-[22px] leading-tight">
            <Countdown to={a.cycle.dueAt} />
          </p>
        </div>
      )}

      {!mine ? (
        <div className="space-y-2 rounded-xl border border-line bg-white p-3">
          <p className="text-[13px] text-ink">
            {holder ? `${holder.name} is reviewing this right now.` : "Start reviewing so other editors know you have it."}
          </p>
          {!holder && (
            <Button variant="primary" className="w-full" onClick={() => run((s, x) => claimArticle(s, x, a.id))}>
              Start reviewing
            </Button>
          )}
        </div>
      ) : (
        <>
          <VerdictForm article={a} />
          <button className="text-[13px] text-muted underline-offset-2 hover:underline" onClick={() => run((s, x) => releaseArticle(s, x, a.id))}>
            Stop reviewing and let another editor take it
          </button>
        </>
      )}
    </div>
  );
}

const VERDICTS: { id: Verdict; label: string; button: string; help: string }[] = [
  { id: "approve", label: "Approve", button: "Approve and publish", help: "It goes live straight away if everything on the checklist is done." },
  { id: "approve_with_notes", label: "Approve with notes", button: "Approve with notes", help: "Goes live, and the reporter sees your notes for next time." },
  { id: "request_changes", label: "Ask for edits", button: "Send back for edits", help: "The reporter fixes your comments and sends it back." },
  { id: "reject", label: "Decline", button: "Decline article", help: "It will not be published. Explain why below." },
];

const SEVERITY_LABEL: Record<Severity, string> = { minor: "Small", major: "Serious", critical: "Critical" };

export function VerdictForm({ article }: { article: Article }) {
  const { run } = useNewsroom();
  const [verdict, setVerdict] = useState<Verdict>("approve");
  const [summary, setSummary] = useState("");
  const [mistakes, setMistakes] = useState<MistakeInput[]>([]);
  const [cat, setCat] = useState<MistakeCategory>("Factual accuracy");
  const [sev, setSev] = useState<Severity>("minor");
  const [note, setNote] = useState("");
  const current = VERDICTS.find((v) => v.id === verdict)!;

  return (
    <div className="space-y-3">
      <fieldset className="space-y-1.5">
        <legend className="mb-1.5 text-[13px] font-medium text-ink">Your decision</legend>
        {VERDICTS.map((v) => (
          <label
            key={v.id}
            className={clsx(
              "flex cursor-pointer items-start gap-2.5 rounded-lg border px-3 py-2 text-[13px]",
              verdict === v.id ? "border-brand bg-brand-soft" : "border-line bg-white hover:bg-wash",
            )}
          >
            <input type="radio" name="verdict" className="mt-0.5 accent-[var(--color-brand)]" checked={verdict === v.id} onChange={() => setVerdict(v.id)} />
            <span>
              <span className="font-medium text-ink">{v.label}</span>
              <span className="block text-[12px] text-muted">{v.help}</span>
            </span>
          </label>
        ))}
      </fieldset>

      <textarea
        aria-label="Message for the reporter"
        rows={3}
        className={textareaCls}
        value={summary}
        onChange={(e) => setSummary(e.target.value)}
        placeholder={verdict === "reject" ? "Why it cannot be published (required)" : "Message for the reporter (optional)"}
      />

      <details className="rounded-lg bg-wash p-3">
        <summary className="cursor-pointer text-[13px] font-medium text-ink">
          Note a mistake for the reporter&apos;s record{mistakes.length ? ` (${mistakes.length})` : ""}
        </summary>
        <div className="mt-3 space-y-2">
          {mistakes.map((m, i) => (
            <div key={i} className="flex items-center gap-2 text-[13px]">
              <Pill tone={m.severity === "minor" ? "neutral" : m.severity === "major" ? "warn" : "bad"}>
                {SEVERITY_LABEL[m.severity]} · {SEVERITY_POINTS[m.severity]} pt
              </Pill>
              <span className="min-w-0 flex-1 truncate">
                {m.category}
                {m.note && <span className="text-muted"> · {m.note}</span>}
              </span>
              <button aria-label="Remove mistake" onClick={() => setMistakes((l) => l.filter((_, j) => j !== i))} className="text-muted hover:text-bad">
                <Trash2 className="size-4" />
              </button>
            </div>
          ))}
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <select aria-label="Kind of mistake" className={clsx(inputCls, "h-8! text-[13px]!")} value={cat} onChange={(e) => setCat(e.target.value as MistakeCategory)}>
              {MISTAKE_CATEGORIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
            <select aria-label="How serious" className={clsx(inputCls, "h-8! text-[13px]!")} value={sev} onChange={(e) => setSev(e.target.value as Severity)}>
              {(Object.keys(SEVERITY_LABEL) as Severity[]).map((s) => (
                <option key={s} value={s}>
                  {SEVERITY_LABEL[s]}
                </option>
              ))}
            </select>
          </div>
          <div className="flex gap-2">
            <input aria-label="Mistake note" className={clsx(inputCls, "h-8! text-[13px]!")} value={note} onChange={(e) => setNote(e.target.value)} placeholder="What went wrong" />
            <Button
              size="sm"
              onClick={() => {
                setMistakes((l) => [...l, { category: cat, severity: sev, note: note.trim() }]);
                setNote("");
              }}
            >
              Add
            </Button>
          </div>
        </div>
      </details>

      <Button
        variant={verdict === "reject" ? "danger" : "primary"}
        className="w-full"
        onClick={() => run((s, x) => submitVerdict(s, x, article.id, { verdict, summary, mistakes }))}
      >
        {current.button}
      </Button>
    </div>
  );
}
