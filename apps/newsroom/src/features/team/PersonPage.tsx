import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, KeyRound, Mail } from "lucide-react";
import { resendInvite, resetLinkFor, updatePerson, useArticles, useTeam, type PersonPatch } from "@/api/desk";
import { errorText } from "@/api/http";
import { STATES, districtsOf } from "@/domain/places";
import { ROLE_LABEL, type Role } from "@/domain/types";
import { useSession } from "@/state/session";
import { Avatar, Button, Card, CardTitle, EmptyState, Pill, Toggle, selectCls, timeAgo } from "@/components/ui/primitives";
import { StoryList } from "@/features/stories/StoryRow";
import { ShareLink } from "./ShareLink";
import { placeOf } from "./TeamPage";

export default function PersonPage() {
  const { id } = useParams();
  const { me, toast } = useSession();
  const { data, mutate } = useTeam();
  const person = data?.find((p) => p.id === id);
  const stories = useArticles({ view: "all", author: id, limit: 20 });
  const [link, setLink] = useState<{ kind: "invite" | "reset"; url: string } | null>(null);

  if (!data) return <div className="h-40 animate-pulse rounded-2xl bg-wash" />;
  if (!person) return <EmptyState title="Person not found" body="They may have been removed, or you cannot see them." />;

  const admin = me.role === "admin";
  const manage = !!person.canManage;
  const editors = data.filter((p) => (p.role === "editor" || p.role === "admin") && p.status === "active");
  const editor = data.find((p) => p.id === person.reportsTo);

  const change = async (patch: PersonPatch, done: string) => {
    try {
      await updatePerson(person.id, patch);
      void mutate();
      toast(done, "success");
    } catch (err) {
      toast(errorText(err), "error");
    }
  };

  return (
    <div className="space-y-5">
      <Link to="/team" className="inline-flex items-center gap-1 text-[13px] text-muted hover:text-ink">
        <ArrowLeft className="size-4" aria-hidden="true" /> Team
      </Link>
      <div className="flex items-center gap-4">
        <Avatar person={person} size={56} />
        <div className="min-w-0">
          <h1 className="text-[24px] leading-tight">{person.name}</h1>
          <p className="text-[14px] text-muted">{[ROLE_LABEL[person.role], person.jobTitle, placeOf(person)].filter(Boolean).join(" · ")}</p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {person.status === "invited" && <Pill>Invite not accepted yet</Pill>}
            {person.status === "suspended" && <Pill tone="bad">Suspended</Pill>}
            {person.trusted && <Pill tone="good">Trusted</Pill>}
          </div>
        </div>
      </div>

      <Card className="p-4 sm:p-5">
        <CardTitle>Details</CardTitle>
        <dl className="grid grid-cols-[120px_1fr] gap-x-3 gap-y-2.5 text-[14px]">
          {person.email && (
            <>
              <dt className="text-muted">Email</dt>
              <dd className="truncate"><a className="text-brand hover:underline" href={`mailto:${person.email}`}>{person.email}</a></dd>
            </>
          )}
          {person.role === "reporter" && (
            <>
              <dt className="text-muted">Editor</dt>
              <dd>
                {admin ? (
                  <select aria-label="Editor" className={selectCls} value={person.reportsTo} onChange={(e) => void change({ reports_to: e.target.value }, "Editor changed.")}>
                    <option value="">No editor</option>
                    {editors.map((e) => (
                      <option key={e.id} value={e.id}>{e.name}</option>
                    ))}
                  </select>
                ) : (
                  editor?.name ?? "None"
                )}
              </dd>
            </>
          )}
          {admin && manage && (
            <>
              <dt className="text-muted">Role</dt>
              <dd>
                <select aria-label="Role" className={selectCls} value={person.role} onChange={(e) => void change({ role: e.target.value as Role }, "Role changed.")}>
                  {(["reporter", "editor", "admin"] as Role[]).map((r) => (
                    <option key={r} value={r}>{ROLE_LABEL[r]}</option>
                  ))}
                </select>
              </dd>
            </>
          )}
          {manage && (
            <>
              <dt className="text-muted">Place</dt>
              <dd className="grid grid-cols-2 gap-2">
                <select aria-label="State" className={selectCls} value={person.homeState} onChange={(e) => void change({ home_state: e.target.value, home_district: "" }, "Place updated.")}>
                  <option value="">None</option>
                  {STATES.map((s) => (
                    <option key={s.code} value={s.code}>{s.en}</option>
                  ))}
                </select>
                <select aria-label="District" className={selectCls} value={person.homeDistrict} disabled={!districtsOf(person.homeState).length} onChange={(e) => void change({ home_district: e.target.value }, "Place updated.")}>
                  <option value="">None</option>
                  {districtsOf(person.homeState).map((d) => (
                    <option key={d.key} value={d.key}>{d.en}</option>
                  ))}
                </select>
              </dd>
            </>
          )}
          <dt className="text-muted">Last signed in</dt>
          <dd>{person.lastLoginAt ? timeAgo(person.lastLoginAt) : "Never"}</dd>
        </dl>

        {manage && person.role === "reporter" && person.status === "active" && (
          <label className="mt-4 flex items-start justify-between gap-3 rounded-xl border border-line px-3 py-2.5">
            <span className="text-[13.5px]">
              <span className="block font-medium">Trusted: publishes directly</span>
              <span className="block text-muted">Their stories go live straight away; you read them afterwards under Review.</span>
            </span>
            <Toggle label="Trusted" checked={person.trusted} onChange={(v) => void change({ trusted: v }, v ? "Now publishes directly." : "Stories go to review again.")} />
          </label>
        )}

        {manage && (
          <div className="mt-4 flex flex-wrap gap-2">
            {person.status === "invited" && (
              <Button onClick={() => void resendInvite(person.id).then((r) => setLink({ kind: "invite", url: r.invite_link })).catch((e) => toast(errorText(e), "error"))}>
                <Mail className="size-4" aria-hidden="true" /> New invite link
              </Button>
            )}
            {person.status === "active" && (
              <Button onClick={() => void resetLinkFor(person.id).then((r) => setLink({ kind: "reset", url: r.reset_link })).catch((e) => toast(errorText(e), "error"))}>
                <KeyRound className="size-4" aria-hidden="true" /> Password reset link
              </Button>
            )}
            {person.status === "active" && (
              <Button variant="danger" onClick={() => window.confirm(`Suspend ${person.name}? They are signed out at once and cannot sign in.`) && void change({ status: "suspended" }, "Suspended.")}>
                Suspend
              </Button>
            )}
            {person.status === "suspended" && <Button onClick={() => void change({ status: "active" }, "Active again.")}>Reactivate</Button>}
          </div>
        )}
        {link && (
          <div className="mt-4 rounded-xl bg-wash p-3">
            <p className="mb-2 text-[13px]">{link.kind === "invite" ? "Send this new invite link. Older links stop working." : "Send this link so they can choose a new password. It works for 24 hours."}</p>
            <ShareLink link={link.url} message={link.kind === "invite" ? "Your News APP Newsroom invite:" : "Reset your News APP Newsroom password:"} />
          </div>
        )}
      </Card>

      <Card className="p-4 sm:p-5">
        <CardTitle>Recent stories</CardTitle>
        <StoryList items={stories.data?.items} hideAuthor empty={{ title: "No stories yet" }} />
      </Card>
    </div>
  );
}
