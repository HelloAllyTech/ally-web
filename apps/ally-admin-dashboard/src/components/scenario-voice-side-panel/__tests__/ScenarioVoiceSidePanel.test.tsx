import { render, screen, fireEvent, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock API hooks
const mockLookupElevenLabsVoice = vi.fn().mockReturnValue({
  unwrap: () => new Promise(() => {}), // never resolves unless a test overrides it
});
vi.mock("@api", () => ({
  useGetAvailableLanguageVoicesQuery: vi.fn(),
  useSyncElevenLabsVoiceMutation: () => [vi.fn(), { isLoading: false }],
  useLazyLookupElevenLabsVoiceQuery: () => [mockLookupElevenLabsVoice, { isFetching: false }],
  useGetTtsCatalogQuery: vi.fn(),
}));

import * as api from "@api";
import { ScenarioVoiceSidePanel } from "../ScenarioVoiceSidePanel";

vi.mock("@ally-ui-mono/ui-shared", () => ({
  AutoExpandableTextarea: ({ value, onChange, placeholder }: any) => (
    <textarea
      data-testid="auto-expandable-textarea"
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
    />
  ),
}));

// Mock components. TextDropdown is keyed by its placeholder so a test can
// address the provider, language and gender dropdowns independently.
vi.mock("@components", () => ({
  Button: ({ children, onClick, disabled }: any) => (
    <button
      data-testid={`button-${String(children).toLowerCase()}`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  ),
  TextDropdown: ({ value, options, onChange, placeholder }: any) => (
    <select
      data-testid={`dropdown-${placeholder}`}
      value={value}
      onChange={e => onChange(e.target.value)}
    >
      <option value="">{placeholder}</option>
      {options?.map((opt: any) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  ),
  ActionConfirmationPopup: ({ isOpen }: any) =>
    isOpen ? <div data-testid="confirmation-popup" /> : null,
}));

vi.mock("@components/types", () => ({
  ButtonVariant: { PRIMARY: "primary", SECONDARY: "secondary" },
}));

vi.mock("@assets", () => ({
  DoubleArrowRight: () => <svg data-testid="double-arrow" />,
}));

vi.mock("@utils/common", () => ({
  isObject: (value: unknown) =>
    typeof value === "object" && value !== null && !Array.isArray(value),
}));

// Only `en` is stubbed — the provider schema and its validation load for real
// from @constants/voiceProviders, so these tests exercise the actual rules.
vi.mock("@constants", () => ({
  en: {
    simulation: {
      configurationCannotBeEmpty: "Configuration cannot be empty",
      configurationMustBeJsonObject:
        "Configuration must be a JSON object enclosed in curly braces {}",
      configurationMustNotBeArray: "Configuration must be a JSON object, not an array or primitive",
      invalidJsonSyntax: "Invalid JSON syntax",
      nameAndProviderRequired: "Name and provider are required",
      nameProviderConfigRequired: "Name, provider, and valid configuration are required",
    },
  },
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

import { toast } from "sonner";

const saveButton = () => screen.getByTestId("button-save");
const providerDropdown = () => screen.getByTestId("dropdown-Select provider");

describe("ScenarioVoiceSidePanel", () => {
  const mockLanguages = [
    { language_id: 1, label: "English (India)", value: "en-IN" },
    { language_id: 2, label: "Hindi", value: "hi-IN" },
  ];

  const sarvamVoice = {
    id: "voice-1",
    name: "Hindi - Abhilash",
    provider: "SARVAM",
    languageId: 1,
    config: { gender: "male", model: "bulbul:v2", speaker: "abhilash", age: "adult" },
    createdAt: "2024-01-15T10:00:00Z",
    updatedAt: "2024-01-15T10:00:00Z",
    active: true,
  };

  const defaultProps = {
    selectedVoice: null,
    isOpen: true,
    onClose: vi.fn(),
    onUpdate: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (api.useGetAvailableLanguageVoicesQuery as any).mockReturnValue({
      data: mockLanguages,
      isFetching: false,
      error: null,
    });
    // A provider's account-wide catalog — independent of any per-voice
    // ElevenLabs sync/lookup. Ignores which provider was actually asked for,
    // matching every other API mock in this file — tests that care about a
    // specific provider's catalog override this per-test.
    (api.useGetTtsCatalogQuery as any).mockReturnValue({
      data: [
        { value: "eleven_turbo_v2_5", label: "eleven_turbo_v2_5" },
        { value: "eleven_multilingual_v2", label: "eleven_multilingual_v2" },
        { value: "eleven_v3", label: "eleven_v3" },
      ],
      isFetching: false,
    });
  });

  describe("rendering", () => {
    it("renders when isOpen is true", () => {
      render(<ScenarioVoiceSidePanel {...defaultProps} />);
      expect(screen.getByTestId("double-arrow")).toBeInTheDocument();
    });

    it("does not render when isOpen is false", () => {
      render(<ScenarioVoiceSidePanel {...defaultProps} isOpen={false} />);
      expect(screen.queryByTestId("double-arrow")).not.toBeInTheDocument();
    });

    it("shows 'Create Voice' with no voice and 'Edit Voice' with one", () => {
      const { rerender } = render(<ScenarioVoiceSidePanel {...defaultProps} />);
      expect(screen.getByText("Create Voice")).toBeInTheDocument();

      rerender(<ScenarioVoiceSidePanel {...defaultProps} selectedVoice={sarvamVoice} />);
      expect(screen.getByText("Edit Voice")).toBeInTheDocument();
    });

    it("asks for a provider before showing any config fields", () => {
      render(<ScenarioVoiceSidePanel {...defaultProps} />);
      expect(screen.getByText("Pick a provider to configure this voice.")).toBeInTheDocument();
    });
  });

  describe("provider-driven fields", () => {
    it("renders the fields the selected provider actually needs", () => {
      render(<ScenarioVoiceSidePanel {...defaultProps} selectedVoice={sarvamVoice} />);

      expect(screen.getByLabelText("Model")).toHaveValue("bulbul:v2");
      expect(screen.getByLabelText("Speaker")).toHaveValue("abhilash");
      expect(screen.getByLabelText("Age")).toHaveValue("adult");
      // Hume-only field must not appear for a Sarvam voice.
      expect(screen.queryByLabelText("Voice name")).not.toBeInTheDocument();
    });

    it("puts ElevenLabs' Voice ID right after Gender, ahead of Model and Voice type", () => {
      // Typing the id is what triggers the auto-lookup that fills Model and
      // Voice type in — it needs to come first so those fields already have
      // useful values by the time an admin reaches them, not the other way
      // around.
      const elevenLabsVoice = {
        id: "voice-order",
        name: "Order check",
        provider: "ELEVENLABS",
        languageId: 1,
        config: { gender: "female", model: "eleven_turbo_v2_5", voice_id: "someId1234567890123" },
        createdAt: "2024-01-15T10:00:00Z",
        updatedAt: "2024-01-15T10:00:00Z",
        active: true,
      };
      const { container } = render(
        <ScenarioVoiceSidePanel {...defaultProps} selectedVoice={elevenLabsVoice} />,
      );

      // A required field's label span also contains a nested "*" span, so
      // its textContent is "Voice ID*", not "Voice ID" — match by prefix.
      const labels = ["Gender", "Voice ID", "Model", "Voice type"];
      const positions = labels.map(label =>
        Array.from(container.querySelectorAll("span")).findIndex(el =>
          el.textContent?.startsWith(label),
        ),
      );
      expect(positions.every(p => p >= 0)).toBe(true);
      expect(positions).toEqual([...positions].sort((a, b) => a - b));
    });

    it("puts Hume's Voice source right after Gender, ahead of the Voice name it scopes", () => {
      // Voice source (HUME_AI vs CUSTOM_VOICE) decides which catalog the
      // Voice name picker below pulls from — same reasoning as ElevenLabs'
      // Voice ID above: whatever scopes a picker must render before it.
      const humeVoice = {
        id: "voice-order-hume",
        name: "Order check",
        provider: "HUME",
        languageId: 1,
        config: { gender: "female", voice_name: "Priya", voice_provider: "HUME_AI" },
        createdAt: "2024-01-15T10:00:00Z",
        updatedAt: "2024-01-15T10:00:00Z",
        active: true,
      };
      const { container } = render(
        <ScenarioVoiceSidePanel {...defaultProps} selectedVoice={humeVoice} />,
      );

      const labels = ["Gender", "Voice source", "Voice name", "Instant mode"];
      const positions = labels.map(label =>
        Array.from(container.querySelectorAll("span")).findIndex(el =>
          el.textContent?.startsWith(label),
        ),
      );
      expect(positions.every(p => p >= 0)).toBe(true);
      expect(positions).toEqual([...positions].sort((a, b) => a - b));
    });

    it("puts Google's Model name right after Gender, ahead of the Voice name it scopes", () => {
      // Same rule as the two above, and load-bearing here: Google's Gemini
      // voices are the bare-named ones ("Puck", "Kore") and are rejected
      // outright unless a Gemini model is named — measured against the live
      // API: "This voice requires a model name to be specified." Choosing the
      // model first is what makes the voice choice meaningful.
      const googleVoice = {
        id: "voice-order-google",
        name: "Order check",
        provider: "GOOGLE",
        languageId: 1,
        config: {
          gender: "male",
          voice_name: "Puck",
          model_name: "gemini-2.5-flash-tts",
        },
        createdAt: "2024-01-15T10:00:00Z",
        updatedAt: "2024-01-15T10:00:00Z",
        active: true,
      };
      const { container } = render(
        <ScenarioVoiceSidePanel {...defaultProps} selectedVoice={googleVoice} />,
      );

      const labels = ["Gender", "Model name", "Voice name", "Voice cloning key"];
      const positions = labels.map(label =>
        Array.from(container.querySelectorAll("span")).findIndex(el =>
          el.textContent?.startsWith(label),
        ),
      );
      expect(positions.every(p => p >= 0)).toBe(true);
      expect(positions).toEqual([...positions].sort((a, b) => a - b));
    });

    it("turns Deepgram's Model field into a picker too, requesting the voice's own language", () => {
      const deepgramVoice = {
        id: "voice-dg",
        name: "English (India) - Asteria",
        provider: "DEEPGRAM",
        languageId: 1, // en-IN, per mockLanguages
        config: { gender: "female", model: "aura-asteria-en" },
        createdAt: "2024-01-15T10:00:00Z",
        updatedAt: "2024-01-15T10:00:00Z",
        active: true,
      };
      render(<ScenarioVoiceSidePanel {...defaultProps} selectedVoice={deepgramVoice} />);

      expect(screen.getByTestId("dropdown-Select model")).toHaveValue("aura-asteria-en");
      expect(
        (api.useGetTtsCatalogQuery as any).mock.calls.some(
          ([params]: any) => params.provider === "DEEPGRAM" && params.languageCode === "en-IN",
        ),
      ).toBe(true);
    });

    it("turns Google's Voice name field into a picker, also scoped to the voice's language", () => {
      const googleVoice = {
        id: "voice-goog",
        name: "English (India) - Achernar",
        provider: "GOOGLE",
        languageId: 1,
        config: { gender: "female", voice_name: "en-IN-Chirp3-HD-Achernar" },
        createdAt: "2024-01-15T10:00:00Z",
        updatedAt: "2024-01-15T10:00:00Z",
        active: true,
      };
      render(<ScenarioVoiceSidePanel {...defaultProps} selectedVoice={googleVoice} />);

      expect(screen.getByTestId("dropdown-Select voice name")).toHaveValue(
        "en-IN-Chirp3-HD-Achernar",
      );
      expect(
        (api.useGetTtsCatalogQuery as any).mock.calls.some(
          ([params]: any) => params.provider === "GOOGLE" && params.languageCode === "en-IN",
        ),
      ).toBe(true);
    });

    it("turns Hume's Voice name field into a picker, scoped to its own voice_provider (not language)", () => {
      const humeVoice = {
        id: "voice-hume",
        name: "English (India) - Priya",
        provider: "HUME",
        languageId: 1,
        config: { gender: "female", voice_name: "Priya", voice_provider: "CUSTOM_VOICE" },
        createdAt: "2024-01-15T10:00:00Z",
        updatedAt: "2024-01-15T10:00:00Z",
        active: true,
      };
      render(<ScenarioVoiceSidePanel {...defaultProps} selectedVoice={humeVoice} />);

      expect(screen.getByTestId("dropdown-Select voice name")).toHaveValue("Priya");
      // Hume's catalog is scoped by voice_provider (which library), not language.
      expect(
        (api.useGetTtsCatalogQuery as any).mock.calls.some(
          ([params]: any) => params.provider === "HUME" && params.voiceProvider === "CUSTOM_VOICE",
        ),
      ).toBe(true);
    });

    it("swaps the fields when the provider changes", () => {
      render(<ScenarioVoiceSidePanel {...defaultProps} selectedVoice={sarvamVoice} />);

      fireEvent.change(providerDropdown(), { target: { value: "HUME" } });

      // Hume's "Voice name" is a catalog field, so it renders as a picker
      // (mocked TextDropdown doesn't forward an aria-label — the real one
      // doesn't either; the field's own <Field label> span carries that in
      // production), not a labelled text input.
      expect(screen.getByTestId("dropdown-Select voice name")).toBeInTheDocument();
      expect(screen.getByLabelText("Instant mode")).toBeInTheDocument();
      expect(screen.queryByLabelText("Speaker")).not.toBeInTheDocument();
    });

    it("offers only providers the runtime can dispatch to", () => {
      render(<ScenarioVoiceSidePanel {...defaultProps} />);

      const options = Array.from(providerDropdown().querySelectorAll("option")).map(option =>
        option.getAttribute("value"),
      );
      expect(options).toEqual(["", "DEEPGRAM", "ELEVENLABS", "SARVAM", "GOOGLE", "HUME"]);
    });

    it("clears the old provider's config on switch, rather than leaking it under a same-named field", () => {
      // Deepgram and ElevenLabs both use the key "model", but the values mean
      // completely different things — Deepgram's is "aura-asteria-en",
      // ElevenLabs' is "eleven_multilingual_v2". Carrying the old value
      // forward makes it look like valid Deepgram data.
      const elevenLabsVoice = {
        id: "voice-10",
        name: "Priya (public Rachel id)",
        provider: "ELEVENLABS",
        languageId: 1,
        config: {
          gender: "female",
          model: "eleven_multilingual_v2",
          voiceId: "21m00Tcm4TlvDq8ikWAM",
          voice_type: "pvc",
        },
        createdAt: "2024-01-15T10:00:00Z",
        updatedAt: "2024-01-15T10:00:00Z",
        active: true,
      };
      render(<ScenarioVoiceSidePanel {...defaultProps} selectedVoice={elevenLabsVoice} />);

      fireEvent.change(providerDropdown(), { target: { value: "DEEPGRAM" } });

      // Deepgram's Model is a catalog field too now, so this is a picker —
      // an empty selection, not a cleared text input.
      expect(screen.getByTestId("dropdown-Select model")).toHaveValue("");
      // gender is the one field every provider's schema shares — it survives.
      expect(screen.getByTestId("dropdown-Select gender")).toHaveValue("female");
      // Deepgram doesn't recognise voiceId or voice_type either, but they
      // must not linger as unrelated leftovers from the old provider.
      expect(screen.queryByText("voiceId")).not.toBeInTheDocument();
      expect(screen.queryByText("voice_type")).not.toBeInTheDocument();
    });

    it("tells the admin fields were cleared when switching away from a filled-in provider", () => {
      render(<ScenarioVoiceSidePanel {...defaultProps} selectedVoice={sarvamVoice} />);

      fireEvent.change(providerDropdown(), { target: { value: "HUME" } });

      expect(toast.success).toHaveBeenCalledWith(
        expect.stringContaining("previous provider's fields were cleared"),
      );
    });

    it("does not toast about clearing when there was nothing to clear", () => {
      render(<ScenarioVoiceSidePanel {...defaultProps} />);

      fireEvent.change(providerDropdown(), { target: { value: "ELEVENLABS" } });

      expect(toast.success).not.toHaveBeenCalled();
    });
  });

  describe("legacy providers", () => {
    const legacyVoice = { ...sarvamVoice, provider: "OPENAI", config: { gender: "male" } };

    it("warns about a stored provider the runtime has no client for", () => {
      const { container } = render(
        <ScenarioVoiceSidePanel {...defaultProps} selectedVoice={legacyVoice} />,
      );

      // The provider name sits in its own <strong>, so match on the container's
      // flattened text rather than a single text node.
      expect(container.textContent).toContain("fall back to a default Deepgram voice");
      expect(container.textContent).toContain("OPENAI");
    });

    it("keeps the stored value selectable so an unrelated edit can't rewrite it", () => {
      render(<ScenarioVoiceSidePanel {...defaultProps} selectedVoice={legacyVoice} />);

      expect(screen.getByText("OPENAI (unsupported)")).toBeInTheDocument();
    });

    it("blocks saving until a supported provider is chosen", () => {
      render(<ScenarioVoiceSidePanel {...defaultProps} selectedVoice={legacyVoice} />);
      expect(saveButton()).toBeDisabled();

      fireEvent.change(providerDropdown(), { target: { value: "GOOGLE" } });
      expect(saveButton()).toBeEnabled();
    });
  });

  describe("validation", () => {
    it("blocks saving when a provider-required field is missing", () => {
      const incomplete = { ...sarvamVoice, config: { gender: "male", model: "bulbul:v2" } };
      render(<ScenarioVoiceSidePanel {...defaultProps} selectedVoice={incomplete} />);

      expect(screen.getByText("Speaker is required.")).toBeInTheDocument();
      expect(saveButton()).toBeDisabled();
    });

    it("warns about a missing gender but still allows saving", () => {
      // The voice plays fine without one; what suffers is which languages the
      // studio offers. So it's advisory, not a blocker.
      const noGender = {
        ...sarvamVoice,
        config: { model: "bulbul:v2", speaker: "abhilash" },
      };
      const { container } = render(
        <ScenarioVoiceSidePanel {...defaultProps} selectedVoice={noGender} />,
      );

      expect(container.textContent).toContain("No gender set");
      expect(saveButton()).toBeEnabled();
    });

    it("drops the gender warning once one is chosen", () => {
      const noGender = {
        ...sarvamVoice,
        config: { model: "bulbul:v2", speaker: "abhilash" },
      };
      const { container } = render(
        <ScenarioVoiceSidePanel {...defaultProps} selectedVoice={noGender} />,
      );
      expect(container.textContent).toContain("No gender set");

      fireEvent.change(screen.getByTestId("dropdown-Select gender"), {
        target: { value: "female" },
      });

      expect(container.textContent).not.toContain("No gender set");
    });

    it("still rejects a gender value the rest of the system can't read", () => {
      const badGender = { ...sarvamVoice, config: { ...sarvamVoice.config, gender: "woman" } };
      render(<ScenarioVoiceSidePanel {...defaultProps} selectedVoice={badGender} />);

      expect(
        screen.getByText("Gender must be one of: Male, Female, Non-binary."),
      ).toBeInTheDocument();
      expect(saveButton()).toBeDisabled();
    });

    it("enables saving once the missing field is filled in", () => {
      const incomplete = { ...sarvamVoice, config: { gender: "male", model: "bulbul:v2" } };
      render(<ScenarioVoiceSidePanel {...defaultProps} selectedVoice={incomplete} />);

      fireEvent.change(screen.getByLabelText("Speaker"), { target: { value: "abhilash" } });

      expect(saveButton()).toBeEnabled();
    });

    it("accepts a Google voice with nothing beyond gender", () => {
      const googleVoice = {
        ...sarvamVoice,
        provider: "GOOGLE",
        config: { gender: "female" },
      };
      render(<ScenarioVoiceSidePanel {...defaultProps} selectedVoice={googleVoice} />);

      expect(saveButton()).toBeEnabled();
    });
  });

  describe("saving", () => {
    it("passes the edited config to onUpdate", () => {
      const onUpdate = vi.fn();
      render(
        <ScenarioVoiceSidePanel
          {...defaultProps}
          selectedVoice={sarvamVoice}
          onUpdate={onUpdate}
        />,
      );

      fireEvent.change(screen.getByLabelText("Speaker"), { target: { value: "anushka" } });
      fireEvent.click(saveButton());

      expect(onUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "voice-1",
          provider: "SARVAM",
          config: expect.objectContaining({ speaker: "anushka", model: "bulbul:v2" }),
        }),
      );
    });

    it("drops a cleared optional field instead of storing an empty string", () => {
      // An empty value reads as set at runtime, which is how a voice ends up
      // dispatching with a blank id.
      const onUpdate = vi.fn();
      render(
        <ScenarioVoiceSidePanel
          {...defaultProps}
          selectedVoice={sarvamVoice}
          onUpdate={onUpdate}
        />,
      );

      fireEvent.change(screen.getByLabelText("Age"), { target: { value: "" } });
      fireEvent.click(saveButton());

      expect(onUpdate).toHaveBeenCalledTimes(1);
      expect(onUpdate.mock.calls[0][0].config).not.toHaveProperty("age");
    });

    it("migrates a legacy alias to the canonical key when edited", () => {
      const onUpdate = vi.fn();
      const elevenLabsVoice = {
        ...sarvamVoice,
        provider: "ELEVENLABS",
        config: { gender: "female", model: "eleven_turbo_v2_5", voiceId: "old-id" },
      };
      render(
        <ScenarioVoiceSidePanel
          {...defaultProps}
          selectedVoice={elevenLabsVoice}
          onUpdate={onUpdate}
        />,
      );

      expect(screen.getByLabelText("Voice ID")).toHaveValue("old-id");
      fireEvent.change(screen.getByLabelText("Voice ID"), { target: { value: "new-id" } });
      fireEvent.click(saveButton());

      const savedConfig = onUpdate.mock.calls[0][0].config;
      expect(savedConfig.voice_id).toBe("new-id");
      expect(savedConfig).not.toHaveProperty("voiceId");
    });
  });

  describe("unknown keys", () => {
    const withExtraKey = {
      ...sarvamVoice,
      provider: "GOOGLE",
      config: { gender: "female", voice_name: "en-IN-Chirp3-HD-Achernar", languageCode: "en-IN" },
    };

    it("surfaces keys the provider schema does not describe", () => {
      render(<ScenarioVoiceSidePanel {...defaultProps} selectedVoice={withExtraKey} />);

      expect(screen.getByLabelText("languageCode")).toHaveValue("en-IN");
    });

    it("keeps them on save rather than silently dropping them", () => {
      const onUpdate = vi.fn();
      render(
        <ScenarioVoiceSidePanel
          {...defaultProps}
          selectedVoice={withExtraKey}
          onUpdate={onUpdate}
        />,
      );

      fireEvent.click(saveButton());

      expect(onUpdate.mock.calls[0][0].config.languageCode).toBe("en-IN");
    });

    it("does not block saving", () => {
      render(<ScenarioVoiceSidePanel {...defaultProps} selectedVoice={withExtraKey} />);
      expect(saveButton()).toBeEnabled();
    });
  });

  describe("custom keys", () => {
    const addKey = (name: string) => {
      fireEvent.click(screen.getByText("+ Add custom key"));
      fireEvent.change(screen.getByLabelText("New config key"), { target: { value: name } });
      fireEvent.click(screen.getByTestId("button-add"));
    };

    it("adds a key the schema doesn't describe, without going through JSON", () => {
      render(<ScenarioVoiceSidePanel {...defaultProps} selectedVoice={sarvamVoice} />);

      addKey("speed");

      expect(screen.getByLabelText("speed")).toBeInTheDocument();
      expect(screen.queryByTestId("auto-expandable-textarea")).not.toBeInTheDocument();
    });

    it("says the new key is ignored at runtime", () => {
      // The honest part: from_config() reads named keys, so an extra one
      // persists but does nothing.
      const { container } = render(
        <ScenarioVoiceSidePanel {...defaultProps} selectedVoice={sarvamVoice} />,
      );

      addKey("speed");

      expect(container.textContent).toContain("aren't read by SARVAM");
      expect(container.textContent).toContain("ignores");
    });

    it("saves the value typed into a custom key", () => {
      const onUpdate = vi.fn();
      render(
        <ScenarioVoiceSidePanel
          {...defaultProps}
          selectedVoice={sarvamVoice}
          onUpdate={onUpdate}
        />,
      );

      addKey("speed");
      fireEvent.change(screen.getByLabelText("speed"), { target: { value: "1.2" } });
      fireEvent.click(saveButton());

      expect(onUpdate.mock.calls[0][0].config.speed).toBe("1.2");
    });

    it("does not let a custom key shadow a real provider field", () => {
      render(<ScenarioVoiceSidePanel {...defaultProps} selectedVoice={sarvamVoice} />);

      fireEvent.click(screen.getByText("+ Add custom key"));
      fireEvent.change(screen.getByLabelText("New config key"), { target: { value: "speaker" } });
      fireEvent.click(screen.getByTestId("button-add"));

      expect(screen.getByText(/is a SARVAM field/)).toBeInTheDocument();
    });

    it("rejects a key that is already set", () => {
      render(<ScenarioVoiceSidePanel {...defaultProps} selectedVoice={sarvamVoice} />);

      addKey("speed");
      addKey("speed");

      expect(screen.getByText('"speed" is already set.')).toBeInTheDocument();
    });

    it("rejects an empty key name", () => {
      render(<ScenarioVoiceSidePanel {...defaultProps} selectedVoice={sarvamVoice} />);

      fireEvent.click(screen.getByText("+ Add custom key"));
      fireEvent.click(screen.getByTestId("button-add"));

      expect(screen.getByText("Enter a key name.")).toBeInTheDocument();
    });

    it("adding a custom key does not block saving", () => {
      render(<ScenarioVoiceSidePanel {...defaultProps} selectedVoice={sarvamVoice} />);

      addKey("speed");

      expect(saveButton()).toBeEnabled();
    });
  });

  describe("JSON escape hatch", () => {
    it("is off by default and toggles on", () => {
      render(<ScenarioVoiceSidePanel {...defaultProps} selectedVoice={sarvamVoice} />);
      expect(screen.queryByTestId("auto-expandable-textarea")).not.toBeInTheDocument();

      fireEvent.click(screen.getByText("Edit as JSON"));
      expect(screen.getByTestId("auto-expandable-textarea")).toBeInTheDocument();
    });

    it("opens showing the config the fields currently hold", () => {
      render(<ScenarioVoiceSidePanel {...defaultProps} selectedVoice={sarvamVoice} />);

      fireEvent.change(screen.getByLabelText("Speaker"), { target: { value: "anushka" } });
      fireEvent.click(screen.getByText("Edit as JSON"));

      expect(
        (screen.getByTestId("auto-expandable-textarea") as HTMLTextAreaElement).value,
      ).toContain("anushka");
    });

    it("reports invalid JSON", () => {
      render(<ScenarioVoiceSidePanel {...defaultProps} selectedVoice={sarvamVoice} />);
      fireEvent.click(screen.getByText("Edit as JSON"));

      fireEvent.change(screen.getByTestId("auto-expandable-textarea"), {
        target: { value: "{ invalid }" },
      });

      expect(screen.getByText(/Invalid JSON syntax/)).toBeInTheDocument();
      expect(saveButton()).toBeDisabled();
    });

    it("rejects a non-object", () => {
      render(<ScenarioVoiceSidePanel {...defaultProps} selectedVoice={sarvamVoice} />);
      fireEvent.click(screen.getByText("Edit as JSON"));

      fireEvent.change(screen.getByTestId("auto-expandable-textarea"), {
        target: { value: "[1, 2]" },
      });

      expect(
        screen.getByText(/Configuration must be a JSON object enclosed in curly braces/),
      ).toBeInTheDocument();
    });

    it("feeds edits back into the fields", () => {
      render(<ScenarioVoiceSidePanel {...defaultProps} selectedVoice={sarvamVoice} />);
      fireEvent.click(screen.getByText("Edit as JSON"));

      fireEvent.change(screen.getByTestId("auto-expandable-textarea"), {
        target: {
          value: JSON.stringify({ gender: "female", model: "bulbul:v2", speaker: "anushka" }),
        },
      });
      fireEvent.click(screen.getByText("Back to fields"));

      expect(screen.getByLabelText("Speaker")).toHaveValue("anushka");
    });
  });

  describe("language", () => {
    it("loads language options from the API", () => {
      render(<ScenarioVoiceSidePanel {...defaultProps} />);

      expect(screen.getByText("English (India)")).toBeInTheDocument();
      expect(screen.getByText("Hindi")).toBeInTheDocument();
    });
  });

  describe("auto-lookup for a new ElevenLabs voice", () => {
    const goToVoiceIdField = () => {
      render(<ScenarioVoiceSidePanel {...defaultProps} />);
      fireEvent.change(providerDropdown(), { target: { value: "ELEVENLABS" } });
      return screen.getByLabelText("Voice ID");
    };

    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("waits for something id-shaped before looking anything up", async () => {
      const voiceIdField = goToVoiceIdField();

      fireEvent.change(voiceIdField, { target: { value: "short" } });
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1000);
      });

      expect(mockLookupElevenLabsVoice).not.toHaveBeenCalled();
    });

    it("looks up a full id after a pause in typing, and fills in voice type and gender", async () => {
      mockLookupElevenLabsVoice.mockReturnValue({
        unwrap: () =>
          Promise.resolve({
            voiceId: "iA7mRIiSweGrLdznkosO",
            resolvedVoiceId: "iA7mRIiSweGrLdznkosO",
            voiceIdMismatch: false,
            category: "generated",
            resolvedName: "Meenakshi",
            voiceType: "voice_design",
            gender: "female",
            language: "ta",
            availableModels: ["eleven_turbo_v2_5", "eleven_v3"],
            recommendedModel: "eleven_turbo_v2_5",
          }),
      });
      const voiceIdField = goToVoiceIdField();

      fireEvent.change(voiceIdField, { target: { value: "iA7mRIiSweGrLdznkosO" } });
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1000);
      });

      expect(mockLookupElevenLabsVoice).toHaveBeenCalledWith("iA7mRIiSweGrLdznkosO");
      // The field the lookup filled in IS the result — there is no separate
      // banner restating it.
      expect(screen.getByTestId("dropdown-Select voice type")).toHaveValue("voice_design");
      expect(screen.getByTestId("dropdown-Select gender")).toHaveValue("female");
    });

    it("never overwrites a gender already chosen on the form", async () => {
      mockLookupElevenLabsVoice.mockReturnValue({
        unwrap: () =>
          Promise.resolve({
            voiceId: "iA7mRIiSweGrLdznkosO",
            resolvedVoiceId: "iA7mRIiSweGrLdznkosO",
            voiceIdMismatch: false,
            category: "generated",
            resolvedName: "Meenakshi",
            voiceType: "voice_design",
            gender: "female",
            language: "ta",
            availableModels: ["eleven_turbo_v2_5", "eleven_v3"],
            recommendedModel: "eleven_turbo_v2_5",
          }),
      });
      const voiceIdField = goToVoiceIdField();
      fireEvent.change(screen.getByTestId("dropdown-Select gender"), {
        target: { value: "male" },
      });

      fireEvent.change(voiceIdField, { target: { value: "iA7mRIiSweGrLdznkosO" } });
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1000);
      });
      // Confirms the lookup actually landed before asserting what it left alone.
      expect(screen.getByTestId("dropdown-Select voice type")).toHaveValue("voice_design");

      expect(screen.getByTestId("dropdown-Select gender")).toHaveValue("male");
    });

    it("shows the account-wide model catalog as a picker even with no per-voice sync yet", () => {
      render(<ScenarioVoiceSidePanel {...defaultProps} />);
      fireEvent.change(providerDropdown(), { target: { value: "ELEVENLABS" } });

      // No lookup has run — ally-be is the only source of a recommendation
      // verdict (via modelOptions), and it hasn't been asked yet, so the
      // catalog renders plain. The cautious "we don't know how this voice
      // was created" case is the warning banner's job (getElevenLabsV3Warning),
      // not a default flag baked into the picker.
      const modelDropdown = screen.getByTestId("dropdown-Select model");
      const options = Array.from(modelDropdown.querySelectorAll("option")).map(o => o.textContent);
      expect(options).toEqual([
        "Select model",
        "eleven_turbo_v2_5",
        "eleven_multilingual_v2",
        "eleven_v3",
      ]);
    });

    it("renders the per-voice recommendation ally-be computed for a lookup", async () => {
      mockLookupElevenLabsVoice.mockReturnValue({
        unwrap: () =>
          Promise.resolve({
            voiceId: "iA7mRIiSweGrLdznkosO",
            resolvedVoiceId: "iA7mRIiSweGrLdznkosO",
            voiceIdMismatch: false,
            category: "generated",
            resolvedName: "Meenakshi",
            voiceType: "voice_design",
            gender: "female",
            language: "ta",
            // Still used to auto-fill an empty Model field on lookup — a
            // convenience separate from rendering the picker's labels.
            recommendedModel: "eleven_turbo_v2_5",
            // ally-be's verdict for this voice — the panel renders this
            // directly rather than re-deriving it from raw catalog data.
            modelOptions: [
              { value: "eleven_turbo_v2_5", label: "eleven_turbo_v2_5", recommended: true },
              {
                value: "eleven_multilingual_v2",
                label: "eleven_multilingual_v2",
                recommended: false,
              },
              // v3 has no per-voice fine-tune signal (ElevenLabs never lists
              // it for any voice) but this voice's TYPE (voice_design) is one
              // it renders from just fine, so ally-be reports no verdict — a
              // real production voice ("Meenakshi") caught the regression
              // where the panel's own duplicate logic flagged it anyway.
              { value: "eleven_v3", label: "eleven_v3", recommended: null },
            ],
          }),
      });
      const voiceIdField = goToVoiceIdField();

      fireEvent.change(voiceIdField, { target: { value: "iA7mRIiSweGrLdznkosO" } });
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1000);
      });

      const modelDropdown = screen.getByTestId("dropdown-Select model");
      expect(modelDropdown).toHaveValue("eleven_turbo_v2_5");
      expect(screen.getByText("eleven_turbo_v2_5 (recommended)")).toBeInTheDocument();
      expect(screen.getByText("eleven_v3")).toBeInTheDocument();
      expect(screen.queryByText("eleven_v3 (not recommended)")).not.toBeInTheDocument();
      expect(screen.getByText("eleven_multilingual_v2 (not recommended)")).toBeInTheDocument();
    });

    it("still flags v3 as not recommended for a voice type it genuinely doesn't suit (PVC)", async () => {
      mockLookupElevenLabsVoice.mockReturnValue({
        unwrap: () =>
          Promise.resolve({
            voiceId: "RBxPIvrKOP4ugCK2jVHD",
            resolvedVoiceId: "RBxPIvrKOP4ugCK2jVHD",
            voiceIdMismatch: false,
            category: "professional",
            resolvedName: "Raju",
            voiceType: "pvc",
            gender: "male",
            language: "hi",
            modelOptions: [
              { value: "eleven_turbo_v2_5", label: "eleven_turbo_v2_5", recommended: null },
              {
                value: "eleven_multilingual_v2",
                label: "eleven_multilingual_v2",
                recommended: true,
              },
              { value: "eleven_v3", label: "eleven_v3", recommended: false },
            ],
          }),
      });
      const voiceIdField = goToVoiceIdField();

      fireEvent.change(voiceIdField, { target: { value: "RBxPIvrKOP4ugCK2jVHD" } });
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1000);
      });

      expect(screen.getByText("eleven_multilingual_v2 (recommended)")).toBeInTheDocument();
      expect(screen.getByText("eleven_v3 (not recommended)")).toBeInTheDocument();
    });

    it("does not flag every other model as unrecommended when ally-be reports no verdict at all", async () => {
      // A real production voice ("Meenakshi", Voice Design) caught this too:
      // ElevenLabs' high_quality_base_model_ids is genuinely empty for every
      // Voice Design voice (0 of 27 in the account-wide sweep). ally-be
      // reports `recommended: null` — "no signal either way" — for all of
      // them rather than treating absence-from-an-empty-list as a rejection.
      mockLookupElevenLabsVoice.mockReturnValue({
        unwrap: () =>
          Promise.resolve({
            voiceId: "iA7mRIiSweGrLdznkosO",
            resolvedVoiceId: "iA7mRIiSweGrLdznkosO",
            voiceIdMismatch: false,
            category: "generated",
            resolvedName: "Meenakshi",
            voiceType: "voice_design",
            gender: "female",
            language: "ta",
            modelOptions: [
              { value: "eleven_turbo_v2_5", label: "eleven_turbo_v2_5", recommended: null },
              {
                value: "eleven_multilingual_v2",
                label: "eleven_multilingual_v2",
                recommended: null,
              },
              { value: "eleven_v3", label: "eleven_v3", recommended: null },
            ],
          }),
      });
      const voiceIdField = goToVoiceIdField();

      fireEvent.change(voiceIdField, { target: { value: "iA7mRIiSweGrLdznkosO" } });
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1000);
      });

      // v3 is fine for this voice type (already covered above); the point
      // here is that NOTHING else gets flagged either.
      expect(screen.getByText("eleven_turbo_v2_5")).toBeInTheDocument();
      expect(screen.getByText("eleven_multilingual_v2")).toBeInTheDocument();
      expect(screen.queryByText(/not recommended/)).not.toBeInTheDocument();
    });

    it("hangs ElevenLabs' own category off the Voice type field, not a banner of its own", async () => {
      // The banner that used to carry this led with the plain-English type
      // title — the same string the Voice type field displays and the same
      // string the toast shows, so the one fact was on screen three times.
      // Only the raw category was ever unique to it, and it belongs next to
      // the field it describes.
      mockLookupElevenLabsVoice.mockReturnValue({
        unwrap: () =>
          Promise.resolve({
            voiceId: "iA7mRIiSweGrLdznkosO",
            resolvedVoiceId: "iA7mRIiSweGrLdznkosO",
            voiceIdMismatch: false,
            category: "generated",
            resolvedName: "Meenakshi",
            voiceType: "voice_design",
            gender: "female",
            language: "ta",
            modelOptions: [],
          }),
      });
      const voiceIdField = goToVoiceIdField();

      fireEvent.change(voiceIdField, { target: { value: "iA7mRIiSweGrLdznkosO" } });
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1000);
      });

      expect(screen.getByText(/ElevenLabs category: generated/)).toBeInTheDocument();
      // A clean sync is not an event worth its own panel.
      expect(screen.queryByTestId("elevenlabs-sync-result")).not.toBeInTheDocument();
    });

    it("still calls out an id that resolves to a different voice", async () => {
      // The one thing neither the toast, the Voice type field, nor the model
      // picker can surface — so this alert survives while the rest of the
      // banner went away. Observed on 7 of 77 production ids.
      mockLookupElevenLabsVoice.mockReturnValue({
        unwrap: () =>
          Promise.resolve({
            voiceId: "21m00Tcm4TlvDq8ikWAM",
            resolvedVoiceId: "eLDc7xhWxG2FElT3kUTj",
            storedVoiceId: "21m00Tcm4TlvDq8ikWAM",
            voiceIdMismatch: true,
            category: "professional",
            resolvedName: "Janet",
            voiceType: "pvc",
            gender: "female",
            language: "en",
            modelOptions: [],
          }),
      });
      const voiceIdField = goToVoiceIdField();

      fireEvent.change(voiceIdField, { target: { value: "21m00Tcm4TlvDq8ikWAM" } });
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1000);
      });

      const alert = screen.getByTestId("elevenlabs-sync-result");
      expect(alert).toHaveTextContent("different voice");
      expect(alert).toHaveTextContent("Janet");
    });

    it("keeps a stored model selectable even if it isn't in ElevenLabs' current catalog", () => {
      // A legacy/deprecated model id — not one of the three the mocked
      // catalog returns — must not silently disappear from a saved voice.
      const legacyModelVoice = {
        id: "voice-legacy",
        name: "Old ElevenLabs voice",
        provider: "ELEVENLABS",
        languageId: 1,
        config: {
          gender: "male",
          model: "eleven_monolingual_v1",
          voice_id: "someOldId1234567890",
        },
        createdAt: "2024-01-15T10:00:00Z",
        updatedAt: "2024-01-15T10:00:00Z",
        active: true,
      };
      render(<ScenarioVoiceSidePanel {...defaultProps} selectedVoice={legacyModelVoice} />);

      expect(screen.getByTestId("dropdown-Select model")).toHaveValue("eleven_monolingual_v1");
      expect(screen.getByText("eleven_monolingual_v1")).toBeInTheDocument();
    });

    it("does not auto-lookup once the voice is already saved", async () => {
      const elevenLabsVoice = {
        id: "voice-9",
        name: "Raju",
        provider: "ELEVENLABS",
        languageId: 1,
        config: { gender: "male", model: "eleven_v3", voice_id: "zT03pEAEi0VHKciJODfn" },
        createdAt: "2024-01-15T10:00:00Z",
        updatedAt: "2024-01-15T10:00:00Z",
        active: true,
      };
      render(<ScenarioVoiceSidePanel {...defaultProps} selectedVoice={elevenLabsVoice} />);

      await act(async () => {
        await vi.advanceTimersByTimeAsync(1000);
      });

      expect(mockLookupElevenLabsVoice).not.toHaveBeenCalled();
      // The explicit, demoted control for a saved voice instead of the old
      // primary "Sync from ElevenLabs" button.
      expect(screen.getByText("Re-check with ElevenLabs")).toBeInTheDocument();
    });
  });

  describe("closing", () => {
    it("confirms before discarding unsaved changes", () => {
      render(<ScenarioVoiceSidePanel {...defaultProps} selectedVoice={sarvamVoice} />);

      fireEvent.change(screen.getByLabelText("Speaker"), { target: { value: "anushka" } });
      fireEvent.click(screen.getByTestId("button-cancel"));

      expect(screen.getByTestId("confirmation-popup")).toBeInTheDocument();
    });

    it("closes straight away when nothing changed", () => {
      const onClose = vi.fn();
      render(
        <ScenarioVoiceSidePanel {...defaultProps} selectedVoice={sarvamVoice} onClose={onClose} />,
      );

      fireEvent.click(screen.getByTestId("button-cancel"));

      expect(onClose).toHaveBeenCalled();
      expect(screen.queryByTestId("confirmation-popup")).not.toBeInTheDocument();
    });
  });
});
