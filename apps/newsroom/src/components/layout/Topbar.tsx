import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, Menu, Search } from "lucide-react";
import { getStaff } from "@/domain/workflow";
import { useNewsroom } from "@/state/store";
import { timeAgo } from "@/components/ui/primitives";

export function Topbar({ onMenu }: { onMenu: () => void }) {
  const { state, actor } = useNewsroom();
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [bellOpen, setBellOpen] = useState(false);
  const bellRef = useRef<HTMLDivElement>(null);
  const mine = state.notices.filter((n) => n.toId === actor.id);

  useEffect(() => {
    if (!bellOpen) return;
    const h = (e: MouseEvent) => !bellRef.current?.contains(e.target as Node) && setBellOpen(false);
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [bellOpen]);

  return (
    <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-3 border-b border-line bg-white/95 px-4 backdrop-blur sm:px-8">
      <button onClick={onMenu} aria-label="Open menu" className="rounded-md p-1.5 text-muted hover:bg-wash md:hidden">
        <Menu className="size-5" />
      </button>
      <form
        role="search"
        className="relative max-w-[360px] flex-1"
        onSubmit={(e) => {
          e.preventDefault();
          navigate(`/articles?q=${encodeURIComponent(q)}`);
        }}
      >
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-faint" aria-hidden="true" />
        <input
          aria-label="Search articles"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search articles"
          className="h-9 w-full rounded-lg border border-line bg-wash pl-9 pr-3 text-[14px] placeholder:text-faint focus:border-brand focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand/20"
        />
      </form>
      <div className="ml-auto flex items-center gap-1" ref={bellRef}>
        <button
          onClick={() => setBellOpen((o) => !o)}
          aria-label={`Notifications${mine.length ? `, ${mine.length} new` : ""}`}
          aria-expanded={bellOpen}
          className="relative rounded-md p-2 text-muted hover:bg-wash hover:text-ink"
        >
          <Bell className="size-5" />
          {mine.length > 0 && <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-brand ring-2 ring-white" />}
        </button>
        {bellOpen && (
          <div className="absolute right-4 top-12 z-30 w-[320px] max-w-[calc(100vw-2rem)] rounded-xl border border-line bg-white p-2 shadow-xl sm:right-8">
            <p className="px-2 py-1.5 text-[12px] font-medium text-muted">Notices for you</p>
            {mine.length === 0 && <p className="px-2 py-4 text-[13px] text-muted">Nothing new.</p>}
            {mine.map((n) => (
              <div key={n.id} className="rounded-lg px-2 py-2 hover:bg-wash">
                <p className="text-[13px] text-ink">{n.body}</p>
                <p className="mt-0.5 text-[12px] text-muted">
                  {getStaff(state, n.fromId)?.name ?? "System"} · {timeAgo(n.at)}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </header>
  );
}
