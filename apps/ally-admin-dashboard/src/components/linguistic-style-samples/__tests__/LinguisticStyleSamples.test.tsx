import { fireEvent, render, screen, waitFor } from "@testing-library/react";
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

vi.mock("@constants", () => ({
  DEFAULT_AUTOFILL_MODEL: "gpt-4o-mini",
  en: {
    simulation: {
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

  it("shows only languages with selected voices", () => {
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

    const hindiTabs = screen.getAllByRole("button", { name: "Hindi" });
    expect(hindiTabs).toHaveLength(2);
    expect(screen.queryByRole("button", { name: "English" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Malayalam" })).not.toBeInTheDocument();
  });

  it("generates samples only for selected languages", async () => {
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

    fireEvent.click(screen.getByRole("button", { name: /^Generate all$/i }));

    await waitFor(() => {
      expect(mockRegenerateField).toHaveBeenCalledTimes(1);
    });

    expect(mockRegenerateField).toHaveBeenCalledWith({
      fieldName: "linguisticStyleSamples",
      model: "gpt-4o-mini",
      scenarioContext: expect.objectContaining({
        languageId: "2",
        languageCode: "hi-IN",
        languageName: "Hindi",
      }),
    });
    expect(mockSetValue).toHaveBeenCalledWith("linguisticStyleSamples", { "2": ["sample-2"] });
  });

  it("generates allowed filler words via Generate all fillers", async () => {
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

    fireEvent.click(screen.getByRole("button", { name: /Generate all fillers/i }));

    await waitFor(() => {
      expect(mockRegenerateField).toHaveBeenCalled();
    });

    expect(mockRegenerateField).toHaveBeenCalledWith(
      expect.objectContaining({
        fieldName: "allowedFillerWords",
        scenarioContext: expect.objectContaining({ languageId: "2" }),
      }),
    );
    expect(mockSetValue).toHaveBeenCalledWith(
      "allowedFillerWords",
      expect.objectContaining({
        "2": expect.arrayContaining(["um", "like"]),
      }),
    );
  });
});
