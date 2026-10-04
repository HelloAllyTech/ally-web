import { render, screen, fireEvent } from "@testing-library/react";
import { useForm } from "react-hook-form";
import { vi, describe, it, expect } from "vitest";

import { ToggleSection } from "../ToggleSection";

// ToggleSection pulls the data-driven tooltip list off @api, which transitively
// drags in the whole RTK Query base API (and, via the @constants barrel, the
// configured store). These tests only care about the switch's value, so the
// endpoint is stubbed and the two API slices the store wires up are faked.
const mockActiveTooltips = vi.hoisted(() => ({ current: [] as any[] }));

vi.mock("@api", () => {
  const apiSliceStub = (reducerPath: string) => ({
    reducerPath,
    reducer: (state = {}) => state,
    middleware: () => (next: any) => (action: any) => next(action),
    injectEndpoints: () => ({}),
  });
  return {
    useGetActiveTooltipsQuery: () => ({ data: mockActiveTooltips.current }),
    baseAPI: apiSliceStub("baseAPI"),
    evaluatorAPI: apiSliceStub("evaluatorAPI"),
  };
});

/**
 * Renders ToggleSection against a real `useForm` — no `reset()`, no
 * `defaultValues` — i.e. exactly the state a brand-new simulation is in.
 */
const Harness = ({ name, defaultValue }: { name: string; defaultValue?: boolean }) => {
  const formMethods = useForm({ mode: "onChange", reValidateMode: "onChange" });
  return (
    <>
      <ToggleSection
        label="Post-Session Feedback"
        name={name}
        formMethods={formMethods}
        defaultValue={defaultValue}
      />
      <output data-testid="raw-value">{String(formMethods.watch(name))}</output>
    </>
  );
};

const getSwitch = () => screen.getByRole("button", { name: "Post-Session Feedback" });
const isOn = () => getSwitch().className.includes("bg-success-200");

describe("ToggleSection default value (create path — form never reset)", () => {
  it("renders ON and seeds the form when the field config declares defaultValue: true", () => {
    render(<Harness name="enableFeedback" defaultValue />);

    expect(isOn()).toBe(true);
    expect(screen.getByText("Enabled")).toBeInTheDocument();
    // The seeded value must reach form state, not just the pixels — the save
    // payload is built from getValues(), so a visually-on/undefined-in-state
    // switch would still persist `false`.
    expect(screen.getByTestId("raw-value").textContent).toBe("true");
  });

  it("renders OFF and seeds `false` when the field config declares defaultValue: false", () => {
    render(<Harness name="pauseEnabled" defaultValue={false} />);

    expect(isOn()).toBe(false);
    expect(screen.getByText("Disabled")).toBeInTheDocument();
    expect(screen.getByTestId("raw-value").textContent).toBe("false");
  });

  it("renders OFF when the field config declares no defaultValue at all", () => {
    render(<Harness name="isGlobal" />);

    expect(isOn()).toBe(false);
    expect(screen.getByTestId("raw-value").textContent).toBe("false");
  });

  it("lets the author turn a defaultValue: true toggle off", () => {
    render(<Harness name="enableFeedback" defaultValue />);

    fireEvent.click(getSwitch());

    expect(isOn()).toBe(false);
    expect(screen.getByTestId("raw-value").textContent).toBe("false");
  });
});

describe("ToggleSection tooltip", () => {
  const TooltipHarness = (props: { tooltipLocation?: string; tooltip?: string }) => {
    const formMethods = useForm();
    return (
      <ToggleSection
        label="Offer as text chat"
        name="textChatEnabled"
        formMethods={formMethods}
        {...props}
      />
    );
  };

  it("shows the engineer-written fallback when no authored tooltip is active", () => {
    mockActiveTooltips.current = [];
    render(<TooltipHarness tooltipLocation="text_chat_enabled" tooltip="Typed both ways." />);

    expect(screen.getByText("Typed both ways.")).toBeInTheDocument();
  });

  it("lets an authored, active tooltip take over from the fallback", () => {
    mockActiveTooltips.current = [{ location: "text_chat_enabled", tipText: "Authored copy." }];
    render(<TooltipHarness tooltipLocation="text_chat_enabled" tooltip="Typed both ways." />);

    expect(screen.getByText("Authored copy.")).toBeInTheDocument();
    expect(screen.queryByText("Typed both ways.")).not.toBeInTheDocument();
    mockActiveTooltips.current = [];
  });

  it("renders no tooltip at all when neither exists", () => {
    mockActiveTooltips.current = [];
    render(<TooltipHarness tooltipLocation="text_chat_enabled" />);

    expect(screen.queryByRole("button", { name: "" })).toBeNull();
  });
});
