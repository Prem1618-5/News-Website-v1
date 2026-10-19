import { useEffect, useMemo, useState, type ReactNode } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { BarChart3, FileText, Home, Inbox, LogOut, PanelLeftClose, PanelLeftOpen, PauseCircle, PenSquare, ShieldAlert, Siren, Users, X } from "lucide-react";
import clsx from "clsx";
import { ROLE_LABEL } from "@/domain/capabilities";
import type { Capability } from "@/domain/capabilities";
import type { Role } from "@/domain/types";

import { useNewsroom } from "@/state/store";
import { Avatar, Button } from "@/components/ui/primitives";
import { Composer } from "@/features/compose/Composer";
import { Topbar } from "./Topbar";

interface NavItem {
  to: string;
  label: string;
  icon: ReactNode;
  cap?: Capability | Capability[];
  count?: number;
  end?: boolean;
}

export function AppShell() {
  const { state, actor, can, switchRole, reset, demo, signOut, toasts, dismissToast } = useNewsroom();
  const [menuOpen, setMenuOpen] = useState(false);
  const [composeOpen, setComposeOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => setMenuOpen(false), [location.pathname, location.search]);

  // The "New article" shortcuts navigate to /write; open the composer there and land on the desk.
  useEffect(() => {
    if (location.pathname === "/write") {
      setComposeOpen(true);
      navigate("/", { replace: true });
    }
  }, [location.pathname, navigate]);

  const openQueue = state.articles.filter((a) => a.status === "in_review").length;
  const supervised = state.staff.filter((s) => s.supervision === "supervised").length;

  const nav: NavItem[] = useMemo(
    () => [
      { to: "/", label: actor.role === "admin" ? "Control room" : actor.role === "editor" ? "Editor desk" : "My desk", icon: <Home className="size-[18px]" />, end: true },
      { to: "/queue", label: "Review queue", icon: <Inbox className="size-[18px]" />, cap: "review.queue", count: openQueue },
      { to: "/articles", label: actor.role === "reporter" ? "My articles" : "All content", icon: <FileText className="size-[18px]" /> },
      { to: "/analytics", label: "Analytics", icon: <BarChart3 className="size-[18px]" />, cap: "analytics.own" },
      { to: "/team", label: actor.role === "editor" ? "My reporters" : "Team", icon: <Users className="size-[18px]" />, cap: "team.view" },
    ],
    [actor.role, openQueue],
  );

  const bookmarks: NavItem[] = [
    { to: "/queue?lane=breaking", label: "Breaking news", icon: <Siren className="size-[18px]" />, cap: "review.queue" },
    { to: "/team?tab=supervised", label: "Extra review", icon: <ShieldAlert className="size-[18px]" />, cap: "team.view", count: supervised },
    { to: "/articles?filter=held", label: "Paused", icon: <PauseCircle className="size-[18px]" />, cap: "article.hold" },
  ];

  const visible = (items: NavItem[]) =>
    items.filter((i) => {
      if (!i.cap) return true;
      return (Array.isArray(i.cap) ? i.cap : [i.cap]).some((c) => can(c));
    });

  const renderSidebar = (mini: boolean, onToggle?: () => void) => (
    <div className="flex h-full flex-col">
      <div className={clsx("pt-4", mini ? "px-2" : "px-3")}>
        <div className={clsx("flex items-center rounded-lg py-1.5", mini ? "flex-col gap-2 px-0" : "gap-2.5 px-2")}>
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand font-serif text-[17px] font-semibold text-white" aria-hidden={mini ? undefined : true}>
            N
          </span>
          {!mini && (
            <div className="min-w-0 flex-1 leading-tight">
              <p className="truncate text-[14px] font-semibold">News APP</p>
              <p className="truncate text-[12px] text-muted">Newsroom</p>
            </div>
          )}
          {onToggle && (
            <button
              onClick={onToggle}
              aria-label={mini ? "Expand sidebar" : "Collapse sidebar"}
              aria-expanded={!mini}
              title={mini ? "Expand sidebar" : "Collapse sidebar"}
              className="flex size-8 shrink-0 items-center justify-center rounded-md text-muted hover:bg-wash hover:text-ink"
            >
              {mini ? <PanelLeftOpen className="size-[18px]" /> : <PanelLeftClose className="size-[18px]" />}
            </button>
          )}
        </div>
      </div>

      <div className={clsx("pt-4", mini ? "px-2" : "px-3")}>
        <Button
          variant="primary"
          className={clsx("w-full", mini && "px-0!")}
          onClick={() => setComposeOpen(true)}
          disabled={!can("article.create")}
          aria-label={mini ? "New article" : undefined}
          title={mini ? "New article" : undefined}
        >
          <PenSquare className="size-4" />
          {!mini && "New article"}
        </Button>
      </div>

      <nav aria-label="Primary" className={clsx("mt-4 flex-1 space-y-5 overflow-y-auto pb-4", mini ? "px-2" : "px-3")}>
        <ul className="space-y-0.5">
          {visible(nav).map((item) => (
            <li key={item.to}>
              <SideLink item={item} mini={mini} />
            </li>
          ))}
        </ul>
        {visible(bookmarks).length > 0 && (
          <div>
            {mini ? <hr className="mx-2 mb-2 border-line" /> : <p className="mb-1 px-2 text-[12px] font-medium text-faint">Shortcuts</p>}
            <ul className="space-y-0.5">
              {visible(bookmarks).map((item) => (
                <li key={item.to}>
                  <SideLink item={item} mini={mini} />
                </li>
              ))}
            </ul>
          </div>
        )}
      </nav>

      <div className={clsx("border-t border-line", mini ? "p-2" : "p-3")}>
        <div className={clsx("flex items-center gap-2.5 rounded-lg py-1.5", mini ? "justify-center px-0" : "px-2")} title={mini ? `${actor.name}, ${ROLE_LABEL[actor.role]}` : undefined}>
          <Avatar person={actor} size={32} />
          {!mini && (
            <div className="min-w-0 flex-1 leading-tight">
              <p className="truncate text-[13px] font-medium">{actor.name}</p>
              <p className="truncate text-[12px] text-muted">{ROLE_LABEL[actor.role]}</p>
            </div>
          )}
          {!mini && actor.role !== "reporter" && (
            <span
              title={`Status: ${actor.presence.replace("_", " ")}`}
              className={clsx("size-2 shrink-0 rounded-full", actor.presence === "available" ? "bg-good" : actor.presence === "busy" ? "bg-warn" : "bg-faint")}
            />
          )}
        </div>
        {!demo && signOut && (
          <button
            onClick={signOut}
            aria-label="Sign out"
            title="Sign out"
            className={clsx("mt-1 flex h-9 w-full items-center gap-2 rounded-lg text-[13px] text-muted hover:bg-wash hover:text-ink", mini ? "justify-center" : "px-2")}
          >
            <LogOut className="size-4" aria-hidden="true" />
            {!mini && "Sign out"}
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex h-dvh flex-col bg-white">
      {demo && <div className="flex min-h-12 shrink-0 flex-wrap items-center justify-between gap-x-4 gap-y-1 bg-banner px-4 py-2 text-[13px] text-white">
        <div className="flex items-center gap-2">
          <label htmlFor="viewing-as" className="text-white/70">
            Demo workspace. Viewing as
          </label>
          <select
            id="viewing-as"
            value={actor.role}
            onChange={(e) => switchRole(e.target.value as Role)}
            className="h-8 rounded-md border border-white/20 bg-white/10 px-2 text-[13px] font-medium text-white focus:outline-none focus:ring-2 focus:ring-white/40"
          >
            {(["reporter", "editor", "admin"] as Role[]).map((r) => (
              <option key={r} value={r} className="text-ink">
                {ROLE_LABEL[r]}
              </option>
            ))}
          </select>
        </div>
        <button onClick={reset} className="h-8 rounded-md bg-brand px-3 text-[13px] font-medium text-white hover:bg-brand-deep">
          Reset demo
        </button>
      </div>}

      <div className="flex min-h-0 flex-1">
        <aside
          className={clsx(
            "hidden shrink-0 border-r border-line bg-[#fbfbfd] transition-[width] duration-200 md:block",
            collapsed ? "w-[64px]" : "w-[232px]",
          )}
        >
          {renderSidebar(collapsed, () => setCollapsed((c) => !c))}
        </aside>

        {menuOpen && (
          <div className="fixed inset-0 z-30 md:hidden">
            <button aria-label="Close menu" className="absolute inset-0 bg-ink/30" onClick={() => setMenuOpen(false)} />
            <div className="absolute inset-y-0 left-0 w-[272px] max-w-[85vw] bg-[#fbfbfd] shadow-xl">
              <button aria-label="Close menu" onClick={() => setMenuOpen(false)} className="absolute right-2 top-5 z-10 rounded-md p-1 text-muted hover:bg-wash">
                <X className="size-5" />
              </button>
              {renderSidebar(false)}
            </div>
          </div>
        )}

        <div className="flex min-w-0 flex-1 flex-col overflow-y-auto">
          <Topbar onMenu={() => setMenuOpen(true)} />
          <main className="mx-auto w-full max-w-[1000px] flex-1 px-4 pb-24 pt-6 sm:px-8 sm:pt-8">
            <Outlet />
          </main>
        </div>
      </div>

      {composeOpen && <Composer onClose={() => setComposeOpen(false)} />}

      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex flex-col items-center gap-2 px-4" aria-live="polite">
        {toasts.map((t) => (
          <div
            key={t.id}
            role={t.tone === "error" ? "alert" : "status"}
            className={clsx(
              "pointer-events-auto flex max-w-md items-start gap-3 rounded-xl px-4 py-3 text-[13px] shadow-lg",
              t.tone === "error" ? "bg-bad text-white" : "bg-ink text-white",
            )}
          >
            <span className="flex-1">{t.text}</span>
            <button onClick={() => dismissToast(t.id)} aria-label="Dismiss" className="text-white/70 hover:text-white">
              <X className="size-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function SideLink({ item, mini = false }: { item: NavItem; mini?: boolean }) {
  const location = useLocation();
  const [path, query] = item.to.split("?");
  const isActive = item.end
    ? location.pathname === "/"
    : location.pathname.startsWith(path) && (query ? location.search.includes(query) : !location.search.includes("lane=") && !location.search.includes("tab=supervised") && !location.search.includes("filter=held"));
  return (
    <NavLink
      to={item.to}
      end={item.end}
      aria-current={isActive ? "page" : undefined}
      title={mini ? item.label : undefined}
      className={clsx(
        "relative flex h-9 items-center rounded-lg text-[14px] font-medium transition-colors",
        mini ? "justify-center px-0" : "gap-2.5 px-2",
        isActive ? "bg-select text-ink" : "text-muted hover:bg-wash hover:text-ink",
      )}
    >
      {item.icon}
      <span className={mini ? "sr-only" : "flex-1 truncate"}>{item.label}</span>
      {item.count ? (
        mini ? (
          <span className="absolute right-1 top-1 size-2 rounded-full bg-brand" aria-hidden="true" />
        ) : (
          <span className="rounded-full bg-white px-1.5 text-[12px] text-muted ring-1 ring-line">{item.count}</span>
        )
      ) : null}
    </NavLink>
  );
}
