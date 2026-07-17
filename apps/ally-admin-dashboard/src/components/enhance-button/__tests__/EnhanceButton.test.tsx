import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { EnhanceButton } from "../EnhanceButton";

const mockEnhance = vi.fn();

// @api ↔ store form a circular import, so fully replace @api (cutting the
// chain) and provide a minimal baseAPI stub for any store init.
vi.mock("@api", () => ({
  // evaluatorAPI is wired into the store alongside baseAPI; stub it too so
  // store init (reducerPath/reducer/middleware) does not throw.
  evaluatorAPI: {
    reducerPath: "evaluatorAPI",
    reducer: (state = {}) => state,
    middleware: () => (next: any) => (action: any) => next(action),
    util: { resetApiState: () => ({ type: "reset" }) },
  },
  useEnhanceFieldMutation: () => [mockEnhance, { isLoading: false }],
  useGetAutofillModelsQuery: () => ({ data: [], isLoading: false }),
  baseAPI: {
    reducerPath: "baseAPI",
    reducer: (state = {}) => state,
    middleware: () => (next: any) => (action: any) => next(action),
  },
}));

// Stub the model picker — its own @api usage is irrelevant to this component's
// behaviour, and it keeps the popover focused on the enhance flow.
vi.mock("@components/autofill-model-select", () => ({
  AutofillModelSelect: () => <div data-testid="model-select" />,
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const setup = (overrides: Partial<Parameters<typeof EnhanceButton>[0]> = {}) =>
  render(
    <EnhanceButton
      enhanceType="characterProfileText"
      label="Character Backstory"
      currentValue="Some existing backstory."
      onApply={vi.fn()}
      {...overrides}
    />,
  );

beforeEach(() => {
  mockEnhance.mockReset();
  mockEnhance.mockReturnValue({
    unwrap: () =>
      Promise.resolve({ fieldName: "characterProfileText", content: "Improved backstory." }),
  });
});

describe("EnhanceButton", () => {
  it("renders the Improve trigger", () => {
    setup();
    expect(screen.getByText("Improve")).toBeInTheDocument();
  });

  it("does not render when there is no content to improve", () => {
    setup({ currentValue: "   " });
    expect(screen.queryByRole("button", { name: /improve/i })).not.toBeInTheDocument();
  });

  it("treats empty rich-text markup as empty (not rendered)", () => {
    setup({ currentValue: "<p></p>" });
    expect(screen.queryByRole("button", { name: /improve/i })).not.toBeInTheDocument();
  });

  it("opens a minimal menu: one textarea + one apply button, no fixed presets", () => {
    setup();
    fireEvent.click(screen.getByText("Improve"));
    expect(screen.getByTestId("enhance-menu")).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/describe how to improve/i)).toBeInTheDocument();
    expect(screen.getByTestId("enhance-custom-submit")).toBeInTheDocument();
    expect(screen.queryByText("Make it shorter")).not.toBeInTheDocument();
    expect(screen.queryByText("Make it more detailed")).not.toBeInTheDocument();
  });

  it("applying with a blank box auto-improves (sends no guidance)", async () => {
    const onApply = vi.fn();
    setup({ onApply });
    fireEvent.click(screen.getByText("Improve"));
    fireEvent.click(screen.getByTestId("enhance-custom-submit"));

    await waitFor(() => expect(onApply).toHaveBeenCalledWith("Improved backstory.", undefined));
    expect(mockEnhance).toHaveBeenCalledTimes(1);
    const arg = mockEnhance.mock.calls[0][0];
    expect(arg.fieldName).toBe("characterProfileText");
    expect(arg.currentValue).toBe("Some existing backstory.");
    expect(arg.guidance).toBeUndefined();
    // Only the current value is sent — no other scenario fields as context.
    expect(arg.context).toBeUndefined();
    // No re-translate unless translateTo is passed.
    expect(arg.translateTo).toBeUndefined();
  });

  it("supports custom guidance entered by the user", async () => {
    const onApply = vi.fn();
    setup({ onApply });
    fireEvent.click(screen.getByText("Improve"));

    const textarea = screen.getByPlaceholderText(/describe how to improve/i);
    fireEvent.change(textarea, { target: { value: "Make it warmer" } });
    fireEvent.click(screen.getByTestId("enhance-custom-submit"));

    await waitFor(() => expect(onApply).toHaveBeenCalledWith("Improved backstory.", undefined));
    expect(mockEnhance.mock.calls[0][0].guidance).toBe("Make it warmer");
  });

  it("sends translateTo and passes returned translations to onApply", async () => {
    mockEnhance.mockReturnValue({
      unwrap: () =>
        Promise.resolve({
          fieldName: "description",
          content: "Improved primary.",
          translations: { "2": "अनुवादित" },
        }),
    });
    const onApply = vi.fn();
    const translateTo = [{ languageId: "2", languageCode: "hi-IN" }];
    setup({ onApply, translateTo });
    fireEvent.click(screen.getByText("Improve"));
    fireEvent.click(screen.getByTestId("enhance-custom-submit"));

    await waitFor(() =>
      expect(onApply).toHaveBeenCalledWith("Improved primary.", { "2": "अनुवादित" }),
    );
    expect(mockEnhance.mock.calls[0][0].translateTo).toEqual(translateTo);
  });
});
