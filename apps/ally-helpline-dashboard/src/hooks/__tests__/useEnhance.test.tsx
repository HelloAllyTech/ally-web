import React from "react";

import { render, screen, fireEvent, act } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

import * as api from "@api";

import { useEnhance } from "../useEnhance";

vi.mock("@ally-ui-mono/ui-shared", () => ({
  logger: { info: vi.fn() },
  // The hook builds a loading skeleton with SkeletonText; stub it so the hook
  // body can create the element without pulling in the real Carbon component.
  SkeletonText: (props: any) => <div data-testid="skeleton-text" {...props} />,
}));

const mockEnhanceMutation = vi.fn();

vi.mock("@api", () => ({
  useEnhanceContentMutation: vi.fn(() => [mockEnhanceMutation, { isLoading: false }]),
}));

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
