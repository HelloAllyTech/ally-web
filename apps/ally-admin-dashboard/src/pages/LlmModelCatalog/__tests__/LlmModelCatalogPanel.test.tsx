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
}));

vi.mock("@constants", () => ({
  LLM_PROVIDER_OPTIONS: [
    { value: "openai", label: "OpenAI" },
    { value: "gemini", label: "Google (Gemini)" },
    { value: "anthropic", label: "Anthropic" },
  ],
}));

import { LlmModelCatalogPanel } from "../LlmModelCatalogPanel";

const existing = {
  id: "m1",
  provider: "openai",
  model: "gpt-4o-mini",
  label: "GPT-4o mini",
  supportsTemperature: true,
  active: true,
};

const props = {
  selected: null,
  onClose: vi.fn(),
  onSave: vi.fn().mockResolvedValue(undefined),
};

describe("LlmModelCatalogPanel", () => {
  it("cannot save without a model id — the string sent on every call", () => {
    render(<LlmModelCatalogPanel {...props} />);

    expect(screen.getByText("Save")).toBeDisabled();
  });

  it("saves a new model with the fields as entered", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<LlmModelCatalogPanel {...props} onSave={onSave} />);

    fireEvent.change(screen.getByLabelText("Model id"), {
      target: { value: "gpt-5.1-mini" },
    });
    fireEvent.change(screen.getByLabelText("Display name"), {
      target: { value: "GPT-5.1 mini" },
    });
    fireEvent.click(screen.getByText("Save"));

    await waitFor(() =>
      expect(onSave).toHaveBeenCalledWith(
        {
          provider: "openai",
          model: "gpt-5.1-mini",
          label: "GPT-5.1 mini",
          supportsTemperature: true,
          active: true,
        },
        undefined,
      ),
    );
  });

  // Matches the backend, which does the same — an empty label would render as a
  // blank entry in every picker.
  it("falls back to the model id when no display name is given", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<LlmModelCatalogPanel {...props} onSave={onSave} />);

    fireEvent.change(screen.getByLabelText("Model id"), {
      target: { value: "gpt-5.1-mini" },
    });
    fireEvent.click(screen.getByText("Save"));

    await waitFor(() => expect(onSave.mock.calls[0][0]).toMatchObject({ label: "gpt-5.1-mini" }));
  });

  it("trims whitespace so a stray space cannot become part of the model id", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<LlmModelCatalogPanel {...props} onSave={onSave} />);

    fireEvent.change(screen.getByLabelText("Model id"), {
      target: { value: "  gpt-4o  " },
    });
    fireEvent.click(screen.getByText("Save"));

    await waitFor(() => expect(onSave.mock.calls[0][0]).toMatchObject({ model: "gpt-4o" }));
  });

  it("loads an existing row for editing and passes its id back", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<LlmModelCatalogPanel {...props} selected={existing} onSave={onSave} />);

    expect(screen.getByLabelText("Model id")).toHaveValue("gpt-4o-mini");
    expect(screen.getByLabelText("Display name")).toHaveValue("GPT-4o mini");

    fireEvent.click(screen.getByText("Save"));

    await waitFor(() => expect(onSave.mock.calls[0][1]).toBe("m1"));
  });

  // Reasoning models reject any non-default temperature; the flag is how the
  // picker knows to hide the slider rather than send a value that 400s.
  it("lets temperature support be turned off", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<LlmModelCatalogPanel {...props} selected={existing} onSave={onSave} />);

    fireEvent.click(screen.getByLabelText(/Accepts a custom temperature/));
    fireEvent.click(screen.getByText("Save"));

    await waitFor(() =>
      expect(onSave.mock.calls[0][0]).toMatchObject({ supportsTemperature: false }),
    );
  });

  it("offers Delete only for a saved row", () => {
    const onDelete = vi.fn();
    const { rerender } = render(<LlmModelCatalogPanel {...props} onDelete={onDelete} />);
    expect(screen.queryByText("Delete")).not.toBeInTheDocument();

    rerender(<LlmModelCatalogPanel {...props} selected={existing} onDelete={onDelete} />);
    expect(screen.getByText("Delete")).toBeInTheDocument();
  });
});
