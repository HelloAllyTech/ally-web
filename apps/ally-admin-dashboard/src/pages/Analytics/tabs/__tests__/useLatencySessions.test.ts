import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

const getVoiceLatencySessionsQueryMock = vi.fn();
const getVoiceLatencySessionsSummaryQueryMock = vi.fn();

vi.mock("@api", () => ({
  useGetVoiceLatencySessionsQuery: (...args: unknown[]) =>
    getVoiceLatencySessionsQueryMock(...args),
  useGetVoiceLatencySessionsSummaryQuery: (...args: unknown[]) =>
    getVoiceLatencySessionsSummaryQueryMock(...args),
}));

import { useLatencySessions, LATENCY_SESSIONS_PAGE_SIZE } from "../useLatencySessions";

const baseSessionsResult = {
  data: { data: [], total: 0 },
  isLoading: false,
  isFetching: false,
  isError: false,
  refetch: vi.fn(),
};

const baseSummaryResult = {
  data: undefined,
  isLoading: false,
  isError: false,
};

describe("useLatencySessions", () => {
  beforeEach(() => {
    getVoiceLatencySessionsQueryMock.mockReset().mockReturnValue(baseSessionsResult);
    getVoiceLatencySessionsSummaryQueryMock.mockReset().mockReturnValue(baseSummaryResult);
  });

  it("skips both queries until a simulation is picked", () => {
    renderHook(() => useLatencySessions({}, ""));

    expect(getVoiceLatencySessionsQueryMock).toHaveBeenCalledWith(
      expect.objectContaining({ scenarioId: 0 }),
      { skip: true },
    );
    expect(getVoiceLatencySessionsSummaryQueryMock).toHaveBeenCalledWith(
      expect.objectContaining({ scenarioId: 0 }),
      { skip: true },
    );
  });

  it("fires both queries once a simulation is set, with the language composed in", () => {
    const { result } = renderHook(() => useLatencySessions({ range: "90d" }, "ta-IN"));

    act(() => result.current.setScenarioId(42));

    expect(getVoiceLatencySessionsQueryMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        range: "90d",
        scenarioId: 42,
        language: "ta-IN",
        limit: LATENCY_SESSIONS_PAGE_SIZE,
        offset: 0,
      }),
      { skip: false },
    );
    expect(getVoiceLatencySessionsSummaryQueryMock).toHaveBeenLastCalledWith(
      expect.objectContaining({ range: "90d", scenarioId: 42, language: "ta-IN" }),
      { skip: false },
    );
  });

  it("treats an empty language string as no filter", () => {
    const { result } = renderHook(() => useLatencySessions({}, ""));
    act(() => result.current.setScenarioId(7));

    expect(getVoiceLatencySessionsQueryMock).toHaveBeenLastCalledWith(
      expect.objectContaining({ scenarioId: 7, language: undefined }),
      { skip: false },
    );
  });

  it("resets the page offset when the simulation changes", () => {
    const { result, rerender } = renderHook(
      ({ language }: { language: string }) => useLatencySessions({}, language),
      { initialProps: { language: "" } },
    );

    act(() => result.current.setScenarioId(1));
    act(() => result.current.goNext()); // no-op: total is 0, canNext is false

    // Force a page forward by pretending there are more rows than one page.
    getVoiceLatencySessionsQueryMock.mockReturnValue({
      ...baseSessionsResult,
      data: { data: [], total: LATENCY_SESSIONS_PAGE_SIZE + 5 },
    });
    rerender({ language: "" });
    act(() => result.current.goNext());

    expect(getVoiceLatencySessionsQueryMock).toHaveBeenLastCalledWith(
      expect.objectContaining({ offset: LATENCY_SESSIONS_PAGE_SIZE }),
      { skip: false },
    );

    // Changing the simulation must snap the offset back to 0.
    act(() => result.current.setScenarioId(2));

    expect(getVoiceLatencySessionsQueryMock).toHaveBeenLastCalledWith(
      expect.objectContaining({ scenarioId: 2, offset: 0 }),
      { skip: false },
    );
  });

  it("resets the page offset when the language changes", () => {
    getVoiceLatencySessionsQueryMock.mockReturnValue({
      ...baseSessionsResult,
      data: { data: [], total: LATENCY_SESSIONS_PAGE_SIZE + 5 },
    });

    const { result, rerender } = renderHook(
      ({ language }: { language: string }) => useLatencySessions({}, language),
      { initialProps: { language: "en-IN" } },
    );
    act(() => result.current.setScenarioId(1));
    act(() => result.current.goNext());

    expect(getVoiceLatencySessionsQueryMock).toHaveBeenLastCalledWith(
      expect.objectContaining({ offset: LATENCY_SESSIONS_PAGE_SIZE }),
      { skip: false },
    );

    rerender({ language: "hi-IN" });

    expect(getVoiceLatencySessionsQueryMock).toHaveBeenLastCalledWith(
      expect.objectContaining({ language: "hi-IN", offset: 0 }),
      { skip: false },
    );
  });

  it("computes pagination range and canPrev/canNext from total", () => {
    getVoiceLatencySessionsQueryMock.mockReturnValue({
      ...baseSessionsResult,
      data: { data: [{}, {}], total: 30 },
    });

    const { result } = renderHook(() => useLatencySessions({}, ""));
    act(() => result.current.setScenarioId(1));

    expect(result.current.total).toBe(30);
    expect(result.current.canPrev).toBe(false);
    expect(result.current.canNext).toBe(true);
    expect(result.current.rangeStart).toBe(1);
    expect(result.current.rangeEnd).toBe(LATENCY_SESSIONS_PAGE_SIZE);
  });
});
