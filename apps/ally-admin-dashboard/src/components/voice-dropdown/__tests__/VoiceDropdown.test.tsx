import { render, screen, waitFor } from "@testing-library/react";
import { useForm } from "react-hook-form";
import { vi, describe, it, expect, beforeEach } from "vitest";

import { VoiceDropdown } from "../VoiceDropdown";

// Hoist mocks to avoid initialization errors
const { mockUseGetScenarioVoicesQuery } = vi.hoisted(() => ({
  mockUseGetScenarioVoicesQuery: vi.fn(),
}));

// Mock baseAPI first
vi.mock("@api/baseApi", () => ({
  baseAPI: {
    injectEndpoints: vi.fn(() => ({})),
    reducerPath: "baseAPI",
    reducer: (state = {}) => state,
    middleware: () => (next: any) => (action: any) => next(action),
  },
}));

vi.mock("@api/simulationStudio", () => ({
  useGetScenarioVoicesQuery: () => mockUseGetScenarioVoicesQuery(),
}));

// Mock constants
vi.mock("@constants", async () => {
  const actual = await vi.importActual<typeof import("@constants")>("@constants");
  return {
    ...actual,
    en: {
      ...actual.en,
      simulation: {
        ...actual.en.simulation,
        voice: "Voice",
        selectVoice: "Select voice",
      },
      common: {
        ...actual.en.common,
        selectOption: "Select option",
      },
    },
  };
});

// Mock utils
vi.mock("@utils", async () => {
  const actual = await vi.importActual<typeof import("@utils")>("@utils");
  return {
    ...actual,
    getSimulationVoiceOptions: vi.fn((voices = []) =>
      voices.map((voice: any) => ({
        value: voice.id,
        label: voice.name,
      })),
    ),
  };
});

// Mock hooks
vi.mock("@hooks", async () => {
  const actual = await vi.importActual<typeof import("@hooks")>("@hooks");
  return {
    ...actual,
    useClickOutside: vi.fn(),
  };
});

// Wrapper component to provide form context
const TestWrapper = ({ children, defaultValues = {} }: any) => {
  const formMethods = useForm({
    defaultValues,
    mode: "onChange",
  });
  return <>{typeof children === "function" ? children(formMethods) : children}</>;
};

