import { describe, expect, it } from "vitest";

import type { CopilotProgressEvent, CopilotRun } from "@api";

import { deriveFeed } from "./copilotFeedReducer";
import type { FieldProgressEntry, RoundEntry, StatusEntry } from "./feedEntry.types";

let seq = 0;
const reset = () => {
  seq = 0;
};
const ev = (
  kind: CopilotProgressEvent["kind"],
  status: CopilotProgressEvent["status"],
  extra: Partial<CopilotProgressEvent> & { label?: string } = {},
): CopilotProgressEvent => ({
  id: `e${seq}`,
  seq: seq++,
  at: "2026-06-21T00:00:00.000Z",
  round: extra.round ?? 1,
  segment: extra.segment ?? 0,
  kind,
  status,
  label: extra.label ?? kind,
  payload: extra.payload,
});

const makeRun = (over: Partial<CopilotRun>): CopilotRun =>
  ({
    id: "run-1",
    status: "GENERATING",
    brief: "Build an anxious new mother",
    round: 1,
    config: { provider: "openai", languageId: 1, languageCode: "en-IN", turns: 20 },
    progressLog: [],
    roundHistory: [],
    createdAt: "",
    updatedAt: "",
    ...over,
  }) as CopilotRun;

describe("deriveFeed", () => {
  it("returns an empty feed for an undefined run", () => {
    expect(deriveFeed(undefined)).toEqual([]);
  });

  it("always pins the initial brief bubble to the very top", () => {
    reset();
    const feed = deriveFeed(makeRun({ progressLog: [ev("run_started", "started", { round: 0 })] }));
    expect(feed[0]).toMatchObject({
      kind: "user-message",
      turnKind: "brief",
      text: "Build an anxious new mother",
    });
    expect(feed[0].order).toBeLessThan(0);
  });

  it("orders activity entries by seq", () => {
    reset();
    const run = makeRun({
      progressLog: [
        ev("run_started", "started", { round: 0, label: "Starting agent build" }),
        ev("round_started", "started", { label: "Building the agent" }),
        ev("generation_completed", "completed", { label: "Applied generated settings" }),
      ],
    });
    const feed = deriveFeed(run);
    const labels = feed.filter(e => e.kind === "status").map(e => (e as StatusEntry).label);
    expect(labels).toEqual(["Starting agent build", "Building the agent", "Applied generated settings"]);
  });

  it("collapses repeated field events into one group with the latest per-field status", () => {
    reset();
    const run = makeRun({
      progressLog: [
        ev("field_generation", "started", { label: "Generating linguistic style samples", payload: { fieldName: "LINGUISTIC_STYLE_SAMPLES" } }),
        ev("field_generation", "started", { label: "Generating conversation states", payload: { fieldName: "STATES" } }),
        ev("field_generation", "completed", { label: "Generated linguistic style samples", payload: { fieldName: "LINGUISTIC_STYLE_SAMPLES" } }),
        ev("field_generation", "failed", { label: "Skipped conversation states — generation failed", payload: { fieldName: "STATES" } }),
      ],
    });
    const group = deriveFeed(run).find(e => e.kind === "field-progress") as FieldProgressEntry;
    expect(group.fields).toHaveLength(2);
    expect(group.fields.find(f => f.fieldName === "LINGUISTIC_STYLE_SAMPLES")?.status).toBe("done");
    expect(group.fields.find(f => f.fieldName === "STATES")?.status).toBe("error");
    expect(group.fields.find(f => f.fieldName === "LINGUISTIC_STYLE_SAMPLES")?.label).toBe("linguistic style samples");
  });

  it("settles the 'agents are talking' line to done once its round is scored", () => {
    reset();
    const evalEvent = ev("evaluation_started", "started", { label: "Agents are talking", payload: { reportId: "rep-1" } });
    const scored = ev("round_scored", "completed", { label: "Scored round 1 — 80/100", payload: { score: 80, reportId: "rep-1" } });
    const feed = deriveFeed(makeRun({ status: "REFINING", progressLog: [evalEvent, scored] }));
    const evalEntry = feed.find(e => e.kind === "status" && (e as StatusEntry).reportId === "rep-1") as StatusEntry;
    expect(evalEntry.status).toBe("done");
    const round = feed.find(e => e.kind === "round") as RoundEntry;
    expect(round.score).toBe(80);
    expect(round.reportId).toBe("rep-1");
  });

  it("keeps the evaluation line active while the round is still unscored", () => {
    reset();
    const run = makeRun({
      status: "EVALUATING",
      progressLog: [ev("evaluation_started", "started", { payload: { reportId: "rep-1" } })],
    });
    const evalEntry = deriveFeed(run).find(e => e.kind === "status" && (e as StatusEntry).reportId) as StatusEntry;
    expect(evalEntry.status).toBe("active");
  });

  it("flips lingering active entries to done when the run is terminal", () => {
    reset();
    const run = makeRun({
      status: "FAILED",
      progressLog: [
        ev("base_generation", "started", { label: "Writing the role" }),
        ev("evaluation_started", "started", { payload: { reportId: "rep-1" } }),
        ev("failed", "failed", { label: "Build failed", payload: { reason: "boom" } }),
      ],
    });
    const feed = deriveFeed(run);
    const active = feed.filter(e => e.kind === "status" && (e as StatusEntry).status === "active");
    expect(active).toHaveLength(0);
    expect(feed.find(e => e.kind === "terminal")).toMatchObject({ outcome: "failed", reason: "boom" });
  });

  it("enriches a round entry with reportMarkdown from roundHistory by reportId", () => {
    reset();
    const run = makeRun({
      status: "SUCCEEDED",
      progressLog: [ev("round_scored", "completed", { payload: { score: 92, reportId: "rep-9" } })],
      roundHistory: [{ round: 1, score: 92, reportId: "rep-9", reportMarkdown: "# Great job" }],
    });
    const round = deriveFeed(run).find(e => e.kind === "round") as RoundEntry;
    expect(round.reportMarkdown).toBe("# Great job");
  });

  it("inserts a revise user bubble before the revise round and prefers client text", () => {
    reset();
    const run = makeRun({
      status: "GENERATING",
      progressLog: [
        ev("run_started", "started", { round: 0 }),
        ev("succeeded", "completed", { payload: { score: 91 } }),
        ev("revise_requested", "info", { round: 0, segment: 1, label: "Revision requested: make her guarded" }),
        ev("round_started", "started", { segment: 1, label: "Building the agent" }),
      ],
    });
    const feed = deriveFeed(run, ["Make her much more guarded and slower to open up about the real issue"]);
    const bubbles = feed.filter(e => e.kind === "user-message");
    expect(bubbles).toHaveLength(2);
    const revise = bubbles[1];
    expect(revise).toMatchObject({ segment: 1, turnKind: "revise" });
    expect((revise as { text: string }).text).toContain("guarded and slower");
    // the revise bubble sorts before the revise round_started
    const reviseIdx = feed.indexOf(revise);
    const roundStartedIdx = feed.findIndex(e => e.kind === "status" && (e as StatusEntry).segment === 1);
    expect(reviseIdx).toBeLessThan(roundStartedIdx);
  });

  it("falls back to the truncated event label when no client text is available", () => {
    reset();
    const run = makeRun({
      progressLog: [ev("revise_requested", "info", { round: 0, segment: 1, label: "Revision requested: make her guarded" })],
    });
    const revise = deriveFeed(run).find(e => e.kind === "user-message" && (e as { segment: number }).segment === 1);
    expect((revise as { text: string }).text).toBe("make her guarded");
  });

  it("is idempotent — deriving twice yields deeply equal feeds", () => {
    reset();
    const run = makeRun({
      status: "SUCCEEDED",
      progressLog: [
        ev("run_started", "started", { round: 0 }),
        ev("round_started", "started"),
        ev("base_generation", "started"),
        ev("base_generation", "completed"),
        ev("field_generation", "started", { payload: { fieldName: "STATES" } }),
        ev("field_generation", "completed", { payload: { fieldName: "STATES" } }),
        ev("evaluation_started", "started", { payload: { reportId: "rep-1" } }),
        ev("round_scored", "completed", { payload: { score: 92, reportId: "rep-1" } }),
        ev("succeeded", "completed", { payload: { score: 92 } }),
      ],
    });
    expect(deriveFeed(run)).toEqual(deriveFeed(run));
  });
});
