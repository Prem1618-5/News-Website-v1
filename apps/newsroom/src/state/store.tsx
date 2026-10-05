import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { SessionStaff } from "@/api/staffAuth";
import { seedState } from "@/data/seed";
import { capabilitiesFor, type Capability } from "@/domain/capabilities";
import { getActor, switchActor, tick, type NewsroomState, type Out } from "@/domain/workflow";
import type { Role, Staff } from "@/domain/types";

interface Toast {
  id: number;
  text: string;
  tone: "ok" | "error";
}

interface Ctx {
  state: NewsroomState;
  actor: Staff;
  can: (cap: Capability) => boolean;
  /** Apply a pure domain action. Shows a toast and returns true when it succeeded. */
  run: (fn: (s: NewsroomState, actor: Staff) => Out) => boolean;
  switchRole: (role: Role) => void;
  reset: () => void;
  /** True in the open demo workspace (actor switcher visible). False when signed in as staff. */
  demo: boolean;
  signOut?: () => void;
  toasts: Toast[];
  dismissToast: (id: number) => void;
}

const NewsroomContext = createContext<Ctx | null>(null);

const DEFAULT_ACTOR: Record<Role, string> = { admin: "jane", editor: "mary", reporter: "alice" };

function stateFor(session: SessionStaff | null): NewsroomState {
  const base = seedState();
  if (!session) return base;
  if (base.staff.some((x) => x.id === session.id)) return switchActor(base, session.id);
  const now = Date.now();
  const person: Staff = {
    id: session.id, name: session.name, email: session.email, role: session.role, status: "active",
    jobTitle: session.jobTitle || "Reporter", editorId: session.role === "reporter" ? "mary" : undefined,
    publishMode: "review", supervision: "none", presence: "available", mfa: false, lastActiveAt: now, createdAt: now,
  };
  return switchActor({ ...base, staff: [...base.staff, person] }, person.id);
}

export function NewsroomProvider({
  children,
  session = null,
  demo = true,
  onSignOut,
}: {
  children: ReactNode;
  session?: SessionStaff | null;
  demo?: boolean;
  onSignOut?: () => void;
}) {
  const [state, setState] = useState<NewsroomState>(() => stateFor(session));
  const [toasts, setToasts] = useState<Toast[]>([]);
  const stateRef = useRef(state);
  stateRef.current = state;
  const toastId = useRef(0);

  const pushToast = useCallback((text: string, tone: Toast["tone"]) => {
    const id = ++toastId.current;
    setToasts((t) => [...t.slice(-2), { id, text, tone }]);
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), tone === "error" ? 6000 : 3500);
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => setState((s) => tick(s)), 30_000);
    return () => window.clearInterval(id);
  }, []);

  const run = useCallback<Ctx["run"]>(
    (fn) => {
      const current = tick(stateRef.current);
      const out = fn(current, getActor(current));
      setState(out.state);
      stateRef.current = out.state;
      if (out.error) {
        pushToast(out.error, "error");
        return false;
      }
      if (out.message) pushToast(out.message, "ok");
      return true;
    },
    [pushToast],
  );

  const value = useMemo<Ctx>(() => {
    const actor = getActor(state);
    return {
      state,
      actor,
      can: (cap) => capabilitiesFor(actor.role).includes(cap),
      run,
      switchRole: (role) => setState((s) => switchActor(s, DEFAULT_ACTOR[role])),
      reset: () => {
        setState(stateFor(session));
        pushToast("Demo data reset", "ok");
      },
      demo,
      signOut: onSignOut,
      toasts,
      dismissToast: (id) => setToasts((t) => t.filter((x) => x.id !== id)),
    };
  }, [state, run, toasts, pushToast, session, demo, onSignOut]);

  return <NewsroomContext.Provider value={value}>{children}</NewsroomContext.Provider>;
}

export function useNewsroom(): Ctx {
  const ctx = useContext(NewsroomContext);
  if (!ctx) throw new Error("useNewsroom must be used inside NewsroomProvider");
  return ctx;
}

/** Re-renders the caller on an interval so countdowns stay live. */
export function useNow(intervalMs = 1000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);
  return now;
}
