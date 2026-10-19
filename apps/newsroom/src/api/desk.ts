/** Newsroom workspace data: SWR hooks for reading, plain functions for changes. */
import useSWR, { mutate as globalMutate } from "swr";
import type { Article, ArticleSummary, Hero, Lang, Me, NoteKind, NoteStatus, Note, NoticeItem, Priority, Revision, Role, ScopeKey, SectionKey, Staff, Stats, Doc } from "@/domain/types";
import { api, fetcher, tokenStore } from "./http";

export type ArticleView = "mine" | "review" | "checks" | "all";

export interface ArticleQuery {
  view?: ArticleView;
  status?: string;
  author?: string;
  section?: string;
  priority?: Priority;
  q?: string;
  limit?: number;
}

export const articlesKey = (q: ArticleQuery) => {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(q)) if (v !== undefined && v !== "") params.set(k, String(v));
  return `/desk/articles?${params}`;
};

const opts = { revalidateOnFocus: true, dedupingInterval: 4000 };

export function useMe() {
  return useSWR<Me>("/desk/me", fetcher, { ...opts, refreshInterval: 30_000 });
}

export function useArticles(q: ArticleQuery, refresh = 0) {
  return useSWR<{ total: number; items: ArticleSummary[] }>(articlesKey(q), fetcher, { ...opts, refreshInterval: refresh });
}

export function useArticle(id: string | undefined) {
  return useSWR<Article>(id ? `/desk/articles/${id}` : null, fetcher, { revalidateOnFocus: false, dedupingInterval: 1000 });
}

export function useHistory(id: string | undefined, version?: number) {
  return useSWR<{ author_id: string; items: Revision[] }>(id ? [`/desk/articles/${id}/history`, version] : null, ([path]: [string]) => fetcher(path));
}

export function useTeam() {
  return useSWR<Staff[]>("/desk/team", fetcher, opts);
}

export function useNotices(open: boolean) {
  return useSWR<NoticeItem[]>(open ? "/desk/notices" : null, fetcher, { revalidateOnFocus: false });
}

export function useStats(days: number) {
  return useSWR<Stats>(`/desk/stats?days=${days}`, fetcher, opts);
}

/** Refresh every list and counter after a change (cheap: a handful of small requests). */
export function refreshLists() {
  void globalMutate((key) => typeof key === "string" && (key.startsWith("/desk/articles?") || key === "/desk/me" || key.startsWith("/desk/stats")));
}

// ------------------------------------------------------------ stories

export interface ArticlePatch {
  version?: number;
  primary_language?: Lang;
  headline_en?: string;
  standfirst_en?: string;
  body_en?: Doc;
  headline_hi?: string;
  standfirst_hi?: string;
  body_hi?: Doc;
  unproofed?: Lang[];
  section?: SectionKey;
  scope?: ScopeKey;
  state?: string;
  district?: string;
  priority?: Priority;
  tags?: string[];
  hero?: Hero;
  clear_hero?: boolean;
}

export interface SendInput {
  scope?: ScopeKey;
  state?: string;
  district?: string;
  priority?: Priority;
  section?: SectionKey;
  version?: number;
  message?: string;
}

const A = (id: string) => `/desk/articles/${id}`;

export const createArticle = (body: ArticlePatch) => api<Article>("/desk/articles", { body: body as Record<string, unknown> });
export const updateArticle = (id: string, body: ArticlePatch) => api<Article>(A(id), { method: "PATCH", body: body as Record<string, unknown> });
export const submitArticle = (id: string, body: SendInput) => api<Article>(`${A(id)}/submit`, { body: body as Record<string, unknown> });
export const publishArticle = (id: string, body: SendInput) => api<Article>(`${A(id)}/publish`, { body: body as Record<string, unknown> });
export const returnArticle = (id: string, message: string) => api<Article>(`${A(id)}/return`, { body: { message } });
export const rejectArticle = (id: string, message: string) => api<Article>(`${A(id)}/reject`, { body: { message } });
export const unpublishArticle = (id: string, message: string) => api<Article>(`${A(id)}/unpublish`, { body: { message } });
export const checkArticle = (id: string) => api<Article>(`${A(id)}/check`, { method: "POST" });
export const reopenArticle = (id: string) => api<Article>(`${A(id)}/reopen`, { method: "POST" });
export const markSeen = (id: string) => api<Article>(`${A(id)}/seen`, { method: "POST" });
export const deleteArticle = (id: string) => api<{ ok: boolean }>(A(id), { method: "DELETE" });

