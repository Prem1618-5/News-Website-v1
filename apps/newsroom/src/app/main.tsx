import { lazy, StrictMode, Suspense, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import "@/styles/index.css";
import { AppShell } from "@/components/layout/AppShell";
import { AuthGate } from "@/features/auth/AuthGate";
import { SessionProvider, useSession } from "@/state/session";
import { isSenior } from "@/domain/types";
import HomePage from "@/features/home/HomePage";

const ComposePage = lazy(() => import("@/features/compose/ComposePage"));
const WritePage = lazy(() => import("@/features/compose/WritePage"));
const ReviewPage = lazy(() => import("@/features/review/ReviewPage"));
const StoriesPage = lazy(() => import("@/features/stories/StoriesPage"));
const TeamPage = lazy(() => import("@/features/team/TeamPage"));
const PersonPage = lazy(() => import("@/features/team/PersonPage"));
const StatsPage = lazy(() => import("@/features/stats/StatsPage"));
const SettingsPage = lazy(() => import("@/features/settings/SettingsPage"));

const Loading = () => <div role="status" aria-label="Loading" className="h-40 animate-pulse rounded-2xl bg-wash" />;

/** Pages for editors and admins only. The server checks every request too; this just avoids dead ends. */
function SeniorOnly({ children }: { children: ReactNode }) {
  const { me } = useSession();
  return isSenior(me) ? <>{children}</> : <Navigate to="/" replace />;
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AuthGate>
      {({ staff, signOut }) => (
        <SessionProvider key={staff.id} staff={staff} onSignOut={signOut}>
          <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Suspense fallback={<Loading />}>
              <Routes>
                <Route path="write" element={<WritePage />} />
                <Route path="stories/:id" element={<ComposePage />} />
                <Route element={<AppShell />}>
                  <Route index element={<HomePage />} />
                  <Route path="review" element={<SeniorOnly><ReviewPage /></SeniorOnly>} />
                  <Route path="stories" element={<StoriesPage />} />
                  <Route path="team" element={<SeniorOnly><TeamPage /></SeniorOnly>} />
                  <Route path="team/:id" element={<SeniorOnly><PersonPage /></SeniorOnly>} />
                  <Route path="stats" element={<StatsPage />} />
                  <Route path="settings" element={<SettingsPage />} />
                  <Route path="join" element={<Navigate to="/" replace />} />
                  <Route path="reset" element={<Navigate to="/" replace />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Route>
              </Routes>
            </Suspense>
          </BrowserRouter>
        </SessionProvider>
      )}
    </AuthGate>
  </StrictMode>,
);

// Offline shell and installability. Only in production builds: a service worker in dev caches stale modules.
if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    void navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`, { scope: import.meta.env.BASE_URL });
  });
}
