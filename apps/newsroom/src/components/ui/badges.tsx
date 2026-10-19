import { Siren } from "lucide-react";
import { STATUS_LABEL, type Priority, type Status } from "@/domain/types";
import { Pill } from "./primitives";

export function StatusPill({ status }: { status: Status }) {
  const tone =
    status === "published" ? "good"
    : status === "submitted" ? "brand"
    : status === "changes_requested" ? "warn"
    : status === "rejected" || status === "unpublished" ? "bad"
    : "neutral";
  return <Pill tone={tone}>{STATUS_LABEL[status]}</Pill>;
}

export function BreakingPill({ priority }: { priority: Priority }) {
  if (priority !== "breaking") return null;
  return (
    <Pill tone="bad">
      <Siren className="size-3" aria-hidden="true" />
      Breaking
    </Pill>
  );
}
