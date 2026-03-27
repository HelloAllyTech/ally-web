import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { LinguisticStyleSamples } from "../LinguisticStyleSamples";

const { mockRegenerateField, mockSetValue } = vi.hoisted(() => ({
  mockRegenerateField: vi.fn(),
  mockSetValue: vi.fn(),
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
  },
}));

describe("LinguisticStyleSamples", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRegenerateField.mockImplementation(({ scenarioContext }) => ({
      unwrap: () =>
        Promise.resolve({
          content: [`sample-${scenarioContext.languageId}`],
        }),
    }));
  });

  it("shows only languages with selected voices", () => {
    const formMethods = {
      watch: vi.fn((field: string) => {
        if (field === "languageVoices") {
          return { "2": "voice-hi" };
        }
        if (field === "linguisticStyleSamples") {
          return {};
        }
        return undefined;
      }),
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

    expect(screen.getByText("Hindi")).toBeInTheDocument();
    expect(screen.queryByText("English")).not.toBeInTheDocument();
    expect(screen.queryByText("Malayalam")).not.toBeInTheDocument();
  });

  it("generates samples only for selected languages", async () => {
    const formMethods = {
      watch: vi.fn((field: string) => {
        if (field === "languageVoices") {
          return { "2": "voice-hi" };
        }
        if (field === "linguisticStyleSamples") {
          return {};
        }
        return undefined;
      }),
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

    fireEvent.click(screen.getByRole("button", { name: /Generate all/i }));

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
});
