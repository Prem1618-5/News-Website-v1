import { useSearchParams } from "react-router-dom";
import { Download, X } from "lucide-react";
import { useArticles, useTeam } from "@/api/desk";
import { targetLabel } from "@/domain/places";
import { SECTION_KEYS, SECTION_LABEL, STATUS_LABEL, isSenior, type ArticleSummary, type Status } from "@/domain/types";
import { useSession } from "@/state/session";
import { Button, Card, PageHeader, selectCls } from "@/components/ui/primitives";
import { StoryList } from "./StoryRow";

const STATUSES = Object.keys(STATUS_LABEL) as Status[];

function toCsv(rows: ArticleSummary[]): string {
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const head = ["Headline", "Status", "Priority", "Writer", "Desk", "For", "Languages", "Words", "Created", "Published", "Story link"];
  const body = rows.map((a) =>
    [a.headline, STATUS_LABEL[a.status], a.priority, a.author.name, SECTION_LABEL[a.section], targetLabel(a), a.languages.join("+"), a.words, a.created_at, a.published_at ?? "", a.slug ? `/story/${a.slug}` : ""]
      .map(esc)
      .join(","),
  );
  // Byte-order mark so Excel opens Hindi text correctly.
  return "﻿" + [head.map(esc).join(","), ...body].join("\r\n");
}

export default function StoriesPage() {
  const { me } = useSession();
  const senior = isSenior(me);
  const [params, setParams] = useSearchParams();
  const q = {
    view: senior && params.get("who") !== "mine" ? ("all" as const) : ("mine" as const),
    status: params.get("status") ?? undefined,
    section: params.get("desk") ?? undefined,
    author: params.get("author") ?? undefined,
    priority: (params.get("priority") as "breaking" | null) ?? undefined,
    q: params.get("q") ?? undefined,
    limit: 200,
  };
  const { data } = useArticles(q);
  const team = useTeam();
  const setParam = (k: string, v: string) => {
    const next = new URLSearchParams(params);
    if (v) next.set(k, v);
    else next.delete(k);
    setParams(next, { replace: true });
  };
  const filtered = [...params.keys()].some((k) => k !== "who");

  const exportCsv = () => {
    const blob = new Blob([toCsv(data?.items ?? [])], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `stories-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <PageHeader title={senior ? "Stories" : "My stories"} subtitle={data ? `${data.total} ${data.total === 1 ? "story" : "stories"}` : undefined}>
        <Button onClick={exportCsv} disabled={!data?.items.length}>
          <Download className="size-4" aria-hidden="true" /> Export CSV
        </Button>
      </PageHeader>
      <div className="mb-4 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
        {senior && (
          <select aria-label="Whose stories" className={`${selectCls} sm:w-auto`} value={params.get("who") ?? ""} onChange={(e) => setParam("who", e.target.value)}>
            <option value="">Everyone</option>
            <option value="mine">Only mine</option>
          </select>
        )}
        <select aria-label="Status" className={`${selectCls} sm:w-auto`} value={q.status ?? ""} onChange={(e) => setParam("status", e.target.value)}>
          <option value="">Any status</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>{STATUS_LABEL[s]}</option>
          ))}
        </select>
        <select aria-label="Desk" className={`${selectCls} sm:w-auto`} value={q.section ?? ""} onChange={(e) => setParam("desk", e.target.value)}>
          <option value="">Every desk</option>
          {SECTION_KEYS.map((k) => (
            <option key={k} value={k}>{SECTION_LABEL[k]}</option>
          ))}
        </select>
        {senior && (
          <select aria-label="Writer" className={`${selectCls} sm:w-auto`} value={q.author ?? ""} onChange={(e) => setParam("author", e.target.value)}>
            <option value="">Every writer</option>
            {(team.data ?? []).filter((p) => p.status === "active").map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        )}
        <select aria-label="Priority" className={`${selectCls} sm:w-auto`} value={q.priority ?? ""} onChange={(e) => setParam("priority", e.target.value)}>
          <option value="">Normal and breaking</option>
          <option value="breaking">Breaking only</option>
        </select>
        {filtered && (
          <Button variant="ghost" onClick={() => setParams(params.get("who") ? { who: params.get("who")! } : {}, { replace: true })}>
            <X className="size-4" aria-hidden="true" /> Clear
          </Button>
        )}
      </div>
      {q.q && <p className="mb-3 text-[13px] text-muted">Headlines matching “{q.q}”.</p>}
      <Card className="p-3 sm:p-4">
        <StoryList items={data?.items} hideAuthor={!senior} empty={{ title: filtered ? "No stories match" : "No stories yet", body: filtered ? "Try fewer filters." : "Write your first story with the button above." }} />
      </Card>
    </div>
  );
}
