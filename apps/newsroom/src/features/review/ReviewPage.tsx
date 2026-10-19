import { useSearchParams } from "react-router-dom";
import { useArticles } from "@/api/desk";
import { useSession } from "@/state/session";
import { Card, PageHeader, Tabs } from "@/components/ui/primitives";
import { StoryList } from "@/features/stories/StoryRow";

/** What needs an editor: stories sent for review (breaking first, then your reporters', oldest first) and
 *  stories trusted reporters published straight away, to read afterwards. */
export default function ReviewPage() {
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") === "checks" ? "checks" : "review";
  const { counts } = useSession();
  const review = useArticles({ view: "review", limit: 100 }, 20_000);
  const checks = useArticles({ view: "checks", limit: 100 }, 60_000);
  return (
    <div>
      <PageHeader title="Review" subtitle="Breaking news first, then your own reporters, then the longest waiting." />
      <div className="mb-4">
        <Tabs
          label="Queue"
          value={tab}
          onChange={(v) => setParams(v === "review" ? {} : { tab: v }, { replace: true })}
          items={[
            { id: "review", label: "Waiting for review", count: counts.to_review ?? review.data?.total },
            { id: "checks", label: "Published without review", count: counts.to_check ?? checks.data?.total },
          ]}
        />
      </div>
      <Card className="p-3 sm:p-4">
        {tab === "review" ? (
          <StoryList items={review.data?.items} show="waiting" empty={{ title: "All clear", body: "Nothing is waiting. New stories appear here as soon as they are sent." }} />
        ) : (
          <StoryList items={checks.data?.items} empty={{ title: "Nothing to check", body: "Stories that trusted reporters publish directly appear here for a quick read." }} />
        )}
      </Card>
    </div>
  );
}
