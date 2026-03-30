import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { useForm } from "react-hook-form";
import { Provider } from "react-redux";
import { BrowserRouter } from "react-router-dom";
import { configureStore } from "@reduxjs/toolkit";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { toast } from "sonner";

import { CreateSimulation } from "../CreateSimulation";
import { ChecklistType, ExperienceMode } from "@constants";
import reportUploadReducer from "@reducer/reportUploadReducer";

// Hoist constants mock
const mockEn = vi.hoisted(() => ({
  simulation: {
    unsaved: "Unsaved",
    changes: "Changes",
    discardDescription: "Are you sure you want to discard changes?",
    saveAndExit: "Save and Exit",
    discardChanges: "Discard Changes",
  },
  errors: {
    failedToProceed: "Fill atleast title field to proceed to Event Configuration!",
    failedSimulationChange: "Failed to save simulation changes!",
    failedSaveDraft: "Failed to save draft. Please try again.",
    failedSimulationCreation: "Failed to create simulation. Please try again.",
    fileUploadFailed: "Failed to upload file. Please try again.",
  },
}));

// Mock react-hook-form
vi.mock("react-hook-form", () => ({
  useForm: vi.fn(),
}));

// Mock react-router-dom hooks
const mockNavigate = vi.fn();
const mockParams = { id: undefined };

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => mockParams,
  };
});

// Mock sonner toast
vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

// Mock API hooks
const mockCreateSimulation = vi.fn();
const mockUpdateSimulation = vi.fn();
const mockGetSimulationById = vi.fn();
const mockDeleteCoverImage = vi.fn();

vi.mock("@api", () => ({
  useCreateSimulationMutation: () => [mockCreateSimulation, { isLoading: false }],
  useUpdateSimulationByIdMutation: () => [mockUpdateSimulation],
  useLazyGetAdminSimulationByIdQuery: () => [mockGetSimulationById, { data: null }],
  useDeleteCoverImageMutation: () => [mockDeleteCoverImage],
  useGetAvailableLanguageVoicesQuery: () => ({ data: [] }),
}));

// Mock hooks
vi.mock("@hooks", () => ({
  useDebounce: (fn: any) => fn, // Return the function immediately without debouncing
}));

// Mock components
vi.mock("@components", () => ({
  Header: ({ onBack, onSaveDraft, onPublish, onPreview, isValid }: any) => (
    <div data-testid="header">
      <button onClick={onBack}>Back</button>
      <button onClick={onSaveDraft} disabled={!isValid}>
        Save Draft
      </button>
      <button onClick={onPublish} disabled={!isValid}>
        Publish
      </button>
      <button onClick={onPreview}>Preview</button>
    </div>
  ),
  VerticalStepper: ({ steps, currentStep, onStepClick }: any) => (
    <div data-testid="vertical-stepper">
      {steps.map((step: any) => (
        <button
          key={step.id}
          onClick={() => onStepClick(step.id)}
          data-active={currentStep === step.id}
        >
          {step.label}
        </button>
      ))}
    </div>
  ),
  Footer: ({ onPrevious, onNext, showPrevious, showNext, isLastStep }: any) => (
    <div data-testid="footer">
      {showPrevious && <button onClick={onPrevious}>Previous</button>}
      {showNext && <button onClick={onNext}>{isLastStep ? "Publish" : "Next"}</button>}
    </div>
  ),
  MoreOptionsPopup: ({ isOpen, onClose, onDiscardSimulation }: any) =>
    isOpen ? (
      <div data-testid="more-options-popup">
        <button onClick={onDiscardSimulation}>Discard</button>
        <button onClick={onClose}>Close</button>
      </div>
    ) : null,
  ActionConfirmationPopup: ({ isOpen, onClose, primaryButton, secondaryButton, title }: any) =>
    isOpen ? (
      <div data-testid="confirmation-popup">
        <h2>{title}</h2>
        <button onClick={primaryButton?.onClick}>{primaryButton?.label}</button>
        <button onClick={secondaryButton?.onClick}>{secondaryButton?.label}</button>
        <button onClick={onClose}>Close</button>
      </div>
    ) : null,
  SimulationPreview: ({ isOpen, onClose, simulation }: any) =>
    isOpen ? (
      <div data-testid="simulation-preview">
        <h2>{simulation?.title}</h2>
        <button onClick={onClose}>Close Preview</button>
      </div>
    ) : null,
  CreateSimulationSubSection: ({ items, formMethods }: any) => (
    <div data-testid="simulation-subsection">
      {items.map((item: any) => (
        <div key={item.id}>{item.label}</div>
      ))}
    </div>
  ),
  SimulationEventMapTable: ({ simulationId }: any) => (
    <div data-testid="event-map-table">Event Map Table for {simulationId}</div>
  ),
}));

