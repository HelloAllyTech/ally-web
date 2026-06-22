import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { LinguisticStyleSamples } from "../LinguisticStyleSamples";

const { mockRegenerateField, mockSetValue } = vi.hoisted(() => ({
  mockRegenerateField: vi.fn(),
  mockSetValue: vi.fn(),
}));

vi.mock("react-hook-form", () => ({
  useWatch: ({ name }: { name: string }) => {
    if (name === "languageVoices") {
      return { "2": "voice-hi" };
    }
    if (name === "linguisticStyleSamples") {
      return {};
    }
    if (name === "allowedFillerWords") {
      return {};
    }
    return undefined;
  },
}));

vi.mock("@components/filler-tag-picker", () => ({
  FillerTagPicker: ({ tags, updateTags, maxTags }: any) => (
    <div data-testid="filler-helper-tag">
      {tags?.map((t: { id: string; name: string }) => (
        <span key={t.id}>{t.name}</span>
      ))}
      <button type="button" onClick={() => updateTags([...(tags ?? []), { id: "new", name: "x" }])}>
        add mock tag
      </button>
      <span data-testid="filler-max-tags">{maxTags}</span>
    </div>
  ),
}));

vi.mock("@api", () => ({
  useGetAutofillModelsQuery: () => ({
    data: ["gpt-4o-mini"],
    isLoading: false,
  }),
  useGetAvailableLanguageVoicesQuery: () => ({
    data: [
      { language_id: 1, value: "en-IN", label: "English" },
      { language_id: 2, value: "hi-IN", label: "Hindi" },
      { language_id: 3, value: "ml-IN", label: "Malayalam" },
    ],
    isLoading: false,
  }),
  useRegenerateFieldMutation: () => [mockRegenerateField],
}));

// LinguisticStyleSamples now self-gates each sub-panel via
// useIsPlaceholderUsed. Stub it to "no_selection" so both panels
// render in the default test path (existing assertions assume both
// are present). Body-driven hiding is exercised in FormField's own
// dedicated `hideWhenUnused gating` tests.
vi.mock("@hooks", () => ({
  useIsPlaceholderUsed: () => ({ isUsed: false, kind: "no_selection" }),
}));

vi.mock("@components/autofill-model-select", () => ({
  AutofillModelSelect: ({ value, onChange, disabled }: any) => (
    <select
      aria-label="Autofill Model"
      value={value}
      onChange={e => onChange(e.target.value)}
      disabled={disabled}
    >
      <option value="gpt-4o-mini">gpt-4o-mini</option>
    </select>
  ),
}));

vi.mock("@assets", () => ({
  WandStars: () => <span data-testid="wand-stars" />,
}));

vi.mock("../../enhance-button", () => ({
  EnhanceButton: () => null,
}));

vi.mock("@constants", () => ({
  DEFAULT_AUTOFILL_MODEL: "gpt-4o-mini",
  ENHANCE_TYPE: {
    LINGUISTIC_STYLE_SAMPLES: "linguisticStyleSamples",
    ALLOWED_FILLER_WORDS: "allowedFillerWords",
  },
  en: {
    simulation: {
      generate: "Generate",
      regenerate: "Regenerate",
      generating: "Generating",
      generatedFillersAllCount: (n: number) => `Generated for ${n}`,
      bulkGenerateNoSamples: "No samples saved",
      bulkGenerateNoFillers: "No fillers saved",
      allowedFillersSectionTitle: "Allowed filler words",
    },
    errors: {
      failedToRegenerate: "Failed to regenerate",
    },
  },
}));

vi.mock("@utils", () => ({
  isNonEmptyArray: (value: unknown) => Array.isArray(value) && value.length > 0,
}));

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
    warning: vi.fn(),
  },
}));

describe("LinguisticStyleSamples", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRegenerateField.mockImplementation(({ fieldName, scenarioContext }) => ({
      unwrap: () =>
        Promise.resolve({
          content:
            fieldName === "allowedFillerWords"
              ? ["um", "like"]
              : [`sample-${scenarioContext.languageId}`],
        }),
    }));
  });

  it("shows all catalog languages in both panels regardless of language–voice mapping", () => {
    const formMethods = {
      control: {},
      watch: vi.fn(),
      setValue: mockSetValue,
      getValues: vi.fn(() => ({
        title: "Test title",
        name: "Client",
        age: 25,
        gender: "Female",
        genderIdentity: "",
        sexualOrientation: "",
        profession: "Engineer",
        currentLocation: "Kochi",
        competency: { name: "Empathy" },
        characterProfileText: "Profile",
        description: "Challenge",
      })),
    };

    render(<LinguisticStyleSamples formMethods={formMethods} />);

    expect(screen.getAllByRole("tab", { name: "English" })).toHaveLength(2);
    expect(screen.getAllByRole("tab", { name: "Hindi" })).toHaveLength(2);
    expect(screen.getAllByRole("tab", { name: "Malayalam" })).toHaveLength(2);
  });
});
