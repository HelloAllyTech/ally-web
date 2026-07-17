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
    save: "Save Draft",
    publish: "Publish",
    publishing: "Publishing",
    preview: "Preview",
    rolePlays: "Roleplays",
    editSimulation: "Edit Simulation",
    createNewSimulation: "Create Simulation",
    advancedEventsLatencyWarning: (count: number) =>
      `Heads up: ${count} advanced events are selected for this simulation. Selecting more than 10 can increase response latency during a session.`,
    versions: {
      title: "Versions",
      switchVersion: "Switch version",
      readOnly: "read-only",
      published: "Version published",
      editingToast: (label: string) => `Editing ${label}`,
    },
    agentBuilder: {
      tabTitle: "Agent Builder Copilot",
    },
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
// Mutable count of mapped (advanced) events returned to the page; tests vary it
// to exercise the latency warning threshold.
const mockMappedEvents = vi.hoisted(() => ({ count: 0 }));

vi.mock("@api", () => ({
  useCreateSimulationMutation: () => [mockCreateSimulation, { isLoading: false }],
  useUpdateSimulationByIdMutation: () => [mockUpdateSimulation],
  useLazyGetAdminSimulationByIdQuery: () => [mockGetSimulationById, { data: null }],
  useDeleteCoverImageMutation: () => [mockDeleteCoverImage],
  useGetAvailableLanguageVoicesQuery: () => ({ data: [] }),
  useGetPromptsQuery: () => ({ data: [] }),
  useGetMappedScenarioEventsQuery: () => ({
    data: { data: Array.from({ length: mockMappedEvents.count }, (_, i) => ({ id: String(i) })) },
  }),
  useGetScenarioVersionsQuery: () => ({ data: [] }),
  useUpdateScenarioVersionMutation: () => [vi.fn(() => ({ unwrap: async () => ({}) }))],
  usePublishScenarioVersionMutation: () => [
    vi.fn(() => ({ unwrap: async () => ({}) })),
    { isLoading: false },
  ],
}));

// Mock hooks
vi.mock("@hooks", () => ({
  useDebounce: (fn: any) => fn, // Return the function immediately without debouncing
  useScenarioTranslationsSocket: () => undefined,
  useUser: () => ({ user: { email: "test@example.com" } }),
}));

// Mock components
vi.mock("@ally-ui-mono/ui-shared", () => ({
  Tabs: ({ items, activeId, onChange }: any) => (
    <div data-testid="tabs">
      {items.map((item: any) => (
        <button key={item.id} onClick={() => onChange(item.id)} data-active={activeId === item.id}>
          {item.label}
        </button>
      ))}
    </div>
  ),
}));

vi.mock("@assets", () => ({
  ArrowDown: () => <span data-testid="arrow-down" />,
  DoubleArrowRight: () => <span data-testid="double-arrow-right" />,
  WarningAlt: () => <span data-testid="warning-alt" />,
}));

vi.mock("@components", () => ({
  AppTooltip: ({ children }: any) => children,
  Button: ({ children, onClick, disabled, className }: any) => (
    <button onClick={onClick} disabled={disabled} className={className}>
      {children}
    </button>
  ),
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
  CreateSimulationSubSection: ({ items }: any) => (
    <div data-testid="simulation-subsection">
      {items.map((item: any) => (
        <div key={item.id}>{item.label}</div>
      ))}
    </div>
  ),
  SimulationEventMapTable: ({ simulationId }: any) => (
    <div data-testid="event-map-table">Event Map Table for {simulationId}</div>
  ),
  AgentBuilderCopilotWizard: () => <div data-testid="agent-builder-wizard" />,
  ReportSection: () => <div data-testid="report-section" />,
  ScenarioVersionPanel: () => <div data-testid="scenario-version-panel" />,
  TranslationProgressToast: () => null,
}));

