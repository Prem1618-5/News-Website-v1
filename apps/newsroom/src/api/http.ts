/** Fetch wrapper for the Platform API: bearer token, JSON or form bodies, readable errors. */

const BASE = `${import.meta.env.VITE_API_BASE ?? ""}/api`;
const TOKEN_KEY = "newsroom.staff.token";

// Kept in localStorage so a reporter's phone stays signed in between visits (the server decides how long
// a token lives and can end it). Storage can throw in private modes; the tab still works from memory.
let memoryToken: string | null = null;
export const tokenStore = {
  get: () => {
    try {
      return localStorage.getItem(TOKEN_KEY) ?? sessionStorage.getItem(TOKEN_KEY) ?? memoryToken;
    } catch {
      return memoryToken;
    }
  },
  set: (t: string) => {
    memoryToken = t;
    try {
      localStorage.setItem(TOKEN_KEY, t);
    } catch {}
  },
  clear: () => {
    memoryToken = null;
    try {
      localStorage.removeItem(TOKEN_KEY);
      sessionStorage.removeItem(TOKEN_KEY);
    } catch {}
  },
};

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly fields: Record<string, string> = {},
  ) {
    super(message);
    this.name = "ApiError";
  }

  /** The server rejected the session or the role, as opposed to being unreachable. */
  get isAuthRejection() {
    return this.status === 401 || this.status === 403;
  }
}

let onUnauthorized: (() => void) | null = null;
/** Called once when any request comes back 401 with a token: the session ended (reset, suspension). */
export const setUnauthorizedHandler = (fn: (() => void) | null) => {
  onUnauthorized = fn;
};

type Body = Record<string, unknown> | unknown[] | FormData | undefined;

export async function api<T>(path: string, init: { method?: string; body?: Body; signal?: AbortSignal; token?: string | null } = {}): Promise<T> {
  const token = init.token === undefined ? tokenStore.get() : init.token;
  const form = init.body instanceof FormData;
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      method: init.method ?? (init.body ? "POST" : "GET"),
      signal: init.signal,
      headers: {
        ...(form || !init.body ? {} : { "Content-Type": "application/json" }),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: form ? (init.body as FormData) : init.body ? JSON.stringify(init.body) : undefined,
    });
  } catch (err) {
    if ((err as Error).name === "AbortError") throw err;
    throw new ApiError("Can't reach the newsroom server. Check your connection and try again.", 0);
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401 && token && onUnauthorized) onUnauthorized();
    const detail = (data as { detail?: unknown }).detail;
    const fields = (data as { fields?: Record<string, string> }).fields ?? {};
    const message =
      typeof detail === "string"
        ? detail
        : res.status === 413
          ? "This file or story is too large."
          : res.status >= 500
            ? "The newsroom server had a problem. Try again in a moment."
            : "Something went wrong. Try again.";
    throw new ApiError(message, res.status, typeof fields === "object" ? fields : {});
  }
  return data as T;
}

/** SWR fetcher: keys are API paths. */
export const fetcher = <T,>(path: string) => api<T>(path);

export const errorText = (err: unknown) => (err instanceof Error ? err.message : "Something went wrong. Try again.");
