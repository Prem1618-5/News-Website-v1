import type { Role, Staff } from "@/domain/types";
import { api } from "./http";

export { ApiError as AuthError, tokenStore } from "./http";

export interface DemoAccount {
  email: string;
  password: string;
  role: Role;
  name: string;
}

export interface AuthConfig {
  demo_accounts: DemoAccount[];
  signup_requires_approval: boolean;
  email_enabled: boolean;
}

export type Session = { token: string; staff: Staff };
export type AuthResult = ({ kind: "session" } & Session) | { kind: "pending"; message: string };

type Raw = { authenticated?: boolean; token?: string; staff?: Staff; message?: string };

function toResult(data: Raw): AuthResult {
  if (data.authenticated && data.token && data.staff) return { kind: "session", token: data.token, staff: data.staff };
  return { kind: "pending", message: data.message ?? "Request sent." };
}

const P = "/staff-auth";

export const fetchAuthConfig = () => api<AuthConfig>(`${P}/config`, { token: null });

export const fetchSession = (token: string) => api<{ staff: Staff }>(`${P}/session`, { token }).then((r) => r.staff);

export const signIn = (email: string, password: string, remember = true) =>
  api<Raw>(`${P}/login`, { body: { email, password, remember }, token: null }).then(toResult);

export const signUp = (input: { display_name: string; email: string; password: string; job_title: string }) =>
  api<Raw>(`${P}/signup`, { body: input, token: null }).then(toResult);

export const requestReset = (email: string) =>
  api<{ sent: boolean; message: string; dev_link?: string }>(`${P}/forgot`, { body: { email }, token: null });

export const checkLink = (token: string) =>
  api<{ purpose: "reset" | "invite"; name: string; email: string; role: Role }>(`${P}/token?token=${encodeURIComponent(token)}`, { token: null });

export const choosePassword = (token: string, password: string) =>
  api<Raw>(`${P}/reset`, { body: { token, password }, token: null }).then(toResult);

export const changePassword = (current: string, password: string) => api<Raw>(`${P}/password`, { body: { current, password } }).then(toResult);

export const signOutEverywhere = () => api<{ ok: boolean }>(`${P}/logout-all`, { method: "POST" });
