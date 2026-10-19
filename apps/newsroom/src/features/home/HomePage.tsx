import { Link } from "react-router-dom";
import { Camera, ChevronRight, PenSquare, Siren, UserPlus } from "lucide-react";
import { useArticles, useTeam } from "@/api/desk";
import { isSenior, ROLE_LABEL } from "@/domain/types";
import { targetLabel } from "@/domain/places";
import { useSession } from "@/state/session";
import { Avatar, Card, CardTitle, Pill } from "@/components/ui/primitives";
import { StoryList } from "@/features/stories/StoryRow";

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

export default function HomePage() {
  const { me } = useSession();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[26px] font-normal tracking-tight sm:text-[28px]">{greeting()}, {me.name.split(" ")[0]}</h1>
        <p className="mt-0.5 text-[14px] text-muted">
          {ROLE_LABEL[me.role]}
          {me.homeState ? ` · ${targetLabel({ scope: me.homeDistrict ? "local" : "state", state: me.homeState, district: me.homeDistrict })}` : ""}
        </p>
      </div>
      <WriteCard />
      {isSenior(me) ? <DeskHome /> : <ReporterHome />}
    </div>
  );
}

function WriteCard() {
  const { me } = useSession();
  return (
    <section className="rounded-2xl bg-ink p-5 text-white sm:p-6">
      <p className="text-[18px] font-medium">Something happening?</p>
      <p className="mt-1 text-[14px] text-white/70">
        Take a photo, write the headline and a few lines, and {me.trusted || isSenior(me) ? "publish" : "send it to your editor"}. It saves as you type.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Link to="/write" className="inline-flex h-11 items-center gap-2 rounded-xl bg-brand px-5 text-[15px] font-semibold text-white hover:bg-brand-deep">
          <PenSquare className="size-5" aria-hidden="true" /> Write a story
        </Link>
        <Link to="/write" className="inline-flex h-11 items-center gap-2 rounded-xl bg-white/10 px-4 text-[14px] font-medium text-white hover:bg-white/20 sm:hidden">
          <Camera className="size-5" aria-hidden="true" /> Start with a photo
        </Link>
      </div>
    </section>
  );
}

function ReporterHome() {
  const { me } = useSession();
  const returned = useArticles({ view: "mine", status: "changes_requested,rejected" });
  const drafts = useArticles({ view: "mine", status: "draft", limit: 10 });
  const waiting = useArticles({ view: "mine", status: "submitted", limit: 10 });
  const live = useArticles({ view: "mine", status: "published", limit: 5 });
  const team = useTeam();
  const editor = team.data?.find((p) => p.id === me.reportsTo);
  return (
    <>
      {!!returned.data?.items.length && (
        <Card className="border-warn/40 p-4 sm:p-5">
          <CardTitle>Back to you</CardTitle>
          <StoryList items={returned.data.items} empty={{ title: "" }} hideAuthor />
        </Card>
      )}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-4 sm:p-5">
          <CardTitle action={<Link to="/stories?status=draft" className="text-[13px] text-brand hover:underline">All</Link>}>Drafts</CardTitle>
          <StoryList items={drafts.data?.items} empty={{ title: "No drafts", body: "Stories you start are saved here until you send them." }} hideAuthor />
        </Card>
        <Card className="p-4 sm:p-5">
          <CardTitle>Waiting for review</CardTitle>
          <StoryList items={waiting.data?.items} empty={{ title: "Nothing waiting", body: me.trusted ? "You publish directly; your editor checks afterwards." : "Stories you send appear here until your editor decides." }} show="waiting" hideAuthor />
        </Card>
      </div>
      <Card className="p-4 sm:p-5">
        <CardTitle action={<Link to="/stories?status=published" className="text-[13px] text-brand hover:underline">All</Link>}>Published recently</CardTitle>
        <StoryList items={live.data?.items} empty={{ title: "Nothing published yet" }} hideAuthor />
      </Card>
      <p className="text-[13px] text-muted">
        {editor ? (
          <>Your editor is <b className="font-medium text-ink">{editor.name}</b>.</>
        ) : (
          "You have no editor assigned yet; every editor can review your stories."
        )}{" "}
        {me.trusted ? <Pill tone="good">Trusted: you publish directly</Pill> : null}
      </p>
    </>
  );
}

