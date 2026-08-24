import "@constants";

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@assets", async importOriginal => {
  const actual = await importOriginal<typeof import("@assets")>();
  return {
    ...actual,
    ArrowLeft: () => <span data-testid="arrow-left-icon" />,
    CloseIcon: () => <span data-testid="close-icon" />,
  };
});

const createCharacterMock = vi.fn();
vi.mock("@api", () => ({
  useCreateCharacterMutation: () => [createCharacterMock, { isLoading: false }],
}));

import { CharacterFormPanel } from "../CharacterFormPanel";

describe("CharacterFormPanel", () => {
  it("keeps Save enabled and reports which required fields are missing, instead of disabling it silently", () => {
    const onSave = vi.fn();
    render(<CharacterFormPanel isOpen onClose={vi.fn()} onSave={onSave} />);

    fireEvent.click(screen.getByRole("button", { name: /^save$/i }));

    // Save never called — nothing was filled in — but the button itself
    // stayed clickable and explained why nothing happened.
    expect(createCharacterMock).not.toHaveBeenCalled();
    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getAllByText(/required/i).length).toBeGreaterThan(0);
  });

  it("asks for confirmation before discarding a dirty form on close, but not an untouched one", () => {
    const onClose = vi.fn();
    render(<CharacterFormPanel isOpen onClose={onClose} onSave={vi.fn()} />);

    // Untouched: closing goes straight through.
    fireEvent.click(screen.getByLabelText(/^close$/i));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("shows a discard confirmation instead of closing immediately once the admin has typed something", () => {
    const onClose = vi.fn();
    render(<CharacterFormPanel isOpen onClose={onClose} onSave={vi.fn()} />);

    fireEvent.change(screen.getByPlaceholderText(/enter name/i), {
      target: { value: "Asha" },
    });
    fireEvent.click(screen.getByLabelText(/^close$/i));

    // Not closed yet — a confirmation should be standing in the way.
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByText(/keep editing/i)).toBeInTheDocument();

    fireEvent.click(screen.getByText(/keep editing/i));
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByDisplayValue("Asha")).toBeInTheDocument();
  });
});