export const addNote = (id: string, note: { id: string; kind: NoteKind; lang: Lang; quote: string; suggestion?: string; message?: string }) =>
  api<Note>(`${A(id)}/notes`, { body: note });
export const updateNote = (id: string, noteId: string, body: { status?: NoteStatus; reply?: string }) =>
  api<Note>(`${A(id)}/notes/${noteId}`, { method: "PATCH", body });

// ------------------------------------------------------------ people

export interface NewPerson {
  name: string;
  email: string;
  role: Role;
  job_title?: string;
  reports_to?: string;
  home_state?: string;
  home_district?: string;
  trusted?: boolean;
}

export type PersonPatch = Partial<{
  name: string;
  job_title: string;
  role: Role;
  reports_to: string;
  trusted: boolean;
  status: "active" | "suspended";
  home_state: string;
  home_district: string;
}>;

export const addPerson = (body: NewPerson) =>
  api<{ person: Staff; invite_link: string; emailed: boolean }>("/desk/team", { body: body as unknown as Record<string, unknown> });
export const updatePerson = (id: string, body: PersonPatch) => api<Staff>(`/desk/team/${id}`, { method: "PATCH", body });
export const resendInvite = (id: string) => api<{ invite_link: string; emailed: boolean }>(`/desk/team/${id}/invite`, { method: "POST" });
export const resetLinkFor = (id: string) => api<{ reset_link: string }>(`/desk/team/${id}/reset-link`, { method: "POST" });
export const approvePerson = (id: string, body: { role: "reporter" | "editor"; reports_to: string }) =>
  api<Staff>(`/desk/team/${id}/approve`, { body });
export const removePerson = (id: string) => api<{ ok: boolean }>(`/desk/team/${id}`, { method: "DELETE" });

export const updateProfile = (body: Partial<{ display_name: string; job_title: string; home_state: string; home_district: string; writing_language: Lang }>) =>
  api<Staff>("/desk/me", { method: "PUT", body });

export const readNotices = () => api<{ ok: boolean }>("/desk/notices/read", { method: "POST" });

// ------------------------------------------------------------ media

export interface Uploaded {
  id: string;
  url: string;
  kind: "image" | "video" | "audio";
  mime: string;
  size: number;
}

/** Upload with progress (fetch cannot report upload progress, so this uses XHR). */
export function uploadMedia(file: Blob, name: string, opts: { audio?: boolean; onProgress?: (fraction: number) => void } = {}): Promise<Uploaded> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${import.meta.env.VITE_API_BASE ?? ""}/api/desk/media${opts.audio ? "?audio=true" : ""}`);
    const token = tokenStore.get();
    if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.upload.onprogress = (e) => e.lengthComputable && opts.onProgress?.(e.loaded / e.total);
    xhr.onerror = () => reject(new Error("Upload failed. Check your connection and try again."));
    xhr.onload = () => {
      let data: { detail?: string } & Partial<Uploaded> = {};
      try {
        data = JSON.parse(xhr.responseText);
      } catch {}
      if (xhr.status >= 200 && xhr.status < 300) resolve(data as Uploaded);
      else reject(new Error(typeof data.detail === "string" ? data.detail : "Upload failed. Try again."));
    };
    const form = new FormData();
    form.append("file", file, name);
    xhr.send(form);
  });
}
