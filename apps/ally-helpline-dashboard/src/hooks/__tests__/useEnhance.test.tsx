import React from "react";

import { render, screen, fireEvent, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

import * as api from "@api";

import { useEnhance } from "../useEnhance";

const mockToastError = vi.fn();
vi.mock("sonner", () => ({ toast: { error: (...args: any[]) => mockToastError(...args) } }));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (_key: string, fallback?: string) => fallback ?? _key }),
}));

// Referenced through closures: vi.mock factories are hoisted above these
// declarations, so they must not read the bindings eagerly.
const mockLogger = { info: vi.fn(), error: vi.fn() };
vi.mock("@ally-ui-mono/ui-shared", () => ({
  logger: {
    info: (...args: any[]) => mockLogger.info(...args),
    error: (...args: any[]) => mockLogger.error(...args),
  },
  // The hook builds a loading skeleton with SkeletonText; stub it so the hook
  // body can create the element without pulling in the real Carbon component.
  SkeletonText: (props: any) => <div data-testid="skeleton-text" {...props} />,
}));

const mockEnhanceMutation = vi.fn();

vi.mock("@api", () => ({
  useEnhanceContentMutation: vi.fn(() => [mockEnhanceMutation, { isLoading: false }]),
}));

beforeEach(() => {
  mockToastError.mockClear();
  mockLogger.error.mockClear();
});

const Harness = ({ fieldName, inputText, updateValue }: any) => {
  const { enhancing, EnhanceButton, isEnhanceLoading } = useEnhance();
  return (
    <div>
      <div data-testid="enhancing">{enhancing}</div>
      <div data-testid="loading">{String(isEnhanceLoading)}</div>
      <EnhanceButton fieldName={fieldName} inputText={inputText} updateValue={updateValue} />
    </div>
  );
};

describe("useEnhance", () => {
  it("streams enhanced content in steps and completes", async () => {
    vi.useFakeTimers();
    const updateSpy = vi.fn();
    mockEnhanceMutation.mockResolvedValueOnce({ data: { enhanced_content: "abcdef" } });

    const { container } = render(
      <Harness fieldName="f" inputText="orig" updateValue={updateSpy} />,
    );
    const clickable = container.querySelector(".cursor-pointer") as HTMLElement;
    fireEvent.click(clickable);

    await act(async () => {
      await Promise.resolve();
    });

    act(() => {
      vi.advanceTimersByTime(50);
      vi.advanceTimersByTime(50);
      vi.advanceTimersByTime(50);
      vi.advanceTimersByTime(50);
    });

    expect(updateSpy).toHaveBeenCalled();
    expect(updateSpy).toHaveBeenLastCalledWith("abcdef");

    vi.useRealTimers();
  });

  it("does nothing when API returns empty enhanced_content", async () => {
    vi.useFakeTimers();
    const updateSpy = vi.fn();
    mockEnhanceMutation.mockResolvedValueOnce({ data: {} });

    const { container } = render(
      <Harness fieldName="f" inputText="orig" updateValue={updateSpy} />,
    );
    const clickable = container.querySelector(".cursor-pointer") as HTMLElement;
    fireEvent.click(clickable);

    await act(async () => {
      await Promise.resolve();
    });

    act(() => {
      vi.runOnlyPendingTimers();
    });

    expect(updateSpy).not.toHaveBeenCalled();

    vi.useRealTimers();
  });

  // The failure path used to return silently: no toast, no log, and the field
  // left greyed out. A dead AI service was invisible to counsellors and to us.
  it("toasts and logs when the mutation resolves with an error", async () => {
    const updateSpy = vi.fn();
    mockEnhanceMutation.mockResolvedValueOnce({
      error: { status: 503, data: { message: "Content enhancement failed" } },
    });

    const { container } = render(
      <Harness fieldName="f" inputText="orig" updateValue={updateSpy} />,
    );
    fireEvent.click(container.querySelector(".cursor-pointer") as HTMLElement);

    await act(async () => {
      await Promise.resolve();
    });

    expect(updateSpy).not.toHaveBeenCalled();
    expect(mockToastError).toHaveBeenCalledWith("Couldn't enhance this text. Please try again.");
    expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining("503"));
  });

  it("toasts and logs when the mutation throws", async () => {
    const updateSpy = vi.fn();
    mockEnhanceMutation.mockRejectedValueOnce(new Error("network down"));

    const { container } = render(
      <Harness fieldName="f" inputText="orig" updateValue={updateSpy} />,
    );
    fireEvent.click(container.querySelector(".cursor-pointer") as HTMLElement);

    await act(async () => {
      await Promise.resolve();
    });

    expect(updateSpy).not.toHaveBeenCalled();
    expect(mockToastError).toHaveBeenCalledWith("Couldn't enhance this text. Please try again.");
    expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining("network down"));
  });

  it("clears the enhancing state after a failure so the wand stays usable", async () => {
    mockEnhanceMutation.mockResolvedValueOnce({ error: { status: 503 } });

    const { container } = render(<Harness fieldName="f" inputText="orig" updateValue={vi.fn()} />);
    fireEvent.click(container.querySelector(".cursor-pointer") as HTMLElement);

    await act(async () => {
      await Promise.resolve();
    });

    // A lingering `enhancing === fieldName` renders the button
    // `opacity-50 pointer-events-none` — permanently unclickable until remount.
    expect(screen.getByTestId("enhancing").textContent).toBe("");
    expect(container.querySelector(".pointer-events-none")).toBeNull();

    // ...and a retry still reaches the API.
    const callsBeforeRetry = mockEnhanceMutation.mock.calls.length;
    mockEnhanceMutation.mockResolvedValueOnce({ data: { enhanced_content: "ok" } });
    fireEvent.click(container.querySelector(".cursor-pointer") as HTMLElement);
    await act(async () => {
      await Promise.resolve();
    });
    expect(mockEnhanceMutation.mock.calls.length).toBe(callsBeforeRetry + 1);
  });

  it("cleans up streaming interval on unmount", async () => {
    vi.useFakeTimers();
    const updateSpy = vi.fn();
    mockEnhanceMutation.mockResolvedValueOnce({ data: { enhanced_content: "abcdef" } });

    const { unmount, container } = render(
      <Harness fieldName="f" inputText="orig" updateValue={updateSpy} />,
    );
    const clickable = container.querySelector(".cursor-pointer") as HTMLElement;
    fireEvent.click(clickable);

    await act(async () => {
      await Promise.resolve();
    });

    act(() => {
      vi.advanceTimersByTime(50);
    });

    const callsBefore = updateSpy.mock.calls.length;
    unmount();
    act(() => {
      vi.runOnlyPendingTimers();
      vi.advanceTimersByTime(500);
    });
    expect(updateSpy.mock.calls.length).toBe(callsBefore);

    vi.useRealTimers();
  });

  it("exposes loading state from mutation hook", () => {
    vi.mocked(api.useEnhanceContentMutation as any).mockReturnValueOnce([
      vi.fn(),
      { isLoading: true },
    ]);

    render(<Harness fieldName="f" inputText="x" updateValue={vi.fn()} />);
    expect(screen.getByTestId("loading").textContent).toBe("true");
  });
});