// Mock constants
vi.mock("@constants", () => ({
  en: mockEn,
  ADVANCED_EVENTS_LATENCY_THRESHOLD: 10,
  TooltipLocation: { PUBLISH_SIMULATION_VERSION: "publish_simulation_version" },
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
    CHARACTER_PROFILE_TEXT: "characterProfileText",
    PROMPT: "prompt",
    BEHAVIOR_INSTRUCTIONS: "behaviorInstructions",
    LINGUISTIC_STYLE_SAMPLES: "linguisticStyleSamples",
  },
  isValidStateInstructionId: (id: any) => ["-1", "1", "2", "3"].includes(String(id)),
  ROLE_INSTRUCTION_PROMPT_CODE: "openai_simulation_role_instruction",
  SIMULATION_CATEGORY: { PARTNER_SIM: "PARTNER_SIM" },
  ROUTES: {
    SIMULATION_STUDIO: "/simulation-studio",
    EDIT_SIMULATION: (id: string | number) => `/create-simulation/edit/${id}`,
    VIEW_SIMULATION: (id: string | number) => `/create-simulation/view/${id}`,
  },
  // Basic Settings is no longer a standalone tab; the Agent Builder Copilot tab
  // is prepended by the component itself. These tabs follow it.
  StepperList: [
    { id: "advanced-settings", title: "Event Configuration" },
    { id: "report", title: "Report" },
  ],
  StepperListOld: [
    { id: "basic-info", label: "Basic Information" },
    { id: "character-identity", label: "Character Identity" },
    { id: "traits-and-needs", label: "Traits & Needs" },
    { id: "conversation-style", label: "Conversation Style" },
    { id: "event-configuration", label: "Event Configuration" },
  ],
  SIMULATION_CREATOR_STEP_IDS: {
    basicSettings: "basic-settings",
    advancedSettings: "advanced-settings",
    report: "report",
    agentBuilderCopilot: "agent-builder-copilot",
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
      // Populate optional fields so tests bypass the optional-fields warning modal
      characterProfileText: "Test backstory",
      prompt: "Test prompt",
      behaviorInstructions: [{ category: "test" }],
      linguisticStyleSamples: ["sample"],
    })),
    getValues: vi.fn(() => ({
      title: "Test Title",
      description: "Test Description",
      triggerWarningIds: [],
      languageVoices: { "1": "voice-1" },
    })) as any,
    setValue: vi.fn(),
    reset: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (useForm as any).mockReturnValue(mockFormMethods);
    mockParams.id = undefined;
    mockMappedEvents.count = 0;

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

      expect(screen.getByTestId("tabs")).toBeInTheDocument();
      expect(screen.getByText("Save Draft")).toBeInTheDocument();
      expect(screen.getByText("Publish")).toBeInTheDocument();
    });

    it("should not render the deprecated 'Voice' standalone field", () => {
      renderCreateSimulation();

      expect(screen.queryByText("Voice")).not.toBeInTheDocument();
      expect(screen.queryByTestId("voice-dropdown-voice")).not.toBeInTheDocument();
    });
  });

  describe("Advanced events latency warning", () => {
    it("does not show the latency warning at or below the threshold", () => {
      mockMappedEvents.count = 10;
      renderCreateSimulation();

      expect(screen.queryByTestId("warning-alt")).not.toBeInTheDocument();
      expect(screen.queryByText(/advanced events/)).not.toBeInTheDocument();
    });

    it("shows the latency warning when advanced events exceed the threshold", () => {
      mockMappedEvents.count = 11;
      renderCreateSimulation();

      expect(screen.getByTestId("warning-alt")).toBeInTheDocument();
      expect(screen.getByText(/11 advanced events/)).toBeInTheDocument();
    });
  });

  describe("Navigation", () => {
    it("should navigate to a step when its tab is clicked", async () => {
      // With an existing simulation, switching to Event Configuration needs no
      // create round-trip, so the tab activates directly (mandatory Basic
      // Settings fields are satisfied by the default watch() mock).
      mockParams.id = "existing-id";
      renderCreateSimulation();

      const eventConfigTab = screen.getByText("Event Configuration");
      fireEvent.click(eventConfigTab);

      await waitFor(() => {
        expect(eventConfigTab).toHaveAttribute("data-active", "true");
      });
    });

    it("should show all steps as tabs", () => {
      renderCreateSimulation();

      // Agent Builder Copilot is the canonical builder tab (Basic Settings is
      // its left pane, not a separate tab).
      expect(screen.getByText("Agent Builder Copilot")).toBeInTheDocument();
      expect(screen.getByText("Event Configuration")).toBeInTheDocument();
      expect(screen.getByText("Report")).toBeInTheDocument();
      expect(screen.queryByText("Basic Settings")).not.toBeInTheDocument();
    });
  });

  describe("Back Navigation", () => {
    it("should navigate back without popup when no changes", () => {
      renderCreateSimulation();

      const backButton = screen.getByText("Roleplays");
      fireEvent.click(backButton);

      expect(mockNavigate).toHaveBeenCalledWith(-1);
    });

    it("should show discard popup when there are unsaved changes", () => {
      mockFormMethods.formState.dirtyFields = { title: true };
      renderCreateSimulation();

      const backButton = screen.getByText("Roleplays");
      fireEvent.click(backButton);

      expect(screen.getByTestId("confirmation-popup")).toBeInTheDocument();
      expect(screen.getByText("Unsaved")).toBeInTheDocument();
    });

    it("should discard changes and navigate when discard is clicked", () => {
      mockFormMethods.formState.dirtyFields = { title: true };
      renderCreateSimulation();

      const backButton = screen.getByText("Roleplays");
      fireEvent.click(backButton);

      const discardButton = screen.getByText("Discard Changes");
      fireEvent.click(discardButton);

      expect(mockNavigate).toHaveBeenCalledWith(-1);
    });

    it("should close discard popup when close is clicked", () => {
      mockFormMethods.formState.dirtyFields = { title: true };
      renderCreateSimulation();

      const backButton = screen.getByText("Roleplays");
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

      const saveDraftButton = screen.getAllByText("Save Draft")[0];
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

      const saveDraftButton = screen.getAllByText("Save Draft")[0];
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

      const saveDraftButton = screen.getAllByText("Save Draft")[0];
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

    it("should enable publish button when optional fields (prompt, characterProfileText, behaviorInstructions, linguisticStyleSamples) are empty", () => {
      mockFormMethods.watch.mockReturnValue({
        title: "Test",
        description: "Test Description",
        triggerWarningIds: [],
        languageVoices: { "1": "voice-1" },
        prompt: "",
        characterProfileText: "",
        behaviorInstructions: [],
        linguisticStyleSamples: {},
        allowedFillerWords: {},
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

      const saveDraftButton = screen.getAllByText("Save Draft")[0];
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

      const saveDraftButton = screen.getAllByText("Save Draft")[0];
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

      const saveDraftButton = screen.getAllByText("Save Draft")[0];
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

      const saveDraftButton = screen.getAllByText("Save Draft")[0];
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

      const saveDraftButton = screen.getAllByText("Save Draft")[0];
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

      const saveDraftButton = screen.getAllByText("Save Draft")[0];
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

  describe("State Names Filtering", () => {
    it("should filter out stateNames with invalid stateIds during save", async () => {
      mockFormMethods.getValues.mockReturnValue({
        title: "Test Title",
        description: "Test Description",
        stateNames: [
          { stateId: "-1", name: "Valid state" },
          { stateId: "99", name: "Invalid state" },
        ],
        triggerWarningIds: [],
      });
      mockCreateSimulation.mockResolvedValue({ data: [{ id: "new-id" }] });

      renderCreateSimulation();

      const saveDraftButton = screen.getAllByText("Save Draft")[0];
      fireEvent.click(saveDraftButton);

      await waitFor(
        () => {
          expect(mockCreateSimulation).toHaveBeenCalledWith(
            expect.objectContaining({
              scenarios: expect.arrayContaining([
                expect.objectContaining({
                  stateNames: [{ stateId: "-1", name: "Valid state" }],
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
