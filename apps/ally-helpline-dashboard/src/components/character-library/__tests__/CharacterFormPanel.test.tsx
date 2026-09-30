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
  useGetAvailableLanguagesQuery: () => ({
    data: [
      { value: "en-IN", label: "English", language_id: 1 },
      { value: "hi-IN", label: "Hindi", language_id: 2 },
    ],
  }),
}));

/** The shape the interview agent's save_character_draft hands the form. */
const interviewDraft = {
  id: "temp-1",
  name: "Asha",
  age: 34,
  gender: "Female",
  profession: "Teacher",
  currentLocation: "Pune",
  genderIdentity: "Cisgender",
  sexualOrientation: "Heterosexual",
  characterProfileText: "Backstory",
  voices: { "1": "3f1c2a9e-1b2c-4d5e-8f90-123456789abc" },
  languageCharacteristics: { "1": "Warm, measured", "2": "Hinglish" },
  linguisticStyleSamples: { "1": ["Hello there"], "2": ["Kaise ho?", "  "] },
};

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

  it("opens an interview draft whose style and samples are per-language maps", () => {
    // Regression: the form treated these as a flat string/array, so
    // `samples.map` threw on the draft and the review drawer never appeared.
    render(
      <CharacterFormPanel
        isOpen
        onClose={vi.fn()}
        onSave={vi.fn()}
        initialCharacter={interviewDraft}
      />,
    );

    expect(screen.getByDisplayValue("Warm, measured")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Hello there")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "Hindi" }));
    expect(screen.getByDisplayValue("Hinglish")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Kaise ho?")).toBeInTheDocument();
  });

  it("saves style and samples as per-language maps, dropping blank lines", async () => {
    createCharacterMock.mockReturnValue({ unwrap: () => Promise.resolve({ id: "c1" }) });
    const onSave = vi.fn();
    render(
      <CharacterFormPanel
        isOpen
        onClose={vi.fn()}
        onSave={onSave}
        initialCharacter={interviewDraft}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /^save$/i }));

    await vi.waitFor(() => expect(onSave).toHaveBeenCalled());
    const payload = createCharacterMock.mock.calls.at(-1)?.[0];
    expect(payload.languageCharacteristics).toEqual({ "1": "Warm, measured", "2": "Hinglish" });
    expect(payload.linguisticStyleSamples).toEqual({ "1": ["Hello there"], "2": ["Kaise ho?"] });
    expect(payload).not.toHaveProperty("id");
    // The voice the admin chose in the interview is kept, not dropped.
    expect(payload.voices).toEqual({ "1": "3f1c2a9e-1b2c-4d5e-8f90-123456789abc" });
  });

  it("shows the interview's chosen voice by name on the language it was chosen for", () => {
    render(
      <CharacterFormPanel
        isOpen
        onClose={vi.fn()}
        onSave={vi.fn()}
        initialCharacter={interviewDraft}
        voiceLabels={{ "3f1c2a9e-1b2c-4d5e-8f90-123456789abc": "Anushka — English" }}
      />,
    );

    expect(screen.getByText("Anushka — English")).toBeInTheDocument();

    // Hindi has no voice in this draft, so no voice row is shown there.
    fireEvent.click(screen.getByRole("tab", { name: "Hindi" }));
    expect(screen.queryByText("Anushka — English")).not.toBeInTheDocument();
  });
});