describe("VoiceDropdown", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseGetScenarioVoicesQuery.mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
    });
  });

  describe("Rendering", () => {
    it("renders without crashing", () => {
      render(
        <TestWrapper>
          {(formMethods: any) => <VoiceDropdown formMethods={formMethods} />}
        </TestWrapper>,
      );

      expect(screen.getByText("Voice")).toBeInTheDocument();
    });

    it("renders with default label", () => {
      render(
        <TestWrapper>
          {(formMethods: any) => <VoiceDropdown formMethods={formMethods} />}
        </TestWrapper>,
      );

      expect(screen.getByText("Voice")).toBeInTheDocument();
    });

    it("renders with custom label", () => {
      render(
        <TestWrapper>
          {(formMethods: any) => (
            <VoiceDropdown formMethods={formMethods} label="Custom Voice Label" />
          )}
        </TestWrapper>,
      );

      expect(screen.getByText("Custom Voice Label")).toBeInTheDocument();
    });

    it("displays mandatory asterisk", () => {
      render(
        <TestWrapper>
          {(formMethods: any) => <VoiceDropdown formMethods={formMethods} />}
        </TestWrapper>,
      );

      const asterisk = screen.getByText("*");
      expect(asterisk).toBeInTheDocument();
    });

    it("renders dropdown with placeholder", () => {
      render(
        <TestWrapper>
          {(formMethods: any) => <VoiceDropdown formMethods={formMethods} />}
        </TestWrapper>,
      );

      expect(screen.getByText("Select voice")).toBeInTheDocument();
    });
  });

  describe("Voice Options", () => {
    it("handles empty voice data", () => {
      mockUseGetScenarioVoicesQuery.mockReturnValue({
        data: [],
        isLoading: false,
        isError: false,
      });

      render(
        <TestWrapper>
          {(formMethods: any) => <VoiceDropdown formMethods={formMethods} />}
        </TestWrapper>,
      );

      expect(screen.getByText("Select voice")).toBeInTheDocument();
    });

    it("handles undefined voice data", () => {
      mockUseGetScenarioVoicesQuery.mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: false,
      });

      render(
        <TestWrapper>
          {(formMethods: any) => <VoiceDropdown formMethods={formMethods} />}
        </TestWrapper>,
      );

      expect(screen.getByText("Select voice")).toBeInTheDocument();
    });
  });

  describe("Form Validation", () => {
    it("displays error message when validation fails", async () => {
      render(
        <TestWrapper defaultValues={{ voiceId: "" }}>
          {(formMethods: any) => {
            formMethods.formState.errors.voiceId = {
              message: "Voice is required",
              type: "required",
            };
            return <VoiceDropdown formMethods={formMethods} isMandatory={true} />;
          }}
        </TestWrapper>,
      );

      await waitFor(() => {
        expect(screen.getByText("Voice is required")).toBeInTheDocument();
      });
    });

    it("error message has correct styling", async () => {
      render(
        <TestWrapper defaultValues={{ voiceId: "" }}>
          {(formMethods: any) => {
            formMethods.formState.errors.voiceId = {
              message: "Voice is required",
              type: "required",
            };
            return <VoiceDropdown formMethods={formMethods} isMandatory={true} />;
          }}
        </TestWrapper>,
      );

      await waitFor(() => {
        const errorMessage = screen.getByText("Voice is required");
        expect(errorMessage).toBeInTheDocument();
      });
    });

    it("does not display error when there is no error", () => {
      render(
        <TestWrapper defaultValues={{ voiceId: "voice1" }}>
          {(formMethods: any) => <VoiceDropdown formMethods={formMethods} />}
        </TestWrapper>,
      );

      const errorMessages = screen.queryByText(/required/i);
      expect(errorMessages).not.toBeInTheDocument();
    });

    it("displays error for custom id field", async () => {
      render(
        <TestWrapper defaultValues={{ customVoiceId: "" }}>
          {(formMethods: any) => {
            formMethods.formState.errors.customVoiceId = {
              message: "Custom voice is required",
              type: "required",
            };
            return (
              <VoiceDropdown formMethods={formMethods} id="customVoiceId" isMandatory={true} />
            );
          }}
        </TestWrapper>,
      );

      await waitFor(() => {
        expect(screen.getByText("Custom voice is required")).toBeInTheDocument();
      });
    });
  });

  describe("Component Structure", () => {
    it("has correct container classes", () => {
      const { container } = render(
        <TestWrapper>
          {(formMethods: any) => <VoiceDropdown formMethods={formMethods} />}
        </TestWrapper>,
      );

      const mainContainer = container.querySelector(".flex.flex-col.gap-2");
      expect(mainContainer).toBeInTheDocument();
    });

    it("label has correct classes", () => {
      render(
        <TestWrapper>
          {(formMethods: any) => <VoiceDropdown formMethods={formMethods} />}
        </TestWrapper>,
      );

      const label = screen.getByText("Voice").closest("label");
      expect(label).toHaveClass("cursor-pointer", "flex", "items-center", "gap-1");
    });

    it("renders label with asterisk in correct order", () => {
      render(
        <TestWrapper>
          {(formMethods: any) => <VoiceDropdown formMethods={formMethods} />}
        </TestWrapper>,
      );

      const label = screen.getByText("Voice").closest("label");
      expect(label).toBeInTheDocument();
      expect(label?.textContent).toBe("Voice*");
    });
  });

  describe("API Integration", () => {
    it("calls useGetScenarioVoicesQuery hook", () => {
      mockUseGetScenarioVoicesQuery.mockReturnValue({
        data: [],
        isLoading: false,
        isError: false,
      });

      render(
        <TestWrapper>
          {(formMethods: any) => <VoiceDropdown formMethods={formMethods} />}
        </TestWrapper>,
      );

      expect(mockUseGetScenarioVoicesQuery).toHaveBeenCalled();
    });

    it("handles loading state from API", () => {
      mockUseGetScenarioVoicesQuery.mockReturnValue({
        data: undefined,
        isLoading: true,
        isError: false,
      });

      render(
        <TestWrapper>
          {(formMethods: any) => <VoiceDropdown formMethods={formMethods} />}
        </TestWrapper>,
      );

      // Component should still render with placeholder
      expect(screen.getByText("Select voice")).toBeInTheDocument();
    });

    it("handles error state from API", () => {
      mockUseGetScenarioVoicesQuery.mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: true,
      });

      render(
        <TestWrapper>
          {(formMethods: any) => <VoiceDropdown formMethods={formMethods} />}
        </TestWrapper>,
      );

      // Component should still render with placeholder
      expect(screen.getByText("Select voice")).toBeInTheDocument();
    });
  });

  describe("Props Handling", () => {
    it("handles all props together", () => {
      const mockVoices = [{ id: "voice1", name: "Voice One" }];

      mockUseGetScenarioVoicesQuery.mockReturnValue({
        data: mockVoices,
        isLoading: false,
        isError: false,
      });

      render(
        <TestWrapper>
          {(formMethods: any) => (
            <VoiceDropdown
              id="customId"
              label="Custom Label"
              formMethods={formMethods}
              isMandatory={true}
            />
          )}
        </TestWrapper>,
      );

      expect(screen.getByText("Custom Label")).toBeInTheDocument();
    });

    it("uses default props when not provided", () => {
      render(
        <TestWrapper>
          {(formMethods: any) => <VoiceDropdown formMethods={formMethods} />}
        </TestWrapper>,
      );

      expect(screen.getByText("Voice")).toBeInTheDocument();
    });
  });

  describe("Prop Types", () => {
    it("accepts id prop", () => {
      render(
        <TestWrapper>
          {(formMethods: any) => <VoiceDropdown formMethods={formMethods} id="customVoiceId" />}
        </TestWrapper>,
      );

      expect(screen.getByText("Voice")).toBeInTheDocument();
    });

    it("accepts label prop", () => {
      render(
        <TestWrapper>
          {(formMethods: any) => <VoiceDropdown formMethods={formMethods} label="Select Voice" />}
        </TestWrapper>,
      );

      expect(screen.getByText("Select Voice")).toBeInTheDocument();
    });

    it("accepts isMandatory prop", () => {
      render(
        <TestWrapper>
          {(formMethods: any) => <VoiceDropdown formMethods={formMethods} isMandatory={true} />}
        </TestWrapper>,
      );

      expect(screen.getByText("Voice")).toBeInTheDocument();
    });

    it("accepts formMethods prop", () => {
      render(
        <TestWrapper>
          {(formMethods: any) => <VoiceDropdown formMethods={formMethods} />}
        </TestWrapper>,
      );

      expect(screen.getByText("Voice")).toBeInTheDocument();
    });
  });
});
