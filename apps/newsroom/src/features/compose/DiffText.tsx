import clsx from "clsx";
import type { Piece } from "@/domain/diff";

/** Added words on a soft green, removed words struck through on a soft red. Calm enough to read. */
export function DiffText({ pieces, className, lang }: { pieces: Piece[]; className?: string; lang?: "en" | "hi" }) {
  return (
    <p className={clsx("whitespace-pre-wrap", lang === "hi" && "lang-hi", className)} lang={lang}>
      {pieces.map((p, i) =>
        p.kind === "added" ? (
          <ins key={i} className="diff-ins">
            <span className="sr-only">added: </span>
            {p.text}
          </ins>
        ) : p.kind === "removed" ? (
          <del key={i} className="diff-del">
            <span className="sr-only">removed: </span>
            {p.text}
          </del>
        ) : (
          <span key={i}>{p.text}</span>
        ),
      )}
    </p>
  );
}
