import { useState } from "react";
import { Check, CircleAlert, Scale, X } from "lucide-react";
import clsx from "clsx";
import type { PreflightCheck } from "@/domain/preflight";
import { LANGUAGE_LABEL, SECTION_LABEL, URGENCY_EXAMPLE, URGENCY_LABEL, type Language, type SectionKey, type Urgency } from "@/domain/types";
import { Field, Segmented, inputCls, textareaCls } from "@/components/ui/primitives";
import type { ComposerDraft } from "./draft";

export function DetailsPanel({
  draft,
  onChange,
  editable,
  checks,
}: {
  draft: ComposerDraft;
  onChange: (patch: Partial<ComposerDraft>) => void;
  editable: boolean;
  checks: PreflightCheck[];
}) {
  const [tag, setTag] = useState("");
  const remaining = checks.filter((c) => !c.passed);

  const addTag = () => {
    const t = tag.trim().replace(/,$/, "");
    if (t && !draft.tags.includes(t)) onChange({ tags: [...draft.tags, t].slice(0, 12) });
    setTag("");
  };

  return (
    <div className="space-y-6">
      <section aria-labelledby="ready-h" className="space-y-2">
        <h3 id="ready-h" className="text-[13px] font-medium text-ink">
          {remaining.length ? `${remaining.length} thing${remaining.length > 1 ? "s" : ""} left before it can go live` : "Ready to go live"}
        </h3>
        <ul className="space-y-1.5">
          {checks.map((c) => (
            <li key={c.id} className="flex items-start gap-2 text-[13px] leading-snug">
              {c.passed ? (
                <Check className="mt-0.5 size-4 shrink-0 text-good" aria-label="Done" />
              ) : (
                <CircleAlert className="mt-0.5 size-4 shrink-0 text-warn" aria-label="To do" />
              )}
              <span className={c.passed ? "text-muted" : "text-ink"}>
                {c.label}
                {!c.passed && c.detail && <span className="block text-[12px] text-muted">{c.detail}</span>}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <fieldset disabled={!editable} className="space-y-4 disabled:opacity-70">
        <legend className="mb-3 text-[13px] font-medium text-ink">Article settings</legend>

        <div className="space-y-1.5">
          <p className="text-[13px] font-medium text-ink">
            Language
          </p>
          <Segmented<Language>
            label="Language"
            value={draft.language}
            onChange={(language) => onChange({ language })}
            items={(["en", "hi"] as Language[]).map((l) => ({ id: l, label: l === "en" ? "English" : "हिन्दी" }))}
          />
          <p className="text-[12px] text-muted">{`Fonts and reading time adjust for ${LANGUAGE_LABEL[draft.language]}.`}</p>
        </div>

        <Field label="Section">
          <select className={inputCls} value={draft.section} onChange={(e) => onChange({ section: e.target.value as SectionKey })}>
            {(Object.keys(SECTION_LABEL) as SectionKey[]).map((k) => (
              <option key={k} value={k}>
                {SECTION_LABEL[k]}
              </option>
            ))}
          </select>
        </Field>

        <Field label="How urgent is it?" hint={URGENCY_EXAMPLE[draft.urgency]}>
          <select className={inputCls} value={draft.urgency} onChange={(e) => onChange({ urgency: Number(e.target.value) as Urgency })}>
            {([5, 4, 3, 2, 1] as Urgency[]).map((u) => (
              <option key={u} value={u}>
                {URGENCY_LABEL[u]}
              </option>
            ))}
          </select>
        </Field>

        <div className="space-y-1.5">
          <label htmlFor="tag-input" className="block text-[13px] font-medium text-ink">
            Topics
          </label>
          {draft.tags.length > 0 && (
            <ul className="flex flex-wrap gap-1.5">
              {draft.tags.map((t) => (
                <li key={t} className="inline-flex h-7 items-center gap-1 rounded-full bg-select pl-2.5 pr-1 text-[12px] font-medium text-ink">
                  {t}
                  <button
                    type="button"
                    aria-label={`Remove topic ${t}`}
                    onClick={() => onChange({ tags: draft.tags.filter((x) => x !== t) })}
                    className="rounded-full p-0.5 text-muted hover:bg-white hover:text-ink"
                  >
                    <X className="size-3" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <input
            id="tag-input"
            className={inputCls}
            value={tag}
            onChange={(e) => setTag(e.target.value)}
            onBlur={addTag}
            onKeyDown={(e) => {
              if ((e.key === "Enter" || e.key === ",") && !e.nativeEvent.isComposing && e.keyCode !== 229) {
                e.preventDefault();
                addTag();
              }
            }}
            placeholder="Type a topic and press Enter"
          />
        </div>

        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-line p-3">
          <input type="checkbox" className="mt-0.5 size-4 accent-[var(--color-brand)]" checked={draft.sensitivity} onChange={(e) => onChange({ sensitivity: e.target.checked })} />
          <span className="text-[13px] leading-snug">
            <span className="flex items-center gap-1.5 font-medium text-ink">
              <Scale className="size-4" aria-hidden="true" /> Needs a legal check
            </span>
            <span className="text-muted">Tick this if the story names people accused of wrongdoing, or could be challenged in court.</span>
          </span>
        </label>
      </fieldset>

      <fieldset disabled={!editable} className="space-y-3 disabled:opacity-70">
        <legend className="mb-3 text-[13px] font-medium text-ink">How it looks in search</legend>
        <div className={clsx("rounded-xl border border-line p-3", draft.language === "hi" && "lang-hi")} lang={draft.language}>
          <p className="truncate text-[12px] text-good">{`newsapp.example/${draft.section}/${draft.slug || "your-headline"}`}</p>
          <p className="line-clamp-2 text-[15px] leading-snug text-[#1a0dab]">{draft.seoTitle || draft.headline || "Your headline appears here"}</p>
          <p className="line-clamp-2 text-[13px] leading-snug text-muted">{draft.seoDescription || draft.standfirst || "Your summary appears here."}</p>
        </div>
        <Field label="Search title" hint={`${(draft.seoTitle || draft.headline).length}/60 characters`}>
          <input className={inputCls} value={draft.seoTitle} onChange={(e) => onChange({ seoTitle: e.target.value })} placeholder={draft.headline || "Uses the headline"} />
        </Field>
        <Field label="Search description" hint={`${(draft.seoDescription || draft.standfirst).length}/160 characters`}>
          <textarea rows={2} className={textareaCls} value={draft.seoDescription} onChange={(e) => onChange({ seoDescription: e.target.value })} placeholder={draft.standfirst || "Uses the summary"} />
        </Field>
        <Field label="Web address" hint="Letters, numbers and dashes. Created from the headline if left empty.">
          <input className={inputCls} value={draft.slug} onChange={(e) => onChange({ slug: e.target.value.toLowerCase().replace(/\s+/g, "-") })} placeholder="created-from-the-headline" />
        </Field>
      </fieldset>
    </div>
  );
}
