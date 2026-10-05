import { Siren } from "lucide-react";
import { STATUS_LABEL, URGENCY_LABEL, type ArticleStatus, type EffectiveMode, type Urgency } from "@/domain/types";
import { Pill } from "./primitives";

export function UrgencyPill({ urgency }: { urgency: Urgency }) {
  return (
    <Pill tone={urgency === 5 ? "bad" : urgency === 4 ? "warn" : "neutral"}>
      {urgency === 5 && <Siren className="size-3" aria-hidden="true" />}
      {urgency} · {URGENCY_LABEL[urgency]}
    </Pill>
  );
}

export function ModePill({ mode }: { mode: EffectiveMode }) {
  if (mode === "supervised") return <Pill tone="warn">Extra review</Pill>;
  if (mode === "auto") return <Pill tone="good">Publishes directly</Pill>;
  return <Pill>Needs approval</Pill>;
}

export function StatusPill({ status }: { status: ArticleStatus }) {
  const tone =
    status === "published" ? "good"
    : status === "published_pending_check" ? "brand"
    : status === "in_review" ? "brand"
    : status === "changes_requested" ? "warn"
    : status === "rejected" || status === "unpublished" ? "bad"
    : "neutral";
  return <Pill tone={tone}>{STATUS_LABEL[status]}</Pill>;
}
