import { diffArrays } from "diff";

export interface Piece {
  text: string;
  kind: "same" | "added" | "removed";
}

/** Words and the spaces between them; works the same for Hindi and English. */
const tokens = (text: string) => text.split(/(\s+)/).filter((t) => t !== "");

/** Word-by-word difference between two texts. */
export function wordDiff(before: string, after: string): Piece[] {
  if (before === after) return before ? [{ text: before, kind: "same" }] : [];
  return diffArrays(tokens(before), tokens(after)).map((c) => ({
    text: c.value.join(""),
    kind: c.added ? "added" : c.removed ? "removed" : "same",
  }));
}

export const changed = (pieces: Piece[]) => pieces.some((p) => p.kind !== "same");

/** Counts of words added and removed, for a one-line summary. */
export function diffSize(pieces: Piece[]): { added: number; removed: number } {
  const words = (p: Piece) => p.text.trim().split(/\s+/).filter(Boolean).length;
  return {
    added: pieces.filter((p) => p.kind === "added").reduce((n, p) => n + words(p), 0),
    removed: pieces.filter((p) => p.kind === "removed").reduce((n, p) => n + words(p), 0),
  };
}
