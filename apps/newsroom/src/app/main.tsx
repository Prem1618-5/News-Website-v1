import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import "@/styles/index.css";
import { AppShell } from "@/components/layout/AppShell";
import { NewsroomProvider } from "@/state/store";
import { AuthGate } from "@/features/auth/AuthGate";
import Home from "@/features/home/HomePage";
import Queue from "@/features/queue/QueuePage";
import Articles from "@/features/articles/ArticlesPage";
import Analytics from "@/features/analytics/AnalyticsPage";
import Team from "@/features/team/TeamPage";
import ReporterDetail from "@/features/team/ReporterDetailPage";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AuthGate>
      {({ staff, demo, signOut }) => (
        <NewsroomProvider key={staff?.id ?? "demo"} session={staff} demo={demo} onSignOut={signOut}>
          <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Routes>
              <Route element={<AppShell />}>
                <Route index element={<Home />} />
                <Route path="queue" element={<Queue />} />
                <Route path="articles" element={<Articles />} />
                <Route path="analytics" element={<Analytics />} />
                <Route path="team" element={<Team />} />
                <Route path="team/:id" element={<ReporterDetail />} />
                <Route path="*" element={<Home />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </NewsroomProvider>
      )}
    </AuthGate>
  </StrictMode>,
);
