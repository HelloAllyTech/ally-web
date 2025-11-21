import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock constants early to avoid importing real module that pulls in SimulationCreator
vi.mock("@constants", () => ({
  en: {
    simulation: {
      simulationstudio: "Simulation Studio",
      createSimulation: "Create Simulation",
      editSimulation: "Edit Simulation",
      createNewSimulation: "Create New Simulation",
      save: "Save",
      preview: "Preview",
      publish: "Publish",
      publishing: "Publishing",
      publishTooltipMessage: "",
      previewTooltipMessage: "",
    },
  },
  toolTipStyles: {
    tooltip: { sx: {} },
  },
  TAG_TYPES: {
    USERS: "users",
    TENANTS: "tenants",
    SESSION_EVENTS: "sessionEvents",
    SIMULATION: "simulation",
    SIMULATION_EVENTS: "simulationEvents",
  },
}));

import { Header } from "../Header";

vi.mock("react-router-dom", () => ({
  useParams: vi.fn(() => ({})),
}));

vi.mock("@assets", async importOriginal => {
  const actual = await importOriginal<typeof import("@assets")>();
  return {
    ...actual,
    ArrowDown: () => <svg data-testid="arrow-down" />,
  };
});

// Use real Button to avoid affecting other modules

vi.mock("sonner", () => {
  const success = vi.fn();
  const error = vi.fn();
  return { toast: { success, error } };
});

// Using mocked constants above

describe("Header", () => {
  const onBack = vi.fn();
  const onSaveDraft = vi.fn();
  const onPublish = vi.fn();
  const onPreview = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders create breadcrumb when no id present", () => {
    render(
      <Header
        isValid={true}
        onBack={onBack}
        onSaveDraft={onSaveDraft}
        onPublish={onPublish}
        onPreview={onPreview}
        title="Create Simulation"
      />,
    );

    expect(screen.getAllByText("Create Simulation").length).toBeGreaterThan(0);
    fireEvent.click(screen.getByText("Simulation Studio"));
    expect(onBack).toHaveBeenCalled();
  });

  it("renders edit breadcrumb when id present", async () => {
    const { useParams } = await import("react-router-dom");
    (useParams as any).mockReturnValue({ id: "123" });

    render(
      <Header
        isValid={true}
        onBack={onBack}
        onSaveDraft={onSaveDraft}
        onPublish={onPublish}
        onPreview={onPreview}
        title="Edit Simulation"
      />,
    );

    expect(screen.getAllByText("Edit Simulation").length).toBeGreaterThan(0);
  });

  it("enables/disables preview and publish based on isValid and isPublishing", () => {
    const { rerender } = render(
      <Header
        isValid={false}
        onBack={onBack}
        onSaveDraft={onSaveDraft}
        onPublish={onPublish}
        onPreview={onPreview}
        title="Test Simulation"
      />,
    );

    // Preview disabled
    expect(screen.getByText("Preview")).toBeDisabled();

    // Enable
    rerender(
      <Header
        isValid={true}
        onBack={onBack}
        onSaveDraft={onSaveDraft}
        onPublish={onPublish}
        onPreview={onPreview}
        title="Test Simulation"
      />,
    );
    expect(screen.getByText("Preview")).not.toBeDisabled();

    // Publishing state disables publish and shows text
    rerender(
      <Header
        isValid={true}
        isPublishing={true}
        onBack={onBack}
        onSaveDraft={onSaveDraft}
        onPublish={onPublish}
        onPreview={onPreview}
        title="Test Simulation"
      />,
    );
    expect(screen.getByText("Publishing")).toBeInTheDocument();
  });

  it("saves draft and shows toast based on response", async () => {
    onSaveDraft.mockResolvedValueOnce([{}]);
    render(
      <Header
        isValid={true}
        onBack={onBack}
        onSaveDraft={onSaveDraft}
        onPublish={onPublish}
        onPreview={onPreview}
        title="Test Simulation"
      />,
    );

    fireEvent.click(screen.getByText("Save"));
    await waitFor(async () => {
      const { toast } = await import("sonner");
      expect(toast.success).toHaveBeenCalled();
    });

    // Failure case
    {
      const { toast } = await import("sonner");
      (toast.success as any).mockClear();
    }
    onSaveDraft.mockResolvedValueOnce(null);
    fireEvent.click(screen.getByText("Save"));
    await waitFor(async () => {
      const { toast } = await import("sonner");
      expect(toast.error).toHaveBeenCalled();
    });
  });

  it("calls onPreview and onPublish when enabled", () => {
    render(
      <Header
        isValid={true}
        onBack={onBack}
        onSaveDraft={onSaveDraft}
        onPublish={onPublish}
        onPreview={onPreview}
        title="Test Simulation"
      />,
    );

    fireEvent.click(screen.getByText("Preview"));
    expect(onPreview).toHaveBeenCalled();

    fireEvent.click(screen.getByText("Publish"));
    expect(onPublish).toHaveBeenCalled();
  });
});
