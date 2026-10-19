/**
 * Keeps the story saved without a Save button: changes go to the server a moment after typing stops, one
 * request at a time, carrying the version so two people never overwrite each other. A copy waits in
 * localStorage until the server has it, so a dropped connection on a phone loses nothing.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { updateArticle, type ArticlePatch } from "@/api/desk";
import { ApiError } from "@/api/http";
import type { Article, Doc, Hero, Lang, SectionKey } from "@/domain/types";

export interface Fields {
  headline_en: string;
  standfirst_en: string;
  body_en: Doc;
  headline_hi: string;
  standfirst_hi: string;
  body_hi: Doc;
  hero: Hero | null;
  primary_language: Lang;
  section: SectionKey;
  tags: string[];
  unproofed: Lang[];
}

export type SaveState = "saved" | "pending" | "saving" | "offline" | "error";

export const fieldsOf = (a: Article): Fields => ({
  headline_en: a.headline_en,
  standfirst_en: a.standfirst_en,
  body_en: a.body_en,
  headline_hi: a.headline_hi,
  standfirst_hi: a.standfirst_hi,
  body_hi: a.body_hi,
  hero: a.hero,
  primary_language: a.primary_language,
  section: a.section,
  tags: a.tags,
  unproofed: a.unproofed,
});

/** JSON without null or empty values: the editor writes `textAlign: null`, the server leaves it out. */
const canon = (v: unknown): unknown => {
  if (Array.isArray(v)) return v.map(canon);
  if (v && typeof v === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, x] of Object.entries(v)) {
      const c = canon(x);
      if (c === null || c === undefined || (typeof c === "object" && !Array.isArray(c) && !Object.keys(c as object).length)) continue;
      out[k] = c;
    }
    return out;
  }
  return v;
};
const same = (a: unknown, b: unknown) => JSON.stringify(canon(a ?? null)) === JSON.stringify(canon(b ?? null));

function patchOf(saved: Fields, now: Fields): ArticlePatch {
  const out: ArticlePatch = {};
  for (const k of Object.keys(now) as (keyof Fields)[]) {
    if (same(saved[k], now[k])) continue;
    if (k === "hero") {
      if (now.hero?.src) out.hero = now.hero;
      else out.clear_hero = true;
    } else (out as Record<string, unknown>)[k] = now[k];
  }
  return out;
}

const backupKey = (id: string) => `newsroom.draft.${id}`;

export function useAutosave(
  article: Article,
  opts: { onSaved: (a: Article) => void; onConflict: () => void; onError: (message: string) => void },
) {
  const initial = useRef<Fields | null>(null);
  if (!initial.current) {
    initial.current = fieldsOf(article);
    // A copy left from a save that never reached the server (phone went offline) wins if nothing changed since.
    try {
      const raw = localStorage.getItem(backupKey(article.id));
      const backup = raw ? (JSON.parse(raw) as { version: number; fields: Fields }) : null;
      if (backup && backup.version === article.version && article.can.edit) initial.current = { ...initial.current, ...backup.fields };
      else if (backup) localStorage.removeItem(backupKey(article.id));
    } catch {}
  }
  const draft = useRef<Fields>(initial.current);
  const saved = useRef<Fields>(fieldsOf(article));
  const version = useRef(article.version);
  const timer = useRef<number | undefined>(undefined);
  const inflight = useRef<Promise<void> | null>(null);
  const opt = useRef(opts);
  opt.current = opts;
  const [state, setState] = useState<SaveState>(() => (same(initial.current, fieldsOf(article)) ? "saved" : "pending"));
  const restored = useRef(state === "pending");

  const dirty = () => Object.keys(patchOf(saved.current, draft.current)).length > 0;

  const flush = useCallback(async (): Promise<boolean> => {
    window.clearTimeout(timer.current);
    if (inflight.current) await inflight.current;
    const sending = draft.current;
    const patch = patchOf(saved.current, sending);
    if (!Object.keys(patch).length) {
      setState("saved");
      return true;
    }
    setState("saving");
    let ok = false;
    inflight.current = (async () => {
      try {
        const res = await updateArticle(article.id, { ...patch, version: version.current });
        version.current = res.version;
        saved.current = sending;
        ok = true;
        opt.current.onSaved(res);
        if (dirty()) {
          setState("pending");
          timer.current = window.setTimeout(() => void flush(), 800);
        } else {
          setState("saved");
          try {
            localStorage.removeItem(backupKey(article.id));
          } catch {}
        }
      } catch (err) {
        if (err instanceof ApiError && err.status === 409) {
          try {
            localStorage.removeItem(backupKey(article.id));
          } catch {}
          opt.current.onConflict();
        } else if (err instanceof ApiError && err.status === 0) {
          setState("offline");
          timer.current = window.setTimeout(() => void flush(), 5000);
        } else {
          setState("error");
          opt.current.onError(err instanceof Error ? err.message : "Could not save.");
        }
      } finally {
        inflight.current = null;
      }
    })();
    await inflight.current;
    return ok;
  }, [article.id]);

  const change = useCallback(
    (patch: Partial<Fields>, delay = 1200) => {
      if ((Object.keys(patch) as (keyof Fields)[]).every((k) => same(patch[k], draft.current[k]))) return;
      draft.current = { ...draft.current, ...patch };
      try {
        localStorage.setItem(backupKey(article.id), JSON.stringify({ version: version.current, fields: draft.current }));
      } catch {}
      setState((s) => (s === "offline" ? s : "pending"));
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => void flush(), delay);
    },
    [article.id, flush],
  );

  /** After an action that changed the story on the server (send, publish), continue from its version. */
  const adopt = useCallback((a: Article) => {
    version.current = a.version;
    saved.current = { ...saved.current, section: a.section };
    draft.current = { ...draft.current, section: a.section };
  }, []);

  useEffect(() => {
    if (restored.current) {
      restored.current = false;
      void flush();
    }
    const away = () => document.visibilityState === "hidden" && void flush();
    document.addEventListener("visibilitychange", away);
    return () => {
      document.removeEventListener("visibilitychange", away);
      window.clearTimeout(timer.current);
      void flush();
    };
  }, [flush]);

  return { draft, state, change, flush, adopt, version, initialFields: initial.current };
}
