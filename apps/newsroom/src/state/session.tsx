import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { mutate } from "swr";
import { useMe } from "@/api/desk";
import { setUnauthorizedHandler } from "@/api/http";
import type { Me, Staff } from "@/domain/types";

export type ToastTone = "info" | "error" | "success";
export interface Toast {
  id: number;
  text: string;
  tone: ToastTone;
  action?: { label: string; run: () => void };
}

interface SessionValue {
  me: Staff;
  counts: Me["counts"];
  unread: number;
  refresh: () => void;
  signOut: () => void;
  toast: (text: string, tone?: ToastTone, action?: Toast["action"]) => void;
  toasts: Toast[];
  dismiss: (id: number) => void;
}

const Ctx = createContext<SessionValue | null>(null);

export function SessionProvider({ staff, onSignOut, children }: { staff: Staff; onSignOut: () => void; children: ReactNode }) {
  const { data, mutate: refreshMe } = useMe();
  const [toasts, setToasts] = useState<Toast[]>([]);
  const next = useRef(1);

  const signOut = useCallback(() => {
    void mutate(() => true, undefined, { revalidate: false });
    onSignOut();
  }, [onSignOut]);

  useEffect(() => {
    setUnauthorizedHandler(signOut);
    return () => setUnauthorizedHandler(null);
  }, [signOut]);

  const dismiss = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), []);
  const toast = useCallback(
    (text: string, tone: ToastTone = "info", action?: Toast["action"]) => {
      const id = next.current++;
      setToasts((t) => [...t.slice(-2), { id, text, tone, action }]);
      window.setTimeout(() => dismiss(id), tone === "error" || action ? 7000 : 3500);
    },
    [dismiss],
  );

  const value = useMemo<SessionValue>(
    () => ({
      me: data?.staff ?? staff,
      counts: data?.counts ?? { drafts: 0, returned: 0, waiting: 0 },
      unread: data?.unread ?? 0,
      refresh: () => void refreshMe(),
      signOut,
      toast,
      toasts,
      dismiss,
    }),
    [data, staff, refreshMe, signOut, toast, toasts, dismiss],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSession(): SessionValue {
  const v = useContext(Ctx);
  if (!v) throw new Error("useSession outside SessionProvider");
  return v;
}

/** Re-render on an interval, for "5 min ago" labels. */
export function useNow(ms = 30_000): number {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), ms);
    return () => window.clearInterval(t);
  }, [ms]);
  return now;
}
