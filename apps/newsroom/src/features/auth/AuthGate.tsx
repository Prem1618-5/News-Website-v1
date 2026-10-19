import { lazy, Suspense, useCallback, useState, type ReactNode } from "react";
import { Loader2, RefreshCw, WifiOff } from "lucide-react";
import useSWR from "swr";
import { fetchSession, tokenStore, type Session } from "@/api/staffAuth";
import { ApiError } from "@/api/http";
import type { Staff } from "@/domain/types";

const LoginPage = lazy(() => import("./LoginPage"));
const LinkPage = lazy(() => import("./LinkPage"));

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

/** /join?token=… (invite) and /reset?token=… (password reset) open the choose-a-password page. */
function linkToken(): string | null {
  const path = window.location.pathname.slice(BASE.length);
  if (!/^\/(join|reset)\/?$/.test(path)) return null;
  return new URLSearchParams(window.location.search).get("token");
}

function Splash({ label }: { label: string }) {
  return (
    <div role="status" className="flex min-h-dvh items-center justify-center gap-2 text-[14px] text-muted">
      <Loader2 className="size-4 animate-spin" aria-hidden="true" />
      {label}
    </div>
  );
}

export function AuthGate({ children }: { children: (ctx: { staff: Staff; signOut: () => void }) => ReactNode }) {
  const [link, setLink] = useState(linkToken);
  const [token, setToken] = useState<string | null>(() => (link ? null : tokenStore.get()));
  const [staff, setStaff] = useState<Staff | null>(null);

  const signOut = useCallback(() => {
    tokenStore.clear();
    setToken(null);
    setStaff(null);
  }, []);

  const signedIn = useCallback((s: Session) => {
    tokenStore.set(s.token);
    setToken(s.token);
    setStaff(s.staff);
    if (link) {
      setLink(null);
      window.history.replaceState(null, "", `${BASE}/`);
    }
  }, [link]);

  const { error, isLoading, isValidating, mutate } = useSWR(token && !staff ? ["staff-session", token] : null, ([, t]: [string, string]) => fetchSession(t), {
    revalidateOnFocus: false,
    revalidateIfStale: false,
    shouldRetryOnError: false,
    onSuccess: setStaff,
    onError: (err) => {
      // Only a rejected token means "signed out". A network blip or 5xx must not wipe a valid session.
      if (err instanceof ApiError && err.isAuthRejection) signOut();
    },
  });

  if (link)
    return (
      <Suspense fallback={<Splash label="Loading" />}>
        <LinkPage token={link} onAuthenticated={signedIn} onCancel={() => (setLink(null), window.history.replaceState(null, "", `${BASE}/`))} />
      </Suspense>
    );
  if (staff) return <>{children({ staff, signOut })}</>;
  if (token && isLoading) return <Splash label="Checking your session" />;
  if (token && error && !(error instanceof ApiError && error.isAuthRejection)) {
    return (
      <main className="flex min-h-dvh items-center justify-center px-5">
        <div className="w-full max-w-[380px] text-center">
          <span className="mx-auto flex size-11 items-center justify-center rounded-full bg-warn-soft text-warn">
            <WifiOff className="size-5" aria-hidden="true" />
          </span>
          <h1 className="mt-4 font-serif text-[22px] font-semibold">We couldn&apos;t check your session</h1>
          <p role="alert" className="mt-2 text-[14px] text-muted">{error instanceof Error ? error.message : "Something went wrong."}</p>
          <div className="mt-6 flex justify-center gap-2">
            <button type="button" onClick={() => void mutate()} disabled={isValidating} className="inline-flex h-10 items-center gap-2 rounded-lg bg-brand px-4 text-[14px] font-semibold text-white disabled:opacity-70">
              <RefreshCw className={isValidating ? "size-4 animate-spin" : "size-4"} aria-hidden="true" /> Try again
            </button>
            <button type="button" onClick={signOut} className="h-10 rounded-lg border border-line px-4 text-[14px] font-medium hover:bg-wash">Sign in again</button>
          </div>
        </div>
      </main>
    );
  }
  return (
    <Suspense fallback={<Splash label="Loading" />}>
      <LoginPage onAuthenticated={signedIn} />
    </Suspense>
  );
}
