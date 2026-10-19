/**
 * The last step before a story goes out, in one sheet: who it is for (district, state, India, world),
 * how urgent it is (normal or breaking) and the desk. Defaults come from the writer's own place, so for most
 * stories this is a single tap on the button (or Enter).
 */
import { useMemo, useState, type FormEvent } from "react";
import { AlertTriangle, Check, Globe2, Landmark, MapPin, Siren } from "lucide-react";
import clsx from "clsx";
import { STATES, districtsOf, stateName, districtName } from "@/domain/places";
import { SECTION_KEYS, SECTION_LABEL, type Article, type Priority, type ScopeKey, type SectionKey } from "@/domain/types";
import { Button, Modal, Spinner, selectCls, textareaCls } from "@/components/ui/primitives";
import { BREAKING_HOURS } from "@news/contracts";

export type SendMode = "submit" | "publish" | "approve";

export interface SendChoice {
  scope: ScopeKey;
  state: string;
  district: string;
  priority: Priority;
  section: SectionKey;
  message: string;
}

interface Check {
  ok: boolean;
  label: string;
  required?: boolean;
}

export function PublishSheet({
  article, mode, checks, home, busy, onSend, onClose,
}: {
  article: Article;
  mode: SendMode;
  checks: Check[];
  home: { state: string; district: string };
  busy: boolean;
  onSend: (c: SendChoice) => void;
  onClose: () => void;
}) {
  const [state, setState] = useState(article.state || home.state);
  const [district, setDistrict] = useState(article.district || home.district);
  const [scope, setScope] = useState<ScopeKey>(article.scope || (district ? "local" : "state"));
  const [priority, setPriority] = useState<Priority>(article.priority);
  const [section, setSection] = useState<SectionKey>(article.section);
  const [message, setMessage] = useState("");
  const [changingPlace, setChangingPlace] = useState(false);

  const districts = districtsOf(state);
  const hasDistrict = districts.length > 0;
  const blocked = checks.some((c) => c.required && !c.ok) || (scope === "local" && !district) || (["local", "state"].includes(scope) && !state);

  const options = useMemo(
    () => [
      { id: "local" as const, icon: MapPin, title: districtName(state, district) || "My district", sub: "Local news first for people here", disabled: !hasDistrict },
      { id: "state" as const, icon: Landmark, title: stateName(state) || "My state", sub: "Everyone in the state" },
      { id: "india" as const, icon: Landmark, title: "All India", sub: "National news, for everyone" },
      { id: "world" as const, icon: Globe2, title: "World", sub: "International news" },
    ],
    [state, district, hasDistrict],
  );

  const title = mode === "approve" ? "Approve and publish" : mode === "publish" ? "Publish" : "Send to your editor";
  const action = mode === "approve" ? "Approve and publish" : mode === "publish" ? (priority === "breaking" ? "Publish breaking news" : "Publish now") : priority === "breaking" ? "Send as breaking news" : "Send for review";

  const submit = (e?: FormEvent) => {
    e?.preventDefault();
    if (blocked || busy) return;
    onSend({ scope, state: ["local", "state"].includes(scope) ? state : "", district: scope === "local" ? district : "", priority, section, message: message.trim() });
  };

  return (
    <Modal
      title={title}
      onClose={onClose}
      wide
      footer={
        <>
          <Button onClick={onClose}>Not yet</Button>
          <Button variant="primary" size="lg" disabled={blocked || busy} onClick={() => submit()} className={clsx(priority === "breaking" && "bg-bad! hover:bg-bad/90!")}>
            {busy && <Spinner />}
            {action}
          </Button>
        </>
      }
    >
      <form
        onSubmit={submit}
        // Enter sends from anywhere in the sheet (Space still picks an option); Shift+Enter is a new line in the note.
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey && !(e.target instanceof HTMLSelectElement)) {
            e.preventDefault();
            submit();
          }
        }}
        className="space-y-5"
      >
        <fieldset>
          <legend className="mb-2 text-[13px] font-semibold text-ink">Who is this story for?</legend>
          <p className="-mt-1 mb-2.5 text-[12.5px] text-muted">Readers there see it higher in their feed.</p>
          <div className="grid grid-cols-2 gap-2">
            {options.map((o) => (
              <button
                key={o.id}
                type="button"
                disabled={o.disabled}
                aria-pressed={scope === o.id}
                onClick={() => setScope(o.id)}
                className={clsx(
                  "flex min-h-[64px] items-start gap-2.5 rounded-xl border px-3 py-2.5 text-left transition-colors disabled:opacity-40",
                  scope === o.id ? "border-brand bg-brand-soft" : "border-line hover:border-brand/40",
                )}
              >
                <o.icon className={clsx("mt-0.5 size-4 shrink-0", scope === o.id ? "text-brand" : "text-muted")} aria-hidden="true" />
                <span className="min-w-0">
                  <span className="block truncate text-[14px] font-semibold">{o.title}</span>
                  <span className="block text-[12px] leading-snug text-muted">{o.sub}</span>
                </span>
              </button>
            ))}
          </div>
          {(scope === "local" || scope === "state") &&
            (changingPlace ? (
              <div className="mt-2.5 grid grid-cols-2 gap-2">
                <select aria-label="State" className={selectCls} value={state} onChange={(e) => (setState(e.target.value), setDistrict(""))}>
                  {STATES.map((s) => (
                    <option key={s.code} value={s.code}>{s.en}</option>
                  ))}
                </select>
                <select aria-label="District" className={selectCls} value={district} onChange={(e) => setDistrict(e.target.value)} disabled={!hasDistrict}>
                  <option value="">{hasDistrict ? "Choose district" : "No districts listed"}</option>
                  {districts.map((d) => (
                    <option key={d.key} value={d.key}>{d.city ? `${d.en} (${d.city})` : d.en}</option>
                  ))}
                </select>
              </div>
            ) : (
              <button type="button" onClick={() => setChangingPlace(true)} className="mt-2 text-[13px] font-medium text-brand hover:underline">
                Story is about another place? Change it
              </button>
            ))}
        </fieldset>

        <fieldset>
          <legend className="mb-2 text-[13px] font-semibold text-ink">How urgent?</legend>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" aria-pressed={priority === "normal"} onClick={() => setPriority("normal")} className={clsx("rounded-xl border px-3 py-2.5 text-left", priority === "normal" ? "border-brand bg-brand-soft" : "border-line")}>
              <span className="block text-[14px] font-semibold">Normal</span>
              <span className="block text-[12px] text-muted">Goes into the feed as usual</span>
            </button>
            <button type="button" aria-pressed={priority === "breaking"} onClick={() => setPriority("breaking")} className={clsx("rounded-xl border px-3 py-2.5 text-left", priority === "breaking" ? "border-bad bg-bad-soft" : "border-line")}>
              <span className="flex items-center gap-1.5 text-[14px] font-semibold text-bad"><Siren className="size-4" aria-hidden="true" /> Breaking</span>
              <span className="block text-[12px] text-muted">{mode === "submit" ? "Every editor is told now. " : ""}Top of the feed with a banner for {BREAKING_HOURS} h</span>
            </button>
          </div>
        </fieldset>

        <label className="block">
          <span className="mb-1.5 block text-[13px] font-semibold text-ink">Desk</span>
          <select className={selectCls} value={section} onChange={(e) => setSection(e.target.value as SectionKey)}>
            {SECTION_KEYS.map((k) => (
              <option key={k} value={k}>{SECTION_LABEL[k]}</option>
            ))}
          </select>
        </label>

        {mode !== "publish" && (
          <label className="block">
            <span className="mb-1.5 block text-[13px] font-semibold text-ink">{mode === "approve" ? "Note for the writer" : "Note for your editor"} <span className="font-normal text-faint">(optional)</span></span>
            <textarea className={textareaCls} rows={2} value={message} onChange={(e) => setMessage(e.target.value)} maxLength={1000} placeholder={mode === "approve" ? "Good work, published." : "Photo from the spot; police confirmed the numbers."} />
          </label>
        )}

        <ul className="space-y-1 rounded-xl bg-wash px-3 py-2.5 text-[13px]">
          {checks.map((c) => (
            <li key={c.label} className={clsx("flex items-center gap-2", c.ok ? "text-good" : c.required ? "text-bad" : "text-warn")}>
              {c.ok ? <Check className="size-4" aria-hidden="true" /> : <AlertTriangle className="size-4" aria-hidden="true" />}
              <span className={c.ok ? "text-ink" : ""}>{c.label}</span>
              {!c.ok && !c.required && <span className="text-faint">(recommended)</span>}
            </li>
          ))}
        </ul>
        <button type="submit" hidden aria-hidden="true" tabIndex={-1} />
      </form>
    </Modal>
  );
}
