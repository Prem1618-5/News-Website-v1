import { useEffect, useState, type ReactNode } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { BarChart3, Bell, FileText, Home, Inbox, LogOut, PenSquare, Search, Settings, Users, X } from "lucide-react";
import clsx from "clsx";
import { readNotices, refreshLists, useNotices } from "@/api/desk";
import { ROLE_LABEL, isSenior } from "@/domain/types";
import { useSession } from "@/state/session";
import { Avatar, timeAgo } from "@/components/ui/primitives";
import { InstallPrompt } from "@/pwa/InstallPrompt";

interface NavItem {
  to: string;
  label: string;
  icon: ReactNode;
  count?: number;
  end?: boolean;
}

export function AppShell() {
  const { me, counts, signOut, toasts, dismiss } = useSession();
  const senior = isSenior(me);
  const location = useLocation();
  const toReview = counts.to_review ?? 0;

  const nav: NavItem[] = [
    { to: "/", label: "Home", icon: <Home className="size-[18px]" />, end: true, count: senior ? undefined : counts.returned || undefined },
    ...(senior ? [{ to: "/review", label: "Review", icon: <Inbox className="size-[18px]" />, count: toReview + (counts.to_check ?? 0) || undefined }] : []),
    { to: "/stories", label: senior ? "Stories" : "My stories", icon: <FileText className="size-[18px]" /> },
    ...(senior ? [{ to: "/team", label: me.role === "editor" ? "My reporters" : "Team", icon: <Users className="size-[18px]" /> }] : []),
    { to: "/stats", label: "Numbers", icon: <BarChart3 className="size-[18px]" /> },
  ];

  return (
    <div className="flex h-dvh bg-white">
      <aside className="hidden w-[232px] shrink-0 flex-col border-r border-line bg-[#fbfbfd] md:flex">
        <div className="flex items-center gap-2.5 px-5 pt-5">
          <span className="flex size-8 items-center justify-center rounded-lg bg-brand font-serif text-[17px] font-semibold text-white" aria-hidden="true">N</span>
          <div className="leading-tight">
            <p className="text-[14px] font-semibold">News APP</p>
            <p className="text-[12px] text-muted">Newsroom</p>
          </div>
        </div>
        <div className="px-3 pt-5">
          <Link to="/write" className="flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-brand text-[14px] font-semibold text-white hover:bg-brand-deep">
            <PenSquare className="size-4" aria-hidden="true" /> Write a story
          </Link>
        </div>
        <nav aria-label="Main" className="mt-4 flex-1 space-y-0.5 overflow-y-auto px-3">
          {nav.map((n) => (
            <SideLink key={n.to} item={n} />
          ))}
        </nav>
        <div className="px-3 pb-2">
          <InstallPrompt variant="sidebar" />
        </div>
        <div className="border-t border-line p-3">
          <Link to="/settings" className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 hover:bg-wash">
            <Avatar person={me} size={32} />
            <span className="min-w-0 flex-1 leading-tight">
              <span className="block truncate text-[13px] font-medium">{me.name}</span>
              <span className="block truncate text-[12px] text-muted">{ROLE_LABEL[me.role]}{me.trusted ? " · trusted" : ""}</span>
            </span>
            <Settings className="size-4 text-faint" aria-hidden="true" />
          </Link>
          <button type="button" onClick={signOut} className="mt-1 flex h-9 w-full items-center gap-2 rounded-lg px-2 text-[13px] text-muted hover:bg-wash hover:text-ink">
            <LogOut className="size-4" aria-hidden="true" /> Sign out
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col overflow-y-auto" id="scroll-root">
        <Topbar />
        <main className="mx-auto w-full max-w-[1000px] flex-1 px-4 pb-28 pt-5 sm:px-8 sm:pt-7 md:pb-12">
          <Outlet />
        </main>
      </div>

      {/* Phones: bottom tabs with Write in the middle, one thumb away. */}
      <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-30 flex items-end justify-around border-t border-line bg-white/95 px-1 pb-[max(6px,env(safe-area-inset-bottom))] pt-1.5 backdrop-blur md:hidden">
        {nav.slice(0, 2).map((n) => (
          <TabLink key={n.to} item={n} />
        ))}
        <Link to="/write" aria-label="Write a story" className="-mt-5 flex size-14 items-center justify-center rounded-full bg-brand text-white shadow-[0_6px_20px_rgba(60,99,237,0.45)] active:scale-95">
          <PenSquare className="size-6" aria-hidden="true" />
        </Link>
        {nav.slice(2, 4).map((n) => (
          <TabLink key={n.to} item={n} />
        ))}
      </nav>

      <InstallPrompt variant="sheet" />

      <div className="pointer-events-none fixed inset-x-0 bottom-20 z-[60] flex flex-col items-center gap-2 px-4 md:bottom-5" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} role={t.tone === "error" ? "alert" : "status"} className={clsx("pointer-events-auto flex max-w-md items-start gap-3 rounded-xl px-4 py-3 text-[13.5px] shadow-lg", t.tone === "error" ? "bg-bad text-white" : "bg-ink text-white")}>
            <span className="flex-1">{t.text}</span>
            {t.action && (
              <button type="button" onClick={() => (t.action!.run(), dismiss(t.id))} className="font-semibold underline">
                {t.action.label}
              </button>
            )}
            <button type="button" onClick={() => dismiss(t.id)} aria-label="Dismiss" className="text-white/70 hover:text-white">
              <X className="size-4" />
            </button>
          </div>
        ))}
      </div>
      <ScrollTop key={location.pathname} />
    </div>
  );
}

