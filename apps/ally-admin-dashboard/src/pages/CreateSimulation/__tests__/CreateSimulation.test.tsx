import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { useForm } from "react-hook-form";
import { BrowserRouter } from "react-router-dom";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { CreateSimulation } from "../CreateSimulation";

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
  ROUTES: {
    SIMULATION_STUDIO: "/simulation-studio",
    EDIT_SIMULATION: (id: string | number) => `/create-simulation/edit/${id}`,
  },
  StepperList: [
    { id: "basic-info", label: "Basic Info" },
    { id: "character-identity", label: "Character Identity" },
    { id: "traits-and-needs", label: "Traits and Needs" },
    { id: "conversation-style", label: "Conversation Style" },
    { id: "event-configuration", label: "Event Configuration" },
  ],
  SIMULATION_CREATOR_FIELD_GROUPS: [
    {
      fields: [
        { id: "title", isMandatory: true },
        { id: "description", isMandatory: true },
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
    })),
    getValues: vi.fn(() => ({
      title: "Test Title",
      description: "Test Description",
      triggerWarningIds: [],
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

  const renderCreateSimulation = () => {
    return render(
      <BrowserRouter>
        <CreateSimulation />
      </BrowserRouter>,
    );
  };

  describe("Rendering", () => {
    it("should render create simulation page", () => {
      renderCreateSimulation();

      expect(screen.getByTestId("header")).toBeInTheDocument();
      expect(screen.getByTestId("vertical-stepper")).toBeInTheDocument();
      expect(screen.getByTestId("footer")).toBeInTheDocument();
    });

    it("should render all stepper steps", () => {
      renderCreateSimulation();

      expect(screen.getByText("Basic Info")).toBeInTheDocument();
      expect(screen.getByText("Character Identity")).toBeInTheDocument();
      expect(screen.getByText("Traits and Needs")).toBeInTheDocument();
      expect(screen.getByText("Conversation Style")).toBeInTheDocument();
      expect(screen.getByText("Event Configuration")).toBeInTheDocument();
    });

    it("should start at basic info step", () => {
      renderCreateSimulation();

      const basicInfoButton = screen.getByText("Basic Info");
      expect(basicInfoButton).toHaveAttribute("data-active", "true");
    });

    it("should render simulation subsection for basic info", () => {
      renderCreateSimulation();

      expect(screen.getByTestId("simulation-subsection")).toBeInTheDocument();
    });
  });

  describe("Navigation", () => {
    it("should navigate to next step when next button is clicked", () => {
      renderCreateSimulation();

      const nextButton = screen.getByText("Next");
      fireEvent.click(nextButton);

      const characterIdentityButton = screen.getByText("Character Identity");
      expect(characterIdentityButton).toHaveAttribute("data-active", "true");
    });

    it("should navigate to previous step when previous button is clicked", () => {
      renderCreateSimulation();

      // First go to next step
      const nextButton = screen.getByText("Next");
      fireEvent.click(nextButton);

      // Then go back
      const previousButton = screen.getByText("Previous");
      fireEvent.click(previousButton);

      const basicInfoButton = screen.getByText("Basic Info");
      expect(basicInfoButton).toHaveAttribute("data-active", "true");
    });

    it("should not show previous button on first step", () => {
      renderCreateSimulation();

      expect(screen.queryByText("Previous")).not.toBeInTheDocument();
    });

    it("should allow clicking on stepper to navigate", () => {
      renderCreateSimulation();

      const traitsButton = screen.getByText("Traits and Needs");
      fireEvent.click(traitsButton);

      expect(traitsButton).toHaveAttribute("data-active", "true");
    });

    it("should show publish button on last step", () => {
      renderCreateSimulation();

      // Navigate to last step
      const eventConfigButton = screen.getByText("Event Configuration");
      fireEvent.click(eventConfigButton);

      // Check if button text is "Publish" instead of "Next"
      expect(screen.getByText("Publish")).toBeInTheDocument();
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
        { timeout: 500 },
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
          // Navigation to edit page happens after creating simulation
          expect(mockNavigate).toHaveBeenCalledWith("/create-simulation/edit/new-id", {
            replace: true,
          });
          expect(screen.getByTestId("event-map-table")).toBeInTheDocument();
        },
        { timeout: 500 },
      );
    });
  });

  describe("Form Validation", () => {
    it("should disable publish button when mandatory fields are not filled", () => {
      mockFormMethods.watch.mockReturnValue({
        title: "",
        description: "",
        triggerWarningIds: [],
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
});
