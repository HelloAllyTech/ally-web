import type {
  CopilotProgressEvent,
  CopilotProgressEventStatus,
  CopilotRun,
} from "@api";

import type {
  FeedEntry,
  FeedEntryStatus,
  FieldProgressEntry,
  StatusEntry,
} from "./feedEntry.types";

// Inlined (not imported from @api) so this pure module stays free of the RTK
// store graph and is cheap to unit-test in isolation.
const TERMINAL_STATUSES: ReadonlyArray<CopilotRun["status"]> = [
  "SUCCEEDED",
  "FAILED",
  "CANCELLED",
];

const mapStatus = (status: CopilotProgressEventStatus): FeedEntryStatus => {
  if (status === "failed") return "error";
  if (status === "started") return "active";
  return "done"; // completed | skipped | info
};

const stripVerb = (label: string): string =>
  label
    .replace(/^Generating\s+/i, "")
    .replace(/^Generated\s+/i, "")
    .replace(/^Skipped\s+/i, "");

const segRoundKey = (segment: number, round: number): string =>
  `${segment}:${round}`;

/**
 * Derive the ordered chat feed from a polled run plus the client-tracked full
 * text of each revise turn. Pure + idempotent: identical input → identical
 * output, keyed deterministically so React reconciles in place.
 *
 * @param run          the latest polled CopilotRun (undefined before any run)
 * @param reviseTexts  full instruction text per revise turn, index 0 = segment 1
 */
export function deriveFeed(
  run: CopilotRun | undefined,
  reviseTexts: string[] = [],
): FeedEntry[] {
  if (!run) return [];

  const events = [...(run.progressLog ?? [])].sort((a, b) => a.seq - b.seq);
  const terminal = TERMINAL_STATUSES.includes(run.status);

  // reportId -> markdown/metrics, for enriching round entries from history.
  const reportMarkdownById = new Map<string, string>();
  const metricsById = new Map<string, Record<string, number>>();
  for (const h of run.roundHistory ?? []) {
    if (h.reportId && h.reportMarkdown) reportMarkdownById.set(h.reportId, h.reportMarkdown);
    if (h.reportId && h.metrics) metricsById.set(h.reportId, h.metrics);
  }

  // (segment,round) that have a score — used to settle the "agents are talking"
  // line once its round is scored.
  const scoredRounds = new Set<string>();
  for (const ev of events) {
    if (ev.kind === "round_scored") scoredRounds.add(segRoundKey(ev.segment, ev.round));
  }

  const entries: FeedEntry[] = [];
  const fieldEntries = new Map<string, FieldProgressEntry>();
  const baseEntries = new Map<string, StatusEntry>();

  const pointInTime = (
    ev: CopilotProgressEvent,
    tone: StatusEntry["tone"] = "default",
    isHeader = false,
  ): StatusEntry => ({
    kind: "status",
    id: ev.id,
    order: ev.seq,
    segment: ev.segment,
    round: ev.round,
    label: ev.label,
    status: "done",
    tone,
    isHeader,
  });

  // Initial brief bubble — always available from run.brief, pinned to the top.
  entries.push({
    kind: "user-message",
    id: "user:0",
    order: -0.5,
    segment: 0,
    text: run.brief,
    turnKind: "brief",
  });

  for (const ev of events) {
    switch (ev.kind) {
      case "run_started":
      case "draft_provisioned":
      case "generation_completed":
        entries.push(pointInTime(ev));
        break;
      case "round_started":
        entries.push(pointInTime(ev, "default", true));
        break;
      case "refining":
        entries.push(pointInTime(ev, "info"));
        break;
      case "evaluation_started":
        entries.push({
          ...pointInTime(ev),
          status: "active",
          reportId: ev.payload?.reportId,
          awaitScoreRound: ev.round,
        });
        break;
      case "base_generation": {
        const key = segRoundKey(ev.segment, ev.round) + ":base";
        const existing = baseEntries.get(key);
        if (existing) {
          existing.status = mapStatus(ev.status);
          existing.label = ev.label;
          existing.tone = ev.status === "failed" ? "error" : "default";
        } else {
          const entry: StatusEntry = {
            kind: "status",
            id: `${key}`,
            order: ev.seq,
            segment: ev.segment,
            round: ev.round,
            label: ev.label,
            status: mapStatus(ev.status),
            tone: ev.status === "failed" ? "error" : "default",
          };
          baseEntries.set(key, entry);
          entries.push(entry);
        }
        break;
      }
      case "field_generation": {
        const key = segRoundKey(ev.segment, ev.round) + ":fields";
        let entry = fieldEntries.get(key);
        if (!entry) {
          entry = {
            kind: "field-progress",
            id: key,
            order: ev.seq,
            segment: ev.segment,
            round: ev.round,
            fields: [],
          };
          fieldEntries.set(key, entry);
          entries.push(entry);
        }
        const fieldName = ev.payload?.fieldName ?? ev.label;
        const item = entry.fields.find(f => f.fieldName === fieldName);
        if (item) {
          item.status = mapStatus(ev.status);
        } else {
          entry.fields.push({ fieldName, label: stripVerb(ev.label), status: mapStatus(ev.status) });
        }
        break;
      }
      case "round_scored": {
        const reportId = ev.payload?.reportId;
        entries.push({
          kind: "round",
          id: ev.id,
          order: ev.seq,
          segment: ev.segment,
          round: ev.round,
          score: ev.payload?.score ?? null,
          metrics: ev.payload?.metrics ?? (reportId ? metricsById.get(reportId) : undefined),
          reportId,
          reportMarkdown: reportId ? reportMarkdownById.get(reportId) : undefined,
        });
        break;
      }
      case "revise_requested": {
        const text =
          reviseTexts[ev.segment - 1] ??
          ev.label.replace(/^Revision requested:\s*/i, "");
        entries.push({
          kind: "user-message",
          id: `user:${ev.segment}`,
          order: ev.seq - 0.5,
          segment: ev.segment,
          text,
          turnKind: "revise",
        });
        break;
      }
      case "succeeded":
      case "failed":
      case "cancelled":
        entries.push({
          kind: "terminal",
          id: ev.id,
          order: ev.seq,
          segment: ev.segment,
          outcome: ev.kind,
          score: ev.payload?.score ?? null,
          label: ev.label,
          reason: ev.payload?.reason,
        });
        break;
      case "tier_completed":
      default:
        break; // not rendered as its own entry
    }
  }

  // Settle lingering "active" entries: the evaluation line once its round is
  // scored, and everything once the run reaches a terminal state.
  for (const e of entries) {
    if (e.kind === "status" && e.status === "active") {
      if (terminal) {
        e.status = "done";
      } else if (
        e.awaitScoreRound != null &&
        scoredRounds.has(segRoundKey(e.segment, e.awaitScoreRound))
      ) {
        e.status = "done";
      }
    }
    if (e.kind === "field-progress" && terminal) {
      e.fields = e.fields.map(f => (f.status === "active" ? { ...f, status: "done" } : f));
    }
  }

  return entries.sort((a, b) => a.order - b.order);
}
