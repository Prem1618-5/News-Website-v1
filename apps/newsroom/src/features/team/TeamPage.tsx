/**
 * The team on one page. Editors see their reporters with one switch each (Trusted) and an Add button.
 * Admins see everyone grouped under their editor, plus people who asked to join.
 */
import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ChevronRight, UserPlus } from "lucide-react";
import { approvePerson, removePerson, updatePerson, useTeam } from "@/api/desk";
import { errorText } from "@/api/http";
import { districtName, stateName } from "@/domain/places";
import { ROLE_LABEL, type Staff } from "@/domain/types";
import { useSession } from "@/state/session";
import { Avatar, Button, Card, EmptyState, PageHeader, Pill, Tabs, Toggle, selectCls, timeAgo } from "@/components/ui/primitives";
import { AddPersonDialog } from "./AddPersonDialog";

export const placeOf = (p: Staff) => [districtName(p.homeState, p.homeDistrict), stateName(p.homeState)].filter(Boolean).join(", ");

export default function TeamPage() {
  const { me, toast } = useSession();
  const { data, mutate } = useTeam();
  const [params, setParams] = useSearchParams();
  const [adding, setAdding] = useState(params.get("add") === "1");
  const tab = params.get("tab") === "requests" ? "requests" : "people";
  const people = data ?? [];
  const pending = people.filter((p) => p.status === "pending");
  const editors = people.filter((p) => (p.role === "editor" || p.role === "admin") && p.status === "active");
  const admin = me.role === "admin";

  const trust = async (p: Staff, trusted: boolean) => {
    try {
      await updatePerson(p.id, { trusted });
      void mutate();
      toast(trusted ? `${p.name} now publishes directly.` : `${p.name}'s stories go to review again.`, "success");
    } catch (err) {
      toast(errorText(err), "error");
    }
  };

  const groups: { title: string; people: Staff[] }[] = admin
    ? [
        { title: "Editors and admins", people: people.filter((p) => p.role !== "reporter" && p.status !== "pending") },
        ...editors.map((e) => ({ title: `Reporters with ${e.name}`, people: people.filter((p) => p.role === "reporter" && p.reportsTo === e.id && p.status !== "pending") })),
        { title: "Reporters without an editor", people: people.filter((p) => p.role === "reporter" && !editors.some((e) => e.id === p.reportsTo) && p.status !== "pending") },
      ]
    : [
        { title: "Your reporters", people: people.filter((p) => p.role === "reporter" && p.reportsTo === me.id) },
        { title: "Everyone else", people: people.filter((p) => p.id !== me.id && !(p.role === "reporter" && p.reportsTo === me.id)) },
      ];

  return (
    <div>
      <PageHeader title={admin ? "Team" : "My reporters"} subtitle={admin ? "Add people, choose who edits whom, and who publishes directly." : "Reporters you add send their stories to you."}>
        <Button variant="primary" onClick={() => setAdding(true)}>
          <UserPlus className="size-4" aria-hidden="true" /> {admin ? "Add a person" : "Add a reporter"}
        </Button>
      </PageHeader>
      {admin && (
        <div className="mb-4">
          <Tabs
            label="Team view"
            value={tab}
            onChange={(v) => setParams(v === "people" ? {} : { tab: v }, { replace: true })}
            items={[{ id: "people", label: "People", count: people.length - pending.length }, { id: "requests", label: "Asking to join", count: pending.length }]}
          />
        </div>
      )}

      {tab === "requests" ? (
        <Requests pending={pending} editors={editors} onDone={() => void mutate()} />
      ) : (
        <div className="space-y-5">
          {groups.filter((g) => g.people.length).map((g) => (
            <Card key={g.title} className="p-3 sm:p-4">
              <h2 className="mb-1 px-1 text-[13px] font-medium text-muted">{g.title}</h2>
              <ul className="divide-y divide-line/70">
                {g.people.map((p) => (
                  <li key={p.id} className="flex items-center gap-3 px-1 py-2.5">
                    <Link to={`/team/${p.id}`} className="flex min-w-0 flex-1 items-center gap-3">
                      <Avatar person={p} size={36} />
                      <span className="min-w-0">
                        <span className="flex flex-wrap items-center gap-1.5 text-[14.5px] font-medium">
                          {p.name}
                          {p.id === me.id && <span className="text-[12px] font-normal text-faint">(you)</span>}
                          {p.status === "invited" && <Pill>Invited</Pill>}
                          {p.status === "suspended" && <Pill tone="bad">Suspended</Pill>}
                        </span>
                        <span className="block truncate text-[12.5px] text-muted">{[p.role !== "reporter" ? ROLE_LABEL[p.role] : p.jobTitle, placeOf(p)].filter(Boolean).join(" · ")}</span>
                      </span>
                    </Link>
                    {p.role === "reporter" && p.canManage && p.status === "active" && (
                      <label className="flex items-center gap-2 text-[12.5px] text-muted">
                        <span className="max-sm:hidden">Trusted</span>
                        <Toggle label={`${p.name} publishes directly`} checked={p.trusted} onChange={(v) => void trust(p, v)} />
                      </label>
                    )}
                    {p.role === "reporter" && !p.canManage && p.trusted && <Pill tone="good">Trusted</Pill>}
                    <Link to={`/team/${p.id}`} aria-label={`Open ${p.name}`} className="text-faint hover:text-ink">
                      <ChevronRight className="size-5" />
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          ))}
          {!people.length && <EmptyState title="No one here yet" body="Add your first reporter with the button above." />}
          <p className="px-1 text-[12.5px] text-muted">
            <b className="font-medium text-ink">Trusted</b> reporters publish straight away and their stories appear under Review → Published without review for a quick read. Everyone else sends stories to their editor.
          </p>
        </div>
      )}
      {adding && (
        <AddPersonDialog
          editors={editors}
          onClose={() => (setAdding(false), params.has("add") && setParams({}, { replace: true }))}
          onAdded={() => void mutate()}
        />
      )}
    </div>
  );
}

function Requests({ pending, editors, onDone }: { pending: Staff[]; editors: Staff[]; onDone: () => void }) {
  const { toast } = useSession();
  const [choice, setChoice] = useState<Record<string, { role: "reporter" | "editor"; reports_to: string }>>({});
  if (!pending.length) return <EmptyState title="No requests" body="People who ask to join from the sign-in page appear here." />;
  return (
    <Card className="p-3 sm:p-4">
      <ul className="divide-y divide-line/70">
        {pending.map((p) => {
          const c = choice[p.id] ?? { role: "reporter" as const, reports_to: "" };
          const setC = (patch: Partial<typeof c>) => setChoice((all) => ({ ...all, [p.id]: { ...c, ...patch } }));
          return (
            <li key={p.id} className="space-y-2 px-1 py-3">
              <div className="flex items-center gap-3">
                <Avatar person={p} size={36} />
                <span className="min-w-0 flex-1">
                  <span className="block text-[14.5px] font-medium">{p.name}</span>
                  <span className="block truncate text-[12.5px] text-muted">{p.email} · {p.jobTitle} · asked {timeAgo(p.createdAt)}</span>
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <select aria-label="Role" className={`${selectCls} w-auto`} value={c.role} onChange={(e) => setC({ role: e.target.value as "reporter" | "editor" })}>
                  <option value="reporter">Reporter</option>
                  <option value="editor">Editor</option>
                </select>
                {c.role === "reporter" && (
                  <select aria-label="Editor" className={`${selectCls} w-auto`} value={c.reports_to} onChange={(e) => setC({ reports_to: e.target.value })}>
                    <option value="">No editor yet</option>
                    {editors.map((e) => (
                      <option key={e.id} value={e.id}>{e.name}</option>
                    ))}
                  </select>
                )}
                <Button
                  variant="primary"
                  onClick={() =>
                    void approvePerson(p.id, c)
                      .then(() => (toast(`${p.name} can sign in now.`, "success"), onDone()))
                      .catch((e) => toast(errorText(e), "error"))
                  }
                >
                  Approve
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    if (!window.confirm(`Decline ${p.name}'s request?`)) return;
                    void removePerson(p.id).then(onDone).catch((e) => toast(errorText(e), "error"));
                  }}
                >
                  Decline
                </Button>
              </div>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
