import { lazy, Suspense, useCallback, useState, type ReactNode } from "react";
import { Loader2, RefreshCw, WifiOff } from "lucide-react";
import useSWR from "swr";
import { AuthError, fetchSession, tokenStore, type SessionStaff } from "@/api/staffAuth";

const LoginPage = lazy(() => import("./LoginPage"));

interface Props {
  children: (ctx: { staff: SessionStaff | null; demo: boolean; signOut: () => void }) => ReactNode;
}

function Splash({ label }: { label: string }) {
  return (
    <div role="status" className="flex min-h-dvh items-center justify-center gap-2 text-[14px] text-muted">
      <Loader2 className="size-4 animate-spin" aria-hidden="true" />
      {label}
    </div>
  );
}

function SessionUnavailable({ message, onRetry, onSignOut, retrying }: { message: string; onRetry: () => void; onSignOut: () => void; retrying: boolean }) {
  return (
    <main className="flex min-h-dvh items-center justify-center px-5">
      <div className="w-full max-w-[380px] text-center">
        <span className="mx-auto flex size-11 items-center justify-center rounded-full bg-warn-soft text-warn">
          <WifiOff className="size-5" aria-hidden="true" />
        </span>
        <h1 className="mt-4 font-serif text-[22px] font-semibold">We couldn&apos;t check your session</h1>
        <p role="alert" className="mt-2 text-[14px] text-muted">
          {message}
        </p>
        <div className="mt-6 flex justify-center gap-2">
          <button
            type="button"
            onClick={onRetry}
            disabled={retrying}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-brand px-4 text-[14px] font-semibold text-white hover:bg-brand-deep disabled:opacity-70"
          >
            <RefreshCw className={retrying ? "size-4 animate-spin" : "size-4"} aria-hidden="true" />
            Try again
          </button>
          <button type="button" onClick={onSignOut} className="h-10 rounded-lg border border-line px-4 text-[14px] font-medium hover:bg-wash">
            Sign in again
          </button>
        </div>
      </div>
    </main>
  );
}

function readDemoFlag() {
  return new URLSearchParams(window.location.search).get("demo") === "1";
}

export function AuthGate({ children }: Props) {
  const [demo] = useState(readDemoFlag);
  const [token, setToken] = useState<string | null>(() => (demo ? null : tokenStore.get()));
  const [staff, setStaff] = useState<SessionStaff | null>(null);

  const signOut = useCallback(() => {
    tokenStore.clear();
    setToken(null);
    setStaff(null);
  }, []);

  const { error, isLoading, isValidating, mutate } = useSWR(
    !demo && token && !staff ? ["staff-session", token] : null,
    ([, t]: [string, string]) => fetchSession(t),
    {
      revalidateOnFocus: false,
      revalidateIfStale: false,
      shouldRetryOnError: false,
      onSuccess: setStaff,
      onError: (err) => {
        // Only a rejected token means "signed out". A network blip or 5xx must not wipe a valid session.
        if (err instanceof AuthError && err.isAuthRejection) signOut();
      },
    },
  );

  if (demo) return <>{children({ staff: null, demo: true, signOut })}</>;
  if (staff) return <>{children({ staff, demo: false, signOut })}</>;
  if (token && isLoading) return <Splash label="Checking your session" />;
  if (token && error && !(error instanceof AuthError && error.isAuthRejection)) {
    return (
      <SessionUnavailable
        message={error instanceof Error ? error.message : "Something went wrong. Try again."}
        onRetry={() => void mutate()}
        onSignOut={signOut}
        retrying={isValidating}
      />
    );
  }

  return (
    <Suspense fallback={<Splash label="Loading" />}>
      <LoginPage
        onAuthenticated={(r) => {
          tokenStore.set(r.token);
          setToken(r.token);
          setStaff(r.staff);
        }}
      />
    </Suspense>
  );
}
