import type { Article, ArticleBlock, Preflight } from "./types";

const MEDIA_TYPES = new Set(["image", "video", "audio", "media"]);

/** Readable name for a block, used to anchor comments ("Paragraph 3", "Heading 1"). */
export function blockLabel(blocks: ArticleBlock[], blockId: string | undefined): string {
  if (!blockId) return "Whole article";
  const all = flattenBlocks(blocks);
  const target = all.find((b) => b.id === blockId);
  if (!target) return "Story text";
  const NAMES: Record<string, string> = { paragraph: "Paragraph", heading: "Heading", quote: "Quote", media: "Media", bulletListItem: "List item", numberedListItem: "List item" };
  const name = NAMES[target.type] ?? "Block";
  const n = all.filter((b) => (NAMES[b.type] ?? "Block") === name).indexOf(target) + 1;
  return `${name} ${n}`;
}

/** Plain text of one block, ignoring formatting. */
export function blockText(block: ArticleBlock): string {
  const c = block.content;
  if (typeof c === "string") return c;
  if (Array.isArray(c)) {
    return c
      .map((item) => {
        if (typeof item === "string") return item;
        if (item && typeof item === "object") {
          const node = item as { text?: string; content?: unknown };
          if (typeof node.text === "string") return node.text;
          if (Array.isArray(node.content)) return blockText({ type: "x", content: node.content });
        }
        return "";
      })
      .join("");
  }
  if (c && typeof c === "object" && "rows" in (c as object)) {
    const rows = (c as { rows: { cells: unknown[] }[] }).rows ?? [];
    return rows.map((r) => r.cells.map((cell) => blockText({ type: "x", content: Array.isArray(cell) ? cell : (cell as { content?: unknown })?.content })).join(" ")).join(" ");
  }
  return "";
}

export function flattenBlocks(blocks: ArticleBlock[]): ArticleBlock[] {
  return blocks.flatMap((b) => [b, ...flattenBlocks(b.children ?? [])]);
}

export function bodyText(blocks: ArticleBlock[]): string {
  return flattenBlocks(blocks).map(blockText).filter(Boolean).join("\n\n");
}

export function wordCount(text: string): number {
  return text.trim() ? text.trim().split(/\s+/u).length : 0;
}

/** Hindi readers average fewer words per minute in long-form; use a gentler rate. */
export function readingMinutes(blocks: ArticleBlock[], language: "en" | "hi" = "en"): number {
  const words = wordCount(bodyText(blocks));
  return Math.max(1, Math.round(words / (language === "hi" ? 180 : 230)));
}

export function contentBlocks(blocks: ArticleBlock[]): number {
  return flattenBlocks(blocks).filter((b) => MEDIA_TYPES.has(b.type) ? Boolean(b.props?.url) : blockText(b).trim().length > 0).length;
}

export function brokenMedia(blocks: ArticleBlock[]): boolean {
  return flattenBlocks(blocks).some((b) => MEDIA_TYPES.has(b.type) && !b.props?.url);
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\p{Letter}\p{Number}]+/gu, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 72);
}

/** Pre-flight facts derived from the real article content. */
export function derivePreflight(a: Pick<Article, "hero" | "body" | "section" | "authorId" | "slug">, slugTaken = false): Preflight {
  return {
    hasHero: Boolean(a.hero?.url),
    heroAlt: Boolean(a.hero?.alt?.trim()),
    heroCredit: Boolean(a.hero?.credit?.trim()),
    hasByline: Boolean(a.authorId),
    hasSection: Boolean(a.section),
    bodyBlocks: contentBlocks(a.body),
    brokenMedia: brokenMedia(a.body),
    slugUnique: !slugTaken,
  };
}

export interface BlockChange {
  blockId?: string;
  kind: "added" | "removed" | "changed";
  before: string;
  after: string;
}

/** Text-level differences between two versions of a body, matched by block id. */
export function diffBlocks(before: ArticleBlock[], after: ArticleBlock[]): BlockChange[] {
  const prev = new Map(flattenBlocks(before).map((b) => [b.id ?? "", b]));
  const next = flattenBlocks(after);
  const changes: BlockChange[] = [];
  const seen = new Set<string>();
  for (const b of next) {
    const id = b.id ?? "";
    seen.add(id);
    const old = prev.get(id);
    const afterText = blockText(b);
    if (!old) {
      if (afterText.trim() || MEDIA_TYPES.has(b.type)) changes.push({ blockId: id, kind: "added", before: "", after: afterText || `[${b.type}]` });
      continue;
    }
    const beforeText = blockText(old);
    if (beforeText !== afterText || JSON.stringify(old.props ?? {}) !== JSON.stringify(b.props ?? {})) {
      changes.push({ blockId: id, kind: "changed", before: beforeText, after: afterText });
    }
  }
  for (const [id, b] of prev) {
    if (!seen.has(id) && (blockText(b).trim() || MEDIA_TYPES.has(b.type))) changes.push({ blockId: id, kind: "removed", before: blockText(b) || `[${b.type}]`, after: "" });
  }
  return changes;
}

export function clip(text: string, max = 160): string {
  const t = text.replace(/\s+/g, " ").trim();
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
}

export function paragraph(id: string, text: string): ArticleBlock {
  return { id, type: "paragraph", props: {}, content: [{ type: "text", text, styles: {} }], children: [] };
}

export function heading(id: string, text: string, level = 2): ArticleBlock {
  return { id, type: "heading", props: { level }, content: [{ type: "text", text, styles: {} }], children: [] };
}

export function quote(id: string, text: string): ArticleBlock {
  return { id, type: "quote", props: {}, content: [{ type: "text", text, styles: {} }], children: [] };
}
