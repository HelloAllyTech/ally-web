import { act, fireEvent, render, renderHook, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { InteractionModePicker, useInteractionModePreference } from "../InteractionModePicker";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

describe("InteractionModePicker", () => {
  it("offers voice and text, and describes the one selected", () => {
    render(<InteractionModePicker value="VOICE" onChange={vi.fn()} />);

    expect(screen.getByRole("radio", { name: "learn.scenario.mode.voice" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    expect(screen.getByRole("radio", { name: "learn.scenario.mode.text" })).toHaveAttribute(
      "aria-checked",
      "false",
    );
    expect(screen.getByTestId("interaction-mode-hint")).toHaveTextContent(
      "learn.scenario.mode.voiceHint",
    );
  });

  it("reports a switch to text chat", () => {
    const onChange = vi.fn();
    render(<InteractionModePicker value="VOICE" onChange={onChange} />);

    fireEvent.click(screen.getByRole("radio", { name: "learn.scenario.mode.text" }));

    expect(onChange).toHaveBeenCalledWith("TEXT");
  });

  it("cannot be changed while the session is starting", () => {
    const onChange = vi.fn();
    render(<InteractionModePicker value="TEXT" onChange={onChange} disabled />);

    fireEvent.click(screen.getByRole("radio", { name: "learn.scenario.mode.voice" }));

    expect(onChange).not.toHaveBeenCalled();
  });
});

describe("useInteractionModePreference", () => {
  beforeEach(() => localStorage.clear());

  it("defaults to voice", () => {
    const { result } = renderHook(() => useInteractionModePreference());
    expect(result.current[0]).toBe("VOICE");
  });

  it("remembers a text-chat choice in this browser", () => {
    const first = renderHook(() => useInteractionModePreference());
    act(() => first.result.current[1]("TEXT"));
    expect(first.result.current[0]).toBe("TEXT");

    const next = renderHook(() => useInteractionModePreference());
    expect(next.result.current[0]).toBe("TEXT");
  });

  it("treats anything unexpected in storage as voice", () => {
    localStorage.setItem("ally.roleplay.interactionMode", "VIDEO");
    const { result } = renderHook(() => useInteractionModePreference());
    expect(result.current[0]).toBe("VOICE");
  });
});