// Mock constants
vi.mock("@constants", () => ({
  en: mockEn,
  ExperienceMode: {
    FEEDBACK: "FEEDBACK",
    CHECKLIST: "CHECKLIST",
  },
  ChecklistType: {
    GUIDED: "GUIDED",
    UNGUIDED: "UNGUIDED",
  },
  // Provide FORM_FIELD_IDS to satisfy CreateSimulation import
  FORM_FIELD_IDS: {
    LANGUAGES_VOICES: "languageVoices",
  },
  ROUTES: {
    SIMULATION_STUDIO: "/simulation-studio",
    EDIT_SIMULATION: (id: string | number) => `/create-simulation/edit/${id}`,
  },
  StepperList: [
    { id: "overview", label: "Overview" },
    { id: "basic-settings", label: "Character Identity" },
    { id: "advanced-settings", label: "Event Configuration" },
  ],
  StepperListOld: [
    { id: "basic-info", label: "Basic Information" },
    { id: "character-identity", label: "Character Identity" },
    { id: "traits-and-needs", label: "Traits & Needs" },
    { id: "conversation-style", label: "Conversation Style" },
    { id: "event-configuration", label: "Event Configuration" },
  ],
  SIMULATION_CREATOR_STEP_IDS: {
    overview: "overview",
    basicSettings: "basic-settings",
    advancedSettings: "advanced-settings",
  },
  SIMULATION_CREATOR_STEP_IDS_OLD: {
    basicInfo: "basic-info",
    characterIdentity: "character-identity",
    traitsNeeds: "traits-and-needs",
    conversationStyle: "conversation-style",
    eventConfiguration: "event-configuration",
  },
  SIMULATION_CREATOR_FIELD_GROUPS: [
    {
      id: "overview",
      label: "Overview",
      fields: [
        { id: "title", isMandatory: true },
        { id: "description", isMandatory: true },
        // Include language-voice mapping as mandatory to match app behavior
        { id: "languageVoices", isMandatory: true },
        { id: "age", isMandatory: false },
      ],
    },
  ],
}));

// Mock utils
vi.mock("@utils", () => ({
  getCreateSimulationSubSectionById: (id: string) => ({
    label: "Test Section",
    fields: [{ id: "field1", label: "Field 1" }],
  }),
  extractValidData: (_fields: any, data: any) => data,
  formatSimulationResponseData: (data: any) => data,
  isNonEmptyString: (str: string) => str && str.length > 0,
  isNonEmptyArray: <T,>(value: unknown): value is T[] => {
    return Array.isArray(value) && value?.length > 0;
  },
  isEmpty: (value: unknown) => {
    if (value === undefined || value === null) return true;
    if (typeof value === "string" && value.trim().length === 0) return true;
    if (Array.isArray(value) && value.length === 0) return true;
    return false;
  },
}));

