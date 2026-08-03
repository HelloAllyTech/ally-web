import { render, screen, fireEvent, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock API hooks
const mockLookupElevenLabsVoice = vi.fn().mockReturnValue({
  unwrap: () => new Promise(() => {}), // never resolves unless a test overrides it
});
vi.mock("@api", () => ({
  useGetAvailableLanguageVoicesQuery: vi.fn(),
  useSyncElevenLabsVoiceMutation: () => [vi.fn(), { isLoading: false }],
  useLazyLookupElevenLabsVoiceQuery: () => [
    mockLookupElevenLabsVoice,
    { isFetching: false },
  ],
  useGetElevenLabsModelsQuery: vi.fn(),
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
    // The account-wide catalog the Model picker's options come from —
    // independent of any per-voice sync/lookup.
    (api.useGetElevenLabsModelsQuery as any).mockReturnValue({
      data: [
        { modelId: "eleven_turbo_v2_5", name: "eleven_turbo_v2_5" },
        { modelId: "eleven_multilingual_v2", name: "eleven_multilingual_v2" },
        { modelId: "eleven_v3", name: "eleven_v3" },
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

    it("swaps the fields when the provider changes", () => {
      render(<ScenarioVoiceSidePanel {...defaultProps} selectedVoice={sarvamVoice} />);

      fireEvent.change(providerDropdown(), { target: { value: "HUME" } });

      expect(screen.getByLabelText("Voice name")).toBeInTheDocument();
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
      expect(screen.getByTestId("elevenlabs-sync-result")).toHaveTextContent(
        "Generated with Voice Design",
      );
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
      screen.getByTestId("elevenlabs-sync-result");

      expect(screen.getByTestId("dropdown-Select gender")).toHaveValue("male");
    });

    it("shows the account-wide model catalog as a picker even with no per-voice sync yet", () => {
      render(<ScenarioVoiceSidePanel {...defaultProps} />);
      fireEvent.change(providerDropdown(), { target: { value: "ELEVENLABS" } });

      // No lookup has run — just the global catalog, with no annotations.
      const modelDropdown = screen.getByTestId("dropdown-Select model");
      const options = Array.from(modelDropdown.querySelectorAll("option")).map(
        o => o.textContent,
      );
      expect(options).toEqual([
        "Select model",
        "eleven_turbo_v2_5",
        "eleven_multilingual_v2",
        "eleven_v3",
      ]);
    });

    it("annotates the catalog once a lookup tells us which models this voice's fine-tune supports", async () => {
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
            // ElevenLabs never lists v3 here, for any voice — that's the point.
            availableModels: ["eleven_turbo_v2_5"],
            recommendedModel: "eleven_turbo_v2_5",
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
      // v3 is offered, but flagged as ElevenLabs' own list not including it —
      // not silently presented as equally supported.
      expect(
        screen.getByText("eleven_v3 (not listed by ElevenLabs for this voice — see warning below)"),
      ).toBeInTheDocument();
      // A non-v3 model missing from this voice's fine-tune list is a milder
      // case — nothing to warn about, so it gets softer wording.
      expect(
        screen.getByText("eleven_multilingual_v2 (not confirmed for this voice)"),
      ).toBeInTheDocument();
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

      expect(screen.getByTestId("dropdown-Select model")).toHaveValue(
        "eleven_monolingual_v1",
      );
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
