/** What the editor changed since the writer last sent the story: word-level, both languages. */
import { useHistory } from "@/api/desk";
import { changed, wordDiff } from "@/domain/diff";
import type { Article, Snapshot } from "@/domain/types";
import { Button, Modal, Spinner } from "@/components/ui/primitives";
import { docText } from "@/features/editor/tools";
import { DiffText } from "./DiffText";

export function ChangesView({ article, onClose }: { article: Article; onClose: () => void }) {
  const { data } = useHistory(article.id, article.version);
  const items = data?.items ?? [];
  // The writer's version: their last snapshot (usually "sent for review") before the latest desk edit.
  let lastDeskEdit = -1;
  items.forEach((r, i) => r.lane === "desk" && r.kind === "edit" && (lastDeskEdit = i));
  let base: Snapshot | null = null;
  for (let i = lastDeskEdit - 1; i >= 0; i--) {
    if (items[i].lane === "author" && items[i].snapshot) {
      base = items[i].snapshot;
      break;
    }
  }
  const editors = [...new Map(article.changed_by.map((p) => [p.id, p.name])).values()];

  const rows = base
    ? (["en", "hi"] as const).flatMap((lang) =>
        (
          [
            ["Headline", base![`headline_${lang}`], article[`headline_${lang}`]],
            ["Subheading", base![`standfirst_${lang}`], article[`standfirst_${lang}`]],
            ["Text", docText(base![`body_${lang}`]), docText(article[`body_${lang}`])],
          ] as const
        )
          .map(([label, a, b]) => ({ label, lang, pieces: wordDiff(a ?? "", b ?? "") }))
          .filter((r) => changed(r.pieces)),
      )
    : [];

  return (
    <Modal title="What your editor changed" onClose={onClose} wide footer={<Button variant="primary" onClick={onClose}>Got it</Button>}>
      {editors.length > 0 && <p className="text-[13px] text-muted">Changed by {editors.join(", ")}. New words are green, removed words are struck through.</p>}
      {!data ? (
        <p className="flex items-center gap-2 text-[13px] text-muted"><Spinner /> Loading</p>
      ) : rows.length === 0 ? (
        <p className="text-[13px] text-muted">The wording is the same as your version. Your editor may have changed the photo, desk or place.</p>
      ) : (
        rows.map((r) => (
          <section key={`${r.lang}-${r.label}`} className="rounded-xl border border-line px-3 py-2.5">
            <h3 className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-faint">{r.label}{r.lang === "hi" ? " · हिन्दी" : ""}</h3>
            <DiffText pieces={r.pieces} lang={r.lang} className="text-[14px] leading-relaxed" />
          </section>
        ))
      )}
    </Modal>
  );
}
