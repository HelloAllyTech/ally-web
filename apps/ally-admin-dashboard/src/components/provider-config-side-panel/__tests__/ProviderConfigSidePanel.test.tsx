import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

vi.mock("@assets", () => ({
  DoubleArrowRight: () => <svg data-testid="double-arrow-right" />,
}));

vi.mock("@components", () => ({
  Button: ({ children, onClick, disabled }: any) => (
    <button onClick={onClick} disabled={disabled}>
      {children}
    </button>
  ),
  ActionConfirmationPopup: () => null,
}));

// The real @constants barrel evaluates the table-column constants, which reach
// back into the notion-table module and fail under vitest's module order. Only
// the schema helpers matter here.
vi.mock("@constants", () => ({
  getProviderSchemaFields: (schema: any, provider: string) => schema?.[provider] ?? [],
  readConfigField: (config: any, field: any) => config?.[field.key],
  validateProviderConfig: () => [],
}));

import { ProviderConfigSidePanel } from "../ProviderConfigSidePanel";

const SCHEMA = {
  openai: [{ key: "model", label: "Model", required: true, type: "string" as const }],
};

const savedRow = {
  id: "cfg-1",
  name: "OpenAI — gpt-4o-mini",
  provider: "openai",
  config: { model: "gpt-4o-mini" },
  active: true,
};

const defaultProps = {
  selected: savedRow,
  isOpen: true,
  subject: "LLM config",
  schema: SCHEMA as any,
  providerOptions: [{ value: "openai", label: "OpenAI" }],
  onClose: vi.fn(),
  onSave: vi.fn(),
};

const testButton = () => screen.getByText("Test model");

describe("ProviderConfigSidePanel — model test", () => {
  it("offers no test control when the registry supplies none", () => {
    render(<ProviderConfigSidePanel {...defaultProps} />);

    expect(screen.queryByText("Test model")).not.toBeInTheDocument();
  });

  // Testing runs against the STORED row, so there is nothing to test until the
  // config has been saved once.
  it("hides the control for an unsaved config", () => {
    render(<ProviderConfigSidePanel {...defaultProps} selected={null} onTest={vi.fn()} />);

    expect(screen.queryByText("Test model")).not.toBeInTheDocument();
  });

  it("reports a working model with its latency", async () => {
    const onTest = vi.fn().mockResolvedValue({
      ok: true,
      summary: "gpt-4o-mini · 312 ms · 8→2 tokens",
      detail: "Reply: ok",
    });

    render(<ProviderConfigSidePanel {...defaultProps} onTest={onTest} />);
    fireEvent.click(testButton());

    expect(await screen.findByText("Model responded")).toBeInTheDocument();
    expect(screen.getByText("gpt-4o-mini · 312 ms · 8→2 tokens")).toBeInTheDocument();
    expect(onTest).toHaveBeenCalledWith("cfg-1");
  });

  // The reason the whole feature exists: the provider's wording names the
  // replacement model, so it must reach the screen intact.
  it("shows a deprecation message verbatim", async () => {
    const onTest = vi.fn().mockResolvedValue({
      ok: false,
      summary: "openai · gpt-4o-mini",
      detail: "404: The model `gpt-4o-mini` has been deprecated, use `gpt-5-mini`",
    });

    render(<ProviderConfigSidePanel {...defaultProps} onTest={onTest} />);
    fireEvent.click(testButton());

    expect(await screen.findByText("Model did not respond")).toBeInTheDocument();
    expect(
      screen.getByText("404: The model `gpt-4o-mini` has been deprecated, use `gpt-5-mini`"),
    ).toBeInTheDocument();
  });

  it("surfaces a failed request instead of hanging on 'Testing…'", async () => {
    const onTest = vi.fn().mockRejectedValue({ data: { message: "Provider not configured" } });

    render(<ProviderConfigSidePanel {...defaultProps} onTest={onTest} />);
    fireEvent.click(testButton());

    expect(await screen.findByText("Could not run the test")).toBeInTheDocument();
    expect(screen.getByText("Provider not configured")).toBeInTheDocument();
    await waitFor(() => expect(testButton()).not.toBeDisabled());
  });

  it("disables the control while a test is in flight", async () => {
    const onTest = vi.fn(() => new Promise(() => {}));

    render(<ProviderConfigSidePanel {...defaultProps} onTest={onTest as any} />);
    fireEvent.click(testButton());

    expect(await screen.findByText("Testing…")).toBeDisabled();
  });

  // A stale result would read as if it described the newly opened config.
  it("clears the previous result when another config is opened", async () => {
    const onTest = vi.fn().mockResolvedValue({ ok: true, summary: "fine" });

    const { rerender } = render(<ProviderConfigSidePanel {...defaultProps} onTest={onTest} />);
    fireEvent.click(testButton());
    expect(await screen.findByText("Model responded")).toBeInTheDocument();

    rerender(
      <ProviderConfigSidePanel
        {...defaultProps}
        onTest={onTest}
        selected={{ ...savedRow, id: "cfg-2", name: "Another" }}
      />,
    );

    expect(screen.queryByText("Model responded")).not.toBeInTheDocument();
  });
});