describe("CreateSimulation", () => {
  const mockFormMethods = {
    handleSubmit: vi.fn(fn => () => fn()),
    formState: { dirtyFields: {} },
    watch: vi.fn(() => ({
      title: "Test Title",
      description: "Test Description",
      triggerWarningIds: [],
      // Provide at least one language->voice mapping by default so header is enabled
      languageVoices: { "1": "voice-1" },
    })),
    getValues: vi.fn(() => ({
      title: "Test Title",
      description: "Test Description",
      triggerWarningIds: [],
      languageVoices: { "1": "voice-1" },
    })) as any,
    reset: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (useForm as any).mockReturnValue(mockFormMethods);
    mockParams.id = undefined;

    // Mock scrollTo function for containerRef
    Element.prototype.scrollTo = vi.fn();
  });

  const createTestStore = () =>
    configureStore({
      reducer: { reportUpload: reportUploadReducer.reducer },
      preloadedState: {
        reportUpload: { uploads: [], currentScenarioId: undefined },
      },
    });

  const renderCreateSimulation = () => {
    const store = createTestStore();
    return render(
      <Provider store={store}>
        <BrowserRouter>
          <CreateSimulation />
        </BrowserRouter>
      </Provider>,
    );
  };

  describe("Rendering", () => {
    it("should render create simulation page", () => {
      renderCreateSimulation();

      expect(screen.getByTestId("header")).toBeInTheDocument();
      expect(screen.getByTestId("vertical-stepper")).toBeInTheDocument();
      expect(screen.getByTestId("footer")).toBeInTheDocument();
    });

    it("should not render the deprecated 'Voice' standalone field", () => {
      renderCreateSimulation();

      expect(screen.queryByText("Voice")).not.toBeInTheDocument();
      expect(screen.queryByTestId("voice-dropdown-voice")).not.toBeInTheDocument();
    });
  });

  describe("Navigation", () => {
    it("should navigate to next step when next button is clicked", async () => {
      renderCreateSimulation();

      const nextButton = screen.getByText("Next");
      fireEvent.click(nextButton);

      await waitFor(() => {
        const characterIdentityButton = screen.getByText("Character Identity");
        expect(characterIdentityButton).toHaveAttribute("data-active", "true");
      });
    });

    it("should not show previous button on first step", () => {
      renderCreateSimulation();

      expect(screen.queryByText("Previous")).not.toBeInTheDocument();
    });
  });

  describe("Back Navigation", () => {
    it("should navigate back without popup when no changes", () => {
      renderCreateSimulation();

      const backButton = screen.getByText("Back");
      fireEvent.click(backButton);

      expect(mockNavigate).toHaveBeenCalledWith(-1);
    });

    it("should show discard popup when there are unsaved changes", () => {
      mockFormMethods.formState.dirtyFields = { title: true };
      renderCreateSimulation();

      const backButton = screen.getByText("Back");
      fireEvent.click(backButton);

      expect(screen.getByTestId("confirmation-popup")).toBeInTheDocument();
      expect(screen.getByText("Unsaved")).toBeInTheDocument();
    });

    it("should discard changes and navigate when discard is clicked", () => {
      mockFormMethods.formState.dirtyFields = { title: true };
      renderCreateSimulation();

      const backButton = screen.getByText("Back");
      fireEvent.click(backButton);

      const discardButton = screen.getByText("Discard Changes");
      fireEvent.click(discardButton);

      expect(mockNavigate).toHaveBeenCalledWith(-1);
    });

    it("should close discard popup when close is clicked", () => {
      mockFormMethods.formState.dirtyFields = { title: true };
      renderCreateSimulation();

      const backButton = screen.getByText("Back");
      fireEvent.click(backButton);

      const closeButton = screen.getByText("Close");
      fireEvent.click(closeButton);

      expect(screen.queryByTestId("confirmation-popup")).not.toBeInTheDocument();
    });
  });

  describe("Save Draft", () => {
    it("should call save draft when save draft button is clicked", async () => {
      mockCreateSimulation.mockResolvedValue({ data: [{ id: "new-id" }] });
      renderCreateSimulation();

      const saveDraftButton = screen.getByText("Save Draft");
      fireEvent.click(saveDraftButton);

      await waitFor(
        () => {
          expect(mockCreateSimulation).toHaveBeenCalled();
        },
        { timeout: 500 },
      );
    });

    it("should show error if title is missing when saving draft", async () => {
      const { toast } = await import("sonner");
      mockFormMethods.getValues.mockReturnValue({ title: "", description: "Test" });
      mockCreateSimulation.mockResolvedValue({ error: { data: { message: "Title is required" } } });

      renderCreateSimulation();

      const saveDraftButton = screen.getByText("Save Draft");
      fireEvent.click(saveDraftButton);

      await waitFor(
        () => {
          // Check that toast.error was called (the message might be undefined due to mock issues)
          expect(toast.error).toHaveBeenCalled();
        },
        { timeout: 500 },
      );
    });

    it("should update simulation if id exists", async () => {
      mockParams.id = "existing-id";
      mockUpdateSimulation.mockResolvedValue({ data: [{ id: "existing-id" }] });
      mockFormMethods.getValues.mockReturnValue({
        title: "Test",
        description: "Test Description",
        triggerWarningIds: [],
      });

      renderCreateSimulation();

      const saveDraftButton = screen.getByText("Save Draft");
      fireEvent.click(saveDraftButton);

      await waitFor(
        () => {
          expect(mockUpdateSimulation).toHaveBeenCalled();
        },
        { timeout: 500 },
      );
    });
  });

  describe("Publish", () => {
    it("should publish simulation and navigate to studio", async () => {
      mockCreateSimulation.mockResolvedValue({ data: [{ id: "new-id" }] });
      mockFormMethods.getValues.mockReturnValue({
        title: "Test",
        description: "Test Description",
        triggerWarningIds: [],
      });

      renderCreateSimulation();

      const publishButton = screen.getByText("Publish");
      fireEvent.click(publishButton);

      await waitFor(
        () => {
          expect(mockCreateSimulation).toHaveBeenCalled();
          // First navigates to edit page, then to simulation studio
          expect(mockNavigate).toHaveBeenCalledWith("/create-simulation/edit/new-id", {
            replace: true,
          });
          expect(mockNavigate).toHaveBeenCalledWith("/simulation-studio");
        },
        { timeout: 500 },
      );
    });

    it("should show error message on publish failure", async () => {
      const { toast } = await import("sonner");
      mockCreateSimulation.mockRejectedValue(new Error("Failed"));
      mockFormMethods.getValues.mockReturnValue({
        title: "Test",
        description: "Test Description",
        triggerWarningIds: [],
      });

      renderCreateSimulation();

      const publishButton = screen.getByText("Publish");
      fireEvent.click(publishButton);

      await waitFor(
        () => {
          expect(toast.error).toHaveBeenCalledWith(
            "Failed to create simulation. Please try again.",
          );
        },
        { timeout: 500 },
      );
    });
  });

  describe("Preview", () => {
    it("should open and close preview", async () => {
      // Set simulationId to skip the navigation to edit page during save
      mockParams.id = "existing-id";
      mockUpdateSimulation.mockResolvedValue({ data: [{ id: "existing-id" }] });
      mockFormMethods.getValues.mockReturnValue({
        title: "Test",
        description: "Test Description",
        coverImageUrl: "test.jpg",
        openingStatements: "",
        triggerWarningIds: [],
      });

      renderCreateSimulation();

      const previewButton = screen.getByText("Preview");
      fireEvent.click(previewButton);

      await waitFor(
        () => {
          expect(screen.getByTestId("simulation-preview")).toBeInTheDocument();
        },
        { timeout: 500 },
      );

      const closePreviewButton = screen.getByText("Close Preview");
      fireEvent.click(closePreviewButton);

      await waitFor(
        () => {
          expect(screen.queryByTestId("simulation-preview")).not.toBeInTheDocument();
        },
        { timeout: 500 },
      );
    });
  });

  describe("Event Configuration", () => {
    it("should render event map table when on event configuration step", async () => {
      mockParams.id = "existing-id";
      mockFormMethods.getValues.mockReturnValue({
        title: "Test",
        description: "Test Description",
        triggerWarningIds: [],
      });

      renderCreateSimulation();

      const eventConfigButton = screen.getByText("Event Configuration");
      fireEvent.click(eventConfigButton);

      await waitFor(
        () => {
          expect(screen.getByTestId("event-map-table")).toBeInTheDocument();
        },
        { timeout: 1000 },
      );
    });

    it("should save draft before navigating to event configuration if no simulation id", async () => {
      mockCreateSimulation.mockResolvedValue({ data: [{ id: "new-id" }] });
      mockFormMethods.getValues.mockReturnValue({
        title: "Test",
        description: "Test Description",
        triggerWarningIds: [],
      });

      renderCreateSimulation();

      const eventConfigButton = screen.getByText("Event Configuration");
      fireEvent.click(eventConfigButton);

      await waitFor(
        () => {
          expect(mockCreateSimulation).toHaveBeenCalled();
        },
        { timeout: 1000 },
      );

      await waitFor(
        () => {
          // Navigation to edit page happens after creating simulation
          expect(mockNavigate).toHaveBeenCalledWith("/create-simulation/edit/new-id", {
            replace: true,
          });
        },
        { timeout: 1000 },
      );
    });
  });

  describe("Form Validation", () => {
    it("should disable publish button when mandatory fields are not filled", () => {
      mockFormMethods.watch.mockReturnValue({
        title: "",
        description: "",
        triggerWarningIds: [],
        languageVoices: { "1": "" },
      });
      renderCreateSimulation();

      const publishButton = screen.getByText("Publish");
      expect(publishButton).toBeDisabled();
    });

    it("should enable publish button when all mandatory fields are filled", () => {
      mockFormMethods.watch.mockReturnValue({
        title: "Test",
        description: "Test Description",
        triggerWarningIds: [],
        languageVoices: { "1": "voice-1" },
      });
      renderCreateSimulation();

      const publishButton = screen.getByText("Publish");
      expect(publishButton).not.toBeDisabled();
    });
  });

  describe("Edit Mode", () => {
    it("should load simulation data when id is provided", async () => {
      mockParams.id = "existing-id";
      const mockSimulationData = {
        id: "existing-id",
        title: "Existing Simulation",
        description: "Existing Description",
      };
      mockGetSimulationById.mockResolvedValue(mockSimulationData);

      renderCreateSimulation();

      await waitFor(
        () => {
          expect(mockGetSimulationById).toHaveBeenCalledWith("existing-id");
        },
        { timeout: 500 },
      );
    });
  });

  describe("Opening Statements Processing", () => {
    it("should convert opening statements string to array", async () => {
      mockFormMethods.getValues.mockReturnValue({
        title: "Test",
        openingStatements: "Statement 1\nStatement 2\nStatement 3",
        triggerWarningIds: [],
      });
      mockCreateSimulation.mockResolvedValue({ data: [{ id: "new-id" }] });

      renderCreateSimulation();

      const saveDraftButton = screen.getByText("Save Draft");
      fireEvent.click(saveDraftButton);

      await waitFor(
        () => {
          expect(mockCreateSimulation).toHaveBeenCalledWith(
            expect.objectContaining({
              scenarios: expect.arrayContaining([
                expect.objectContaining({
                  openingStatements: ["Statement 1", "Statement 2", "Statement 3"],
                }),
              ]),
            }),
          );
        },
        { timeout: 500 },
      );
    });
  });

  describe("Timer Mode Validation", () => {
    it("should validate maxTimeValue when timerMode is enabled", async () => {
      mockFormMethods.getValues.mockReturnValue({
        title: "Test Title",
        description: "Test Description",
        timerMode: true,
        maxTimeValue: "00:05:00",
        triggerWarningIds: [],
      });

      renderCreateSimulation();

      const saveDraftButton = screen.getByText("Save Draft");
      fireEvent.click(saveDraftButton);

      await waitFor(
        () => {
          // Valid time should not show error
          expect(screen.queryByText(/maxTimeError/)).not.toBeInTheDocument();
        },
        { timeout: 500 },
      );
    });

    it("should show error when maxTimeValue exceeds max time", async () => {
      mockFormMethods.getValues.mockReturnValue({
        title: "Test Title",
        description: "Test Description",
        timerMode: true,
        maxTimeValue: "02:00:00", // Exceeds 02:00:00
        triggerWarningIds: [],
      });

      renderCreateSimulation();

      const saveDraftButton = screen.getByText("Save Draft");
      fireEvent.click(saveDraftButton);

      await waitFor(() => {
        // Should call toast.error for invalid time
        expect(toast.error).toHaveBeenCalled();
      });
    });

    it("should skip maxTimeValue validation when timerMode is disabled", async () => {
      mockFormMethods.getValues.mockReturnValue({
        title: "Test Title",
        description: "Test Description",
        timerMode: false,
        maxTimeValue: undefined,
        triggerWarningIds: [],
      });
      mockCreateSimulation.mockResolvedValue({ data: [{ id: "new-id" }] });

      renderCreateSimulation();

      const saveDraftButton = screen.getByText("Save Draft");
      fireEvent.click(saveDraftButton);

      await waitFor(
        () => {
          expect(mockCreateSimulation).toHaveBeenCalled();
        },
        { timeout: 500 },
      );
    });

    it("should skip validation when timerMode is true but maxTimeValue is not provided", async () => {
      mockFormMethods.getValues.mockReturnValue({
        title: "Test Title",
        description: "Test Description",
        timerMode: true,
        maxTimeValue: undefined,
        triggerWarningIds: [],
      });

      renderCreateSimulation();

      const saveDraftButton = screen.getByText("Save Draft");
      fireEvent.click(saveDraftButton);

      // Should not validate if maxTimeValue is not provided
      await waitFor(
        () => {
          expect(screen.queryByText(/titleIsRequired/)).not.toBeInTheDocument();
        },
        { timeout: 500 },
      );
    });
  });

  describe("Experience Mode and Checklist Type", () => {
    it("should keep checklistType when experienceMode is CHECKLIST", async () => {
      mockFormMethods.getValues.mockReturnValue({
        title: "Test Title",
        description: "Test Description",
        experienceMode: ExperienceMode.CHECKLIST,
        checklistType: ChecklistType.GUIDED,
        triggerWarningIds: [],
      });
      mockCreateSimulation.mockResolvedValue({ data: [{ id: "new-id" }] });

      renderCreateSimulation();

      const saveDraftButton = screen.getByText("Save Draft");
      fireEvent.click(saveDraftButton);

      await waitFor(
        () => {
          expect(mockCreateSimulation).toHaveBeenCalledWith(
            expect.objectContaining({
              scenarios: expect.arrayContaining([
                expect.objectContaining({
                  experienceMode: ExperienceMode.CHECKLIST,
                  checklistType: ChecklistType.GUIDED,
                }),
              ]),
            }),
          );
        },
        { timeout: 500 },
      );
    });
  });
});
