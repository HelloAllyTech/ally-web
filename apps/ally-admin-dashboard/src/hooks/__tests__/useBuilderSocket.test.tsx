import React from "react";

import { renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { BuilderBuildEvent } from "@types";

import { useBuilderSocket } from "../useBuilderSocket";

let capturedHandlers: Record<string, (payload: unknown) => void> = {};

vi.mock("../useAllySocket", () => ({
  useAllySocket: (options: { handlers: Record<string, (payload: unknown) => void> }) => {
    capturedHandlers = options.handlers;
    return { emit: vi.fn() };
  },
}));

const buildEvent = (runId: string, seq: number): BuilderBuildEvent => ({
  id: `${runId}-${seq}`,
  runId,
  seq,
  stage: null,
  type: "text",
  payload: {},
  createdAt: new Date(0).toISOString(),
});

describe("useBuilderSocket", () => {
  afterEach(() => {
    capturedHandlers = {};
    vi.clearAllMocks();
  });

  it("does not drop a resumed run's early events just because a prior run already used those seq numbers", () => {
    const onEvents = vi.fn();
    renderHook(() =>
      useBuilderSocket({ sessionId: "session-1", onEvents, onMissedWindow: vi.fn() }),
    );

    // The paused run's events, seq 1-3.
    capturedHandlers.buildEvents({
      sessionId: "session-1",
      events: [buildEvent("run-old", 1), buildEvent("run-old", 2), buildEvent("run-old", 3)],
    });
    expect(onEvents).toHaveBeenCalledTimes(1);

    // A resume keeps the same session but starts a new run whose seq numbers
    // restart from 1 — these must still reach the UI, not be filtered out as
    // duplicates of the old run's seq 1-3.
    capturedHandlers.buildEvents({
      sessionId: "session-1",
      events: [buildEvent("run-new", 1), buildEvent("run-new", 2)],
    });

    expect(onEvents).toHaveBeenCalledTimes(2);
    expect(onEvents).toHaveBeenLastCalledWith([buildEvent("run-new", 1), buildEvent("run-new", 2)]);
  });
});