function ScrollTop() {
  useEffect(() => {
    document.getElementById("scroll-root")?.scrollTo(0, 0);
  }, []);
  return null;
}

function SideLink({ item }: { item: NavItem }) {
  return (
    <NavLink
      to={item.to}
      end={item.end}
      className={({ isActive }) => clsx("flex h-9 items-center gap-2.5 rounded-lg px-2 text-[14px] font-medium transition-colors", isActive ? "bg-select text-ink" : "text-muted hover:bg-wash hover:text-ink")}
    >
      {item.icon}
      <span className="flex-1 truncate">{item.label}</span>
      {item.count ? <span className="rounded-full bg-brand px-1.5 text-[12px] font-semibold text-white">{item.count}</span> : null}
    </NavLink>
  );
}

function TabLink({ item }: { item: NavItem }) {
  return (
    <NavLink to={item.to} end={item.end} className={({ isActive }) => clsx("relative flex min-w-[60px] flex-col items-center gap-0.5 px-2 py-1 text-[11px] font-medium", isActive ? "text-brand" : "text-muted")}>
      {item.icon}
      {item.label}
      {item.count ? <span className="absolute right-2 top-0 min-w-4 rounded-full bg-bad px-1 text-center text-[10px] font-semibold text-white">{item.count}</span> : null}
    </NavLink>
  );
}

function Topbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [q, setQ] = useState(() => new URLSearchParams(location.search).get("q") ?? "");
  useEffect(() => {
    if (location.pathname === "/stories") setQ(new URLSearchParams(location.search).get("q") ?? "");
  }, [location.pathname, location.search]);
  return (
    <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-2 border-b border-line bg-white/95 px-4 backdrop-blur sm:px-8">
      <span className="flex size-8 items-center justify-center rounded-lg bg-brand font-serif text-[16px] font-semibold text-white md:hidden" aria-hidden="true">N</span>
      <form
        role="search"
        className="relative min-w-0 max-w-md flex-1"
        onSubmit={(e) => {
          e.preventDefault();
          const params = new URLSearchParams(location.pathname === "/stories" ? location.search : "");
          if (q.trim()) params.set("q", q.trim());
          else params.delete("q");
          navigate(`/stories?${params}`);
        }}
      >
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-faint" aria-hidden="true" />
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search stories"
          aria-label="Search stories"
          className="h-9 w-full rounded-lg border border-line bg-wash pl-9 pr-3 text-[14px] focus:border-brand focus:bg-white focus:outline-none"
        />
      </form>
      <span className="flex-1" />
      <NoticeBell />
      <Link to="/settings" aria-label="Settings" className="flex size-9 items-center justify-center rounded-lg text-muted hover:bg-wash md:hidden">
        <Settings className="size-5" aria-hidden="true" />
      </Link>
    </header>
  );
}

function NoticeBell() {
  const { unread, refresh } = useSession();
  const [open, setOpen] = useState(false);
  const { data, mutate } = useNotices(open);
  const navigate = useNavigate();
  useEffect(() => {
    if (!open || !unread) return;
    void readNotices().then(() => {
      refresh();
      refreshLists();
    });
  }, [open, unread, refresh]);
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => (setOpen((o) => !o), void mutate())}
        aria-label={unread ? `Notifications, ${unread} new` : "Notifications"}
        aria-expanded={open}
        className="relative flex size-9 items-center justify-center rounded-lg text-muted hover:bg-wash hover:text-ink"
      >
        <Bell className="size-5" aria-hidden="true" />
        {unread > 0 && <span className="absolute right-1 top-1 min-w-4 rounded-full bg-bad px-1 text-[10px] font-semibold leading-4 text-white">{unread > 9 ? "9+" : unread}</span>}
      </button>
      {open && (
        <>
          <button type="button" aria-label="Close notifications" tabIndex={-1} className="fixed inset-0 z-30 cursor-default" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-11 z-40 w-[min(360px,calc(100vw-24px))] overflow-hidden rounded-2xl border border-line bg-white shadow-xl">
            <p className="border-b border-line px-4 py-2.5 text-[13px] font-semibold">Notifications</p>
            <ul className="max-h-[60vh] overflow-y-auto">
              {!data && <li className="px-4 py-6 text-center text-[13px] text-muted">Loading…</li>}
              {data?.length === 0 && <li className="px-4 py-6 text-center text-[13px] text-muted">Nothing yet. You will hear here when a story needs you.</li>}
              {data?.map((n) => (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setOpen(false);
                      navigate(n.article_id ? `/stories/${n.article_id}` : n.kind === "request" || n.kind === "joined" ? "/team" : "/");
                    }}
                    className={clsx("flex w-full gap-2.5 px-4 py-3 text-left hover:bg-wash", !n.read && "bg-brand-soft/40")}
                  >
                    <span className={clsx("mt-1.5 size-2 shrink-0 rounded-full", n.kind === "breaking" ? "bg-bad" : n.read ? "bg-transparent" : "bg-brand")} />
                    <span className="min-w-0 flex-1">
                      <span className="block text-[13.5px] text-ink">{n.text}</span>
                      <span className="block text-[12px] text-faint">{timeAgo(n.at)}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
