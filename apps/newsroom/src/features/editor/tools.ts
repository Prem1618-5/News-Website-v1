import type { Editor, JSONContent } from "@tiptap/core";

/** Replace every match in the story's text. Returns how many were replaced. */
export function replaceAll(editor: Editor, find: string, replace: string, matchCase = false): number {
  if (!find) return 0;
  const needle = matchCase ? find : find.toLowerCase();
  const hits: { from: number; to: number }[] = [];
  editor.state.doc.descendants((node, pos) => {
    if (!node.isText || !node.text) return;
    const hay = matchCase ? node.text : node.text.toLowerCase();
    let i = hay.indexOf(needle);
    while (i !== -1) {
      hits.push({ from: pos + i, to: pos + i + find.length });
      i = hay.indexOf(needle, i + find.length);
    }
  });
  if (!hits.length) return 0;
  const tr = editor.state.tr;
  for (const h of hits.reverse()) {
    if (replace) tr.insertText(replace, h.from, h.to);
    else tr.delete(h.from, h.to);
  }
  editor.view.dispatch(tr);
  return hits.length;
}

export function countMatches(editor: Editor, find: string, matchCase = false): number {
  if (!find) return 0;
  const needle = matchCase ? find : find.toLowerCase();
  let n = 0;
  editor.state.doc.descendants((node) => {
    if (!node.isText || !node.text) return;
    const hay = matchCase ? node.text : node.text.toLowerCase();
    for (let i = hay.indexOf(needle); i !== -1; i = hay.indexOf(needle, i + needle.length)) n++;
  });
  return n;
}

const DEVANAGARI = "०१२३४५६७८९";

/** 2026 -> २०२६ (to: "hi") or back (to: "en"), in the selection or, with nothing selected, the whole story. */
export function convertDigits(editor: Editor, to: "en" | "hi"): number {
  const { from, to: end, empty } = editor.state.selection;
  const start = empty ? 0 : from;
  const stop = empty ? editor.state.doc.content.size : end;
  const tr = editor.state.tr;
  let changed = 0;
  editor.state.doc.nodesBetween(start, stop, (node, pos) => {
    if (!node.isText || !node.text) return;
    const text = node.text;
    for (let i = 0; i < text.length; i++) {
      const at = pos + i;
      if (at < start || at >= stop) continue;
      const ch = text[i];
      const next = to === "hi" ? (/[0-9]/.test(ch) ? DEVANAGARI[Number(ch)] : null) : DEVANAGARI.includes(ch) ? String(DEVANAGARI.indexOf(ch)) : null;
      if (next) {
        tr.insertText(next, at, at + 1);
        changed++;
      }
    }
  });
  if (changed) editor.view.dispatch(tr);
  return changed;
}

/** Where a review note sits in the document now (it moves as text is edited). */
export function noteRange(editor: Editor, id: string): { from: number; to: number } | null {
  let from = Infinity;
  let to = -1;
  editor.state.doc.descendants((node, pos) => {
    if (!node.isText) return;
    if (node.marks.some((m) => m.type.name === "note" && m.attrs.id === id)) {
      from = Math.min(from, pos);
      to = Math.max(to, pos + node.nodeSize);
    }
  });
  return to < 0 ? null : { from, to };
}

export function removeNoteMark(editor: Editor, id: string) {
  const type = editor.schema.marks.note;
  const tr = editor.state.tr;
  editor.state.doc.descendants((node, pos) => {
    if (!node.isText) return;
    for (const m of node.marks) if (m.type === type && m.attrs.id === id) tr.removeMark(pos, pos + node.nodeSize, m);
  });
  if (tr.docChanged) editor.view.dispatch(tr);
}

/** Apply a suggested rewording: the marked words are replaced and the highlight goes away. */
export function acceptSuggestion(editor: Editor, id: string, text: string): boolean {
  const range = noteRange(editor, id);
  if (!range) return false;
  const tr = editor.state.tr.insertText(text, range.from, range.to);
  tr.removeMark(range.from, range.from + text.length, editor.schema.marks.note);
  editor.view.dispatch(tr);
  return true;
}

export function scrollToNote(editor: Editor, id: string) {
  const el = editor.view.dom.querySelector(`[data-note="${CSS.escape(id)}"]`);
  el?.scrollIntoView({ behavior: "smooth", block: "center" });
}

/** Plain text of a TipTap document, paragraphs separated by blank lines (for word counts and diffs). */
export function docText(node: JSONContent | null | undefined): string {
  if (!node) return "";
  if (node.type === "text") return node.text ?? "";
  if (node.type === "hardBreak") return "\n";
  const inner = node.content ?? [];
  if (["image", "video", "audio"].includes(node.type ?? "")) return String(node.attrs?.caption ?? "");
  const sep = ["doc", "blockquote", "factBox", "pullQuote"].includes(node.type ?? "") ? "\n\n" : ["bulletList", "orderedList", "listItem", "table", "tableRow"].includes(node.type ?? "") ? "\n" : "";
  return inner.map(docText).filter(Boolean).join(sep);
}

export const wordCount = (text: string) => (text.trim() ? text.trim().split(/\s+/).length : 0);

/** Reading time: Hindi is read a little slower than English. */
export const readingMinutes = (words: number, lang: "en" | "hi") => Math.max(1, Math.round(words / (lang === "hi" ? 180 : 220)));

export const isEmptyDoc = (doc: JSONContent | null | undefined) => !docText(doc).trim() && !JSON.stringify(doc ?? {}).match(/"type":"(image|video|audio)"/);

export const emptyDoc = (): JSONContent => ({ type: "doc", content: [{ type: "paragraph" }] });

export function newId(prefix = "n"): string {
  const rand = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID().replace(/-/g, "") : Math.random().toString(36).slice(2) + Date.now().toString(36);
  return `${prefix}-${rand.slice(0, 14)}`;
}