function DeskHome() {
  const { me, counts } = useSession();
  const review = useArticles({ view: "review", limit: 8 }, 30_000);
  const checks = useArticles({ view: "checks", limit: 5 }, 60_000);
  const mine = useArticles({ view: "mine", status: "draft,changes_requested", limit: 5 });
  const team = useTeam();
  const reporters = (team.data ?? []).filter((p) => p.role === "reporter" && (me.role === "admin" || p.reportsTo === me.id) && p.status !== "pending");
  const pending = (team.data ?? []).filter((p) => p.status === "pending");
  const breaking = review.data?.items.filter((a) => a.priority === "breaking") ?? [];

  return (
    <>
      {breaking.length > 0 && (
        <Link to={`/stories/${breaking[0].id}`} className="flex items-center gap-3 rounded-2xl bg-bad px-4 py-3.5 text-white">
          <Siren className="size-5 shrink-0" aria-hidden="true" />
          <span className="min-w-0 flex-1">
            <span className="block text-[12px] font-semibold uppercase tracking-wide text-white/80">Breaking, waiting for you</span>
            <span className="block truncate text-[15px] font-medium">{breaking[0].headline || "Untitled story"}</span>
          </span>
          <ChevronRight className="size-5" aria-hidden="true" />
        </Link>
      )}
      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Card className="p-4 sm:p-5">
          <CardTitle action={<Link to="/review" className="text-[13px] text-brand hover:underline">Open the queue ({counts.to_review ?? 0})</Link>}>Waiting for review</CardTitle>
          <StoryList items={review.data?.items} empty={{ title: "Nothing waiting", body: "When a reporter sends a story, it appears here. Breaking news comes first." }} show="waiting" />
        </Card>
        <div className="space-y-6">
          <Card className="p-4 sm:p-5">
            <CardTitle action={<Link to="/team" className="text-[13px] text-brand hover:underline">Manage</Link>}>{me.role === "admin" ? "Reporters" : "My reporters"}</CardTitle>
            {reporters.length === 0 ? (
              <p className="text-[13px] text-muted">No reporters yet.</p>
            ) : (
              <ul className="space-y-2">
                {reporters.slice(0, 6).map((p) => (
                  <li key={p.id}>
                    <Link to={`/team/${p.id}`} className="flex items-center gap-2.5 rounded-lg px-1 py-1 hover:bg-wash">
                      <Avatar person={p} size={28} />
                      <span className="min-w-0 flex-1 truncate text-[14px]">{p.name}</span>
                      {p.status === "invited" && <Pill>Invited</Pill>}
                      {p.trusted && <Pill tone="good">Trusted</Pill>}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            <Link to="/team?add=1" className="mt-3 inline-flex h-9 items-center gap-2 rounded-lg border border-line px-3 text-[13px] font-medium hover:bg-wash">
              <UserPlus className="size-4" aria-hidden="true" /> Add a reporter
            </Link>
          </Card>
          {me.role === "admin" && pending.length > 0 && (
            <Card className="border-brand/30 p-4 sm:p-5">
              <CardTitle action={<Link to="/team?tab=requests" className="text-[13px] text-brand hover:underline">Review</Link>}>Asking to join</CardTitle>
              <p className="text-[14px]">{pending.map((p) => p.name).join(", ")}</p>
            </Card>
          )}
          {!!checks.data?.items.length && (
            <Card className="p-4 sm:p-5">
              <CardTitle action={<Link to="/review?tab=checks" className="text-[13px] text-brand hover:underline">All</Link>}>Published without review</CardTitle>
              <StoryList items={checks.data.items} empty={{ title: "" }} />
            </Card>
          )}
        </div>
      </div>
      {!!mine.data?.items.length && (
        <Card className="p-4 sm:p-5">
          <CardTitle>Your own drafts</CardTitle>
          <StoryList items={mine.data.items} empty={{ title: "" }} hideAuthor />
        </Card>
      )}
    </>
  );
}
