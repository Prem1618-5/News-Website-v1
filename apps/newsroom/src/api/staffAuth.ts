import type { Role } from "@/domain/types";

export interface SessionStaff {
  id: string;
  name: string;
  email: string;
  role: Role;
  jobTitle: string;
  status: string;
}

export interface DemoAccount {
  email: string;
  password: string;
  role: Role;
  name: string;
}

export interface AuthConfig {
  demo_accounts: DemoAccount[];
  signup_requires_approval: boolean;
}

export type AuthResult = { kind: "session"; token: string; staff: SessionStaff } | { kind: "pending"; message: string };

const BASE = `${import.meta.env.VITE_API_BASE ?? ""}/api/staff-auth`;
const TOKEN_KEY = "newsroom.staff.token";

// sessionStorage can throw (Safari private mode, sandboxed iframes); auth must still work for the tab.
let memoryToken: string | null = null;
export const tokenStore = {
  get: () => {
    try {
      return sessionStorage.getItem(TOKEN_KEY) ?? memoryToken;
    } catch {
      return memoryToken;
    }
  },
  set: (t: string) => {
    memoryToken = t;
    try {
      sessionStorage.setItem(TOKEN_KEY, t);
    } catch {}
  },
  clear: () => {
    memoryToken = null;
    try {
      sessionStorage.removeItem(TOKEN_KEY);
    } catch {}
  },
};

export type AuthField = "display_name" | "job_title" | "email" | "password";

export class AuthError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly fields: Partial<Record<AuthField, string>> = {},
  ) {
    super(message);
    this.name = "AuthError";
  }

  /** True when the server rejected the credentials themselves, not when it was unreachable or failing. */
  get isAuthRejection() {
    return this.status === 401 || this.status === 403;
  }
}

async function request<T>(path: string, init: RequestInit = {}, token?: string | null): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    });
  } catch {
    throw new AuthError("Can't reach the newsroom server. Check your connection and try again.", 0);
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detail = data?.detail;
    const fields = data?.fields && typeof data.fields === "object" ? (data.fields as AuthError["fields"]) : {};
    const message =
      typeof detail === "string"
        ? detail
        : res.status >= 500
          ? "The newsroom server had a problem. Try again in a moment."
          : "Something went wrong. Try again.";
    throw new AuthError(message, res.status, fields);
  }
  return data as T;
}

export const fetchAuthConfig = () => request<AuthConfig>("/config");

export const fetchSession = (token: string) => request<{ staff: SessionStaff }>("/session", {}, token).then((r) => r.staff);

function toResult(data: { authenticated?: boolean; token?: string; staff?: SessionStaff; message?: string }): AuthResult {
  if (data.authenticated && data.token && data.staff) return { kind: "session", token: data.token, staff: data.staff };
  return { kind: "pending", message: data.message ?? "Request received." };
}

export const signIn = (email: string, password: string) =>
  request<Parameters<typeof toResult>[0]>("/login", { method: "POST", body: JSON.stringify({ email, password }) }).then(toResult);

export const signUp = (input: { display_name: string; email: string; password: string; job_title: string }) =>
  request<Parameters<typeof toResult>[0]>("/signup", { method: "POST", body: JSON.stringify(input) }).then(toResult);
