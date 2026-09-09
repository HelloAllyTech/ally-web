import React from "react";

import { InlineLoading, Tag } from "@ally-ui-mono/ui-shared";
import { en } from "@constants";
import { KbDocumentStatus } from "@types";

/**
 * Visual grouping — the several in-flight statuses share one appearance, because the distinction
 * between "extracting" and "chunking" matters to nobody but the queue.
 *
 * Carbon Tag types rather than a hand-rolled colour map: the same three states are chipped this way
 * everywhere else in this admin, and a local map drifts from the palette the moment the theme moves.
 */
const TAG_TYPE: Record<KbDocumentStatus, "gray" | "blue" | "green" | "red"> = {
  [KbDocumentStatus.PENDING]: "gray",
  [KbDocumentStatus.EXTRACTING]: "blue",
  [KbDocumentStatus.CHUNKING]: "blue",
  [KbDocumentStatus.INDEXING]: "blue",
  [KbDocumentStatus.INDEXED]: "green",
  [KbDocumentStatus.FAILED]: "red",
};

/** The statuses that are still moving, and so earn a spinner rather than a static pill. */
const IN_FLIGHT: KbDocumentStatus[] = [
  KbDocumentStatus.PENDING,
  KbDocumentStatus.EXTRACTING,
  KbDocumentStatus.CHUNKING,
  KbDocumentStatus.INDEXING,
];

interface DocumentStatusBadgeProps {
  status: KbDocumentStatus;
  /**
   * The server's failure reason, verbatim.
   *
   * Rendered under the pill rather than hidden in a tooltip. A generic "Processing failed" makes an
   * encrypted PDF indistinguishable from an oversized one, and the admin reading this is the only
   * person who can fix either — so the specific reason is the useful part, not decoration.
   */
  statusMessage?: string | null;
}

export const DocumentStatusBadge: React.FC<DocumentStatusBadgeProps> = ({
  status,
  statusMessage,
}) => {
  const label = en.whatsappBot.corpus.status[status] ?? status;

  // An in-flight row gets a live spinner, not a static pill. The table polls while anything is
  // processing, so a motionless "Indexing" badge next to a table that is quietly refreshing reads as
  // a stuck document — which is the one thing this badge must not be ambiguous about.
  if (IN_FLIGHT.includes(status)) {
    return <InlineLoading description={label} status="active" />;
  }

  return (
    <div className="flex flex-col gap-1">
      <Tag type={TAG_TYPE[status] ?? "gray"} size="sm">
        {label}
      </Tag>
      {status === KbDocumentStatus.FAILED && statusMessage && (
        <span className="text-xs text-destructive-600 max-w-[320px] leading-snug">
          {statusMessage}
        </span>
      )}
    </div>
  );
};
