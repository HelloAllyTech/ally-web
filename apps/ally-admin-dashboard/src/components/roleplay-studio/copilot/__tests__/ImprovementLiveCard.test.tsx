import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

import {
  RoleplayImprovementRound,
  RoleplayImprovementRun,
  RoleplayImprovementRunDetail,
  RoleplayRehearsal,
} from "@src/types/roleplayStudio";

import { ImprovementLiveCard } from "../ImprovementLiveCard";

const run: RoleplayImprovementRun = {
  id: "run-1",
  specId: "spec-1",
  baseVersionId: "v0",
  status: "RUNNING",
  config: { maxRounds: 3, targets: { minOverall: 70 } },
  currentRound: 1,
};

const round = (over: Partial<RoleplayImprovementRound>): RoleplayImprovementRound => ({
  id: "r",
  improvementRunId: "run-1",
  roundNumber: 1,
  kind: "BASELINE",
  candidateVersionId: "v1",
  rehearsalRunId: null,
  status: "REHEARSING",
  fullScope: true,
  scores: null,
  deltas: null,
  proposalsAppliedCount: 0,
  ...over,
});

const detailWith = (rounds: RoleplayImprovementRound[]): RoleplayImprovementRunDetail => ({
  ...run,
  rounds,
  proposals: [],
});

const noop = () => {};

describe("ImprovementLiveCard", () => {
  it("shows round-of and live rehearsal sub-progress while rehearsing", () => {
    const r1 = round({ id: "r1", roundNumber: 1, status: "REHEARSING", rehearsalRunId: "reh-1" });
    const rehearsal = {
      id: "reh-1",
      status: "IN_PROGRESS",
      progress: { completed: 3, total: 6 },
    } as RoleplayRehearsal;

    render(
      <ImprovementLiveCard
        run={run}
        detail={detailWith([r1])}
        currentRound={r1}
        rehearsal={rehearsal}
        onCancel={noop}
        cancelling={false}
      />,
    );

    expect(screen.getByText(/Round 1 of 3/)).toBeInTheDocument();
    // Live per-unit sub-progress from the rehearsal socket.
    expect(screen.getByText("3 of 6 rehearsals complete")).toBeInTheDocument();
    // Phase stepper renders the Rehearse phase.
    expect(screen.getByText("Rehearse")).toBeInTheDocument();
    // Two pending rounds (2 and 3) in the activity log.
    expect(screen.getAllByText("Pending")).toHaveLength(2);
  });

  it("shows a completed round with score + fixes, current round doing, and best-vs-target", () => {
    const r1 = round({
      id: "r1",
      roundNumber: 1,
      kind: "BASELINE",
      status: "DONE",
      scores: {
        overall: 62,
        dimensions: {} as never,
        test_counts: { passed: 2, failed: 1, inconclusive: 0 },
      },
      proposalsAppliedCount: 2,
    });
    const r2 = round({
      id: "r2",
      roundNumber: 2,
      kind: "ITERATION",
      status: "CRITIQUING",
      scores: { overall: 68, dimensions: {} as never },
      proposalsAppliedCount: 0,
    });
    const runR2 = { ...run, currentRound: 2 };

    render(
      <ImprovementLiveCard
        run={runR2}
        detail={detailWith([r1, r2])}
        currentRound={r2}
        rehearsal={null}
        onCancel={noop}
        cancelling={false}
      />,
    );

    expect(screen.getByText(/Round 2 of 3/)).toBeInTheDocument();
    // Best-so-far is the max round overall (68), against the configured target.
    expect(screen.getByText("Best so far 68 · target 70")).toBeInTheDocument();
    // Completed round shows its score and applied fixes.
    expect(screen.getByText("62")).toBeInTheDocument();
    expect(screen.getByText("2 fixes applied")).toBeInTheDocument();
    // Current round is doing (Critiquing), one round still pending (round 3).
    expect(screen.getByText("Critiquing…")).toBeInTheDocument();
    expect(screen.getAllByText("Pending")).toHaveLength(1);
  });

  it("requires a two-click confirm before cancelling", () => {
    const onCancel = vi.fn();
    const r1 = round({ id: "r1", status: "REHEARSING", rehearsalRunId: "reh-1" });

    render(
      <ImprovementLiveCard
        run={run}
        detail={detailWith([r1])}
        currentRound={r1}
        rehearsal={null}
        onCancel={onCancel}
        cancelling={false}
      />,
    );

    const button = screen.getByRole("button");
    expect(button).toHaveTextContent("Cancel run");

    fireEvent.click(button);
    expect(onCancel).not.toHaveBeenCalled();
    expect(button).toHaveTextContent("Confirm cancel");

    fireEvent.click(button);
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("disables the cancel control while cancelling", () => {
    const r1 = round({ id: "r1", status: "REHEARSING" });
    render(
      <ImprovementLiveCard
        run={run}
        detail={detailWith([r1])}
        currentRound={r1}
        rehearsal={null}
        onCancel={noop}
        cancelling
      />,
    );
    const button = screen.getByRole("button");
    expect(button).toBeDisabled();
    expect(button).toHaveTextContent("Cancelling…");
  });

  it("falls back to a starting state before the first rehearsal unit lands", () => {
    const r1 = round({ id: "r1", status: "REHEARSING", rehearsalRunId: "reh-1" });
    render(
      <ImprovementLiveCard
        run={run}
        detail={detailWith([r1])}
        currentRound={r1}
        rehearsal={{ id: "reh-1", status: "STARTED" } as RoleplayRehearsal}
        onCancel={noop}
        cancelling={false}
      />,
    );
    expect(screen.getByText("Starting rehearsals…")).toBeInTheDocument();
    expect(screen.getByText("Scoring in progress…")).toBeInTheDocument();
  });
});
