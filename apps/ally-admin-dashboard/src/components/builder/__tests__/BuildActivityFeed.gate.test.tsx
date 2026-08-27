import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { BuilderBuildEvent } from "@types";

// @constants reads off the @components barrel at module-eval time (see the
// BugHunter tests), so the barrel is stubbed rather than loaded for real.
vi.mock("@components", () => ({ cellTypes: {} }));

vi.mock("react-markdown", () => ({
  default: ({ children }: { children: string }) => <div>{children}</div>,
}));
vi.mock("remark-gfm", () => ({ default: () => undefined }));

vi.mock("@ally-ui-mono/ui-shared", () => ({
  Button: ({ children, onClick }: any) => <button onClick={onClick}>{children}</button>,
  Tag: ({ children }: any) => <span>{children}</span>,
  Tile: ({ children, className }: any) => <div className={className}>{children}</div>,
}));

// eslint-disable-next-line import/first
import { BuildActivityFeed } from "../BuildActivityFeed";

/**
 * The gate and review cards are how a person tells "Builder says it works"
 * from "the suites say it works". If a gate failure renders as narration, or a
 * failing review reads as a dead build, the feed is misreporting the two
 * things this pipeline was rebuilt to make trustworthy.
 */

let seq = 0;
const event = (
  type: BuilderBuildEvent["type"],
  payload: Record<string, unknown>,
): BuilderBuildEvent =>
  ({
    id: `event-${(seq += 1)}`,
    runId: "run-1",
    sessionId: "session-1",
    seq,
    stage: null,
    type,
    payload,
    createdAt: new Date().toISOString(),
  }) as unknown as BuilderBuildEvent;

const renderFeed = (events: BuilderBuildEvent[]) =>
  render(<BuildActivityFeed events={events} isLive={false} />);

describe("gate results in the feed", () => {
  it("marks a passing check as machine-checked rather than self-reported", () => {
    renderFeed([
      event("gate_result", {
        repo: "ally-be",
        kind: "test",
        command: "npm test",
        passed: true,
        machine: true,
      }),
    ]);

    expect(screen.getByText(/ally-be · test/)).toBeTruthy();
    expect(screen.getByText("Passed")).toBeTruthy();
    expect(screen.getByText(/not self-reported/i)).toBeTruthy();
  });

  it("separates failures this change caused from ones it inherited", () => {
    // The distinction the gate's whole policy rests on. Collapsing them in the
    // UI would make a clean run look like it broke a repo that was already red.
    renderFeed([
      event("gate_result", {
        repo: "ally-be",
        kind: "test",
        command: "npm test",
        passed: false,
        newFailures: ["src/comfort/comfort.service.spec.ts"],
        preExistingFailures: ["src/legacy/legacy.spec.ts"],
      }),
    ]);

    expect(screen.getByText("Failed")).toBeTruthy();
    expect(screen.getByText("src/comfort/comfort.service.spec.ts")).toBeTruthy();
    expect(screen.getByText(/1 failure this change caused/)).toBeTruthy();
    expect(screen.getByText(/already there before this change/)).toBeTruthy();
  });

  it("survives a payload whose list fields are not lists", () => {
    // Payloads are model-adjacent JSON: a string where an array belongs has
    // crashed this panel before (see PrdDocPanel.malformed).
    expect(() =>
      renderFeed([
        event("gate_result", {
          repo: "ally-be",
          kind: "lint",
          passed: false,
          newFailures: "everything",
          preExistingFailures: null,
        }),
      ]),
    ).not.toThrow();
  });
});

describe("verification verdicts in the feed", () => {
  it("lists objections with their severity and location", () => {
    renderFeed([
      event("verification", {
        round: 1,
        verdict: "fail",
        objections: [
          {
            severity: "blocking",
            repo: "ally-be",
            file: "src/comfort/comfort.service.ts",
            summary: "R1 has no test proving persistence",
            detail: "The column is written but nothing asserts it round-trips.",
          },
        ],
        notes: "Otherwise clean.",
      }),
    ]);

    expect(screen.getByText("Independent review · round 1")).toBeTruthy();
    expect(screen.getByText("Blocking objections")).toBeTruthy();
    expect(screen.getByText("blocking")).toBeTruthy();
    expect(screen.getByText("R1 has no test proving persistence")).toBeTruthy();
    expect(screen.getByText(/ally-be · src\/comfort\/comfort.service.ts/)).toBeTruthy();
  });

  it("says a failing review leads to a fix, not to a dead build", () => {
    // Under the old loop a failing verdict ended the run. It now re-invokes
    // the coder, and the card has to reflect that or it reads as a failure.
    renderFeed([
      event("verification", { round: 1, verdict: "fail", objections: [] }),
    ]);

    expect(screen.getByText(/fixing these and will be reviewed again/i)).toBeTruthy();
  });

  it("shows a clean verdict without inventing objections", () => {
    renderFeed([
      event("verification", {
        round: 2,
        verdict: "pass",
        objections: [],
        notes: "Consider caching later.",
      }),
    ]);

    expect(screen.getByText("No blocking objections")).toBeTruthy();
    expect(screen.getByText("Consider caching later.")).toBeTruthy();
    expect(screen.queryByText(/fixing these/i)).toBeNull();
  });

  it("survives objections that are not objects", () => {
    expect(() =>
      renderFeed([
        event("verification", {
          verdict: "fail",
          objections: ["just a string", null],
        }),
      ]),
    ).not.toThrow();
  });
});

describe("bookkeeping events", () => {
  it("keeps per-phase cost out of the reading feed", () => {
    // The spend figure belongs in the header; a row per engine invocation is
    // noise in a transcript people read to follow the work.
    renderFeed([
      event("phase_cost", { phase: "verify-1", totalCostUsd: 0.42 }),
      event("text", { text: "Wrote the code." }),
    ]);

    expect(screen.getByText("Wrote the code.")).toBeTruthy();
    expect(screen.queryByText(/verify-1/)).toBeNull();
  });
});
