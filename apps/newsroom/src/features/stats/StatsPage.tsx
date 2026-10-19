import { useState } from "react";
import { Link } from "react-router-dom";
import { useStats } from "@/api/desk";
import { isSenior } from "@/domain/types";
import { useSession } from "@/state/session";
import { Avatar, Card, CardTitle, EmptyState, PageHeader, Segmented } from "@/components/ui/primitives";

/** Only numbers we really have: stories per person, how long review takes, and reader opens (from readers
 *  who allowed analytics). Nothing is estimated or made up. */
export default function StatsPage() {
  const { me } = useSession();
  const [days, setDays] = useState<"7" | "30" | "90">("30");
  const { data } = useStats(Number(days));
  const max = Math.max(1, ...(data?.people.map((p) => p.published) ?? [1]));
  return (
    <div className="space-y-5">
      <PageHeader title="Numbers" subtitle={isSenior(me) ? (me.role === "admin" ? "The whole newsroom." : "You and your reporters.") : "Your stories."}>
        <Segmented label="Period" value={days} onChange={setDays} items={[{ id: "7", label: "7 days" }, { id: "30", label: "30 days" }, { id: "90", label: "90 days" }]} />
      </PageHeader>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Tile label="Published" value={data ? String(data.published) : "…"} />
        <Tile label="Sent to published" value={data ? (data.median_wait_min === null ? "–" : data.median_wait_min < 60 ? `${data.median_wait_min} min` : `${Math.round(data.median_wait_min / 60)} h`) : "…"} hint="median" />
        <Tile label="Reader opens" value={data ? String(data.views) : "…"} hint={data && !data.views_tracked ? "none counted yet" : "readers who allow analytics"} />
      </div>
      <Card className="p-4 sm:p-5">
        <CardTitle>People</CardTitle>
        {!data?.people.length ? (
          <EmptyState title="No one to show yet" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-[13.5px]">
              <thead>
                <tr className="text-left text-[12px] text-muted">
                  <th className="pb-2 font-medium">Name</th>
                  <th className="pb-2 font-medium">Published</th>
                  <th className="pb-2 text-right font-medium">Breaking</th>
                  <th className="pb-2 text-right font-medium">Waiting</th>
                  <th className="pb-2 text-right font-medium">Back with notes</th>
                  <th className="pb-2 text-right font-medium">Drafts</th>
                  <th className="pb-2 text-right font-medium">Opens</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/70">
                {data.people.map((r) => (
                  <tr key={r.person.id}>
                    <td className="py-2">
                      <Link to={isSenior(me) ? `/team/${r.person.id}` : "/stories"} className="flex items-center gap-2 hover:underline">
                        <Avatar person={r.person} size={24} /> {r.person.name}
                      </Link>
                    </td>
                    <td className="py-2">
                      <span className="flex items-center gap-2">
                        <span className="h-2 rounded-full bg-brand" style={{ width: `${(r.published / max) * 80 + 2}px` }} />
                        {r.published}
                      </span>
                    </td>
                    <td className="py-2 text-right tabular-nums">{r.breaking}</td>
                    <td className="py-2 text-right tabular-nums">{r.waiting}</td>
                    <td className="py-2 text-right tabular-nums">{r.returned}</td>
                    <td className="py-2 text-right tabular-nums">{r.drafts}</td>
                    <td className="py-2 text-right tabular-nums">{r.views}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      {!!data?.top.length && (
        <Card className="p-4 sm:p-5">
          <CardTitle>Most opened</CardTitle>
          <ol className="space-y-2 text-[14px]">
            {data.top.map((a, i) => (
              <li key={a.id} className="flex items-baseline gap-2">
                <span className="w-5 text-faint tabular-nums">{i + 1}</span>
                <Link to={`/stories/${a.id}`} className="min-w-0 flex-1 truncate hover:underline">{a.headline}</Link>
                <span className="tabular-nums text-muted">{a.views}</span>
              </li>
            ))}
          </ol>
        </Card>
      )}
    </div>
  );
}

function Tile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-line p-4">
      <p className="text-[12.5px] text-muted">{label}</p>
      <p className="mt-1 text-[26px] font-medium tabular-nums">{value}</p>
      {hint && <p className="text-[11.5px] text-faint">{hint}</p>}
    </div>
  );
}
