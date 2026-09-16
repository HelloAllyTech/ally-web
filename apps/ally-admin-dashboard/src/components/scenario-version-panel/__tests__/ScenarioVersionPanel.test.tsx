import { render, screen, fireEvent } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";

import { ScenarioVersionPanel } from "../ScenarioVersionPanel";
import { ScenarioVersionStatus, ScenarioVersionType } from "@types";

const {
  mockUseGetScenarioVersionsQuery,
  mockCreateVersion,
  mockUpdateVersion,
  mockDeleteVersion,
} = vi.hoisted(() => ({
  mockUseGetScenarioVersionsQuery: vi.fn(),
  mockCreateVersion: vi.fn(),
  mockUpdateVersion: vi.fn(),
  mockDeleteVersion: vi.fn(),
}));

vi.mock("@api", () => ({
  useGetScenarioVersionsQuery: (...args: any[]) => mockUseGetScenarioVersionsQuery(...args),
  useCreateScenarioVersionMutation: () => [mockCreateVersion, { isLoading: false }],
  useUpdateScenarioVersionMutation: () => [mockUpdateVersion, { isLoading: false }],
  useDeleteScenarioVersionMutation: () => [mockDeleteVersion, { isLoading: false }],
}));

vi.mock("@assets", () => ({
  Branch: () => <span data-testid="icon-branch" />,
  Close: () => <span data-testid="icon-close" />,
  Edit: () => <span data-testid="icon-edit" />,
  Tick: () => <span data-testid="icon-tick" />,
  Trash: () => <span data-testid="icon-trash" />,
}));

vi.mock("@components", () => ({
  ActionConfirmationPopup: () => null,
}));

vi.mock("@components/types", () => ({
  ButtonVariant: { DESTRUCTIVE: "DESTRUCTIVE", SECONDARY: "SECONDARY" },
}));

vi.mock("@utils", () => ({
  formatDate: (d: string) => d,
}));

vi.mock("@constants", () => ({
  en: {
    simulation: {
      versions: {
        title: "Versions",
        newVersion: "+ New version",
        loading: "Loading…",
        empty: "No versions yet. Create one to start iterating.",
        editing: "editing",
        openTooltip: "Open this version in the editor",
        branch: "Branch",
        rename: "Rename",
        delete: "Delete",
        create: "Create",
        save: "Save",
        cancel: "Cancel",
        namePlaceholder: "e.g. warmer opener",
        newBlankTitle: "New blank version",
        branchingFrom: (label: string) => `Branching from ${label}`,
        deleteTitle: "Delete",
        deleteDescription: "This draft version will be removed. This can't be undone.",
        statusLabel: { DRAFT: "Draft", PUBLISHED: "Published", ARCHIVED: "Archived" },
        created: (label: string) => `Created ${label}`,
        renamed: (label: string) => `Renamed to ${label}`,
        deleted: (label: string) => `Deleted ${label}`,
        createError: "err",
        renameError: "err",
        deleteError: "err",
        autoBadge: "Auto",
      },
    },
  },
}));

const manualVersion = {
  id: "v-manual",
  scenarioId: 1,
  versionNumber: 1,
  name: null,
  config: {},
  status: ScenarioVersionStatus.DRAFT,
  type: ScenarioVersionType.MANUAL,
  isLive: true,
  createdAt: "2023-10-26T00:00:00.000Z",
  updatedAt: "2023-10-26T00:00:00.000Z",
};

const autoVersion = {
  id: "v-auto",
  scenarioId: 1,
  versionNumber: 2,
  name: "Auto-save 2023-10-27",
  config: {},
  status: ScenarioVersionStatus.DRAFT,
  type: ScenarioVersionType.AUTOMATIC,
  isLive: false,
  createdAt: "2023-10-27T00:05:00.000Z",
  updatedAt: "2023-10-27T00:05:00.000Z",
};

describe("ScenarioVersionPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseGetScenarioVersionsQuery.mockReturnValue({
      data: [autoVersion, manualVersion],
      isFetching: false,
    });
  });

  it("renders both manual and automatic versions, with the auto-save name shown and badged", () => {
    render(
      <ScenarioVersionPanel scenarioId={1} isOpen onClose={vi.fn()} onEditVersion={vi.fn()} />,
    );

    expect(screen.getByText("Auto-save 2023-10-27 · v2")).toBeInTheDocument();
    expect(screen.getByText("v1")).toBeInTheDocument();
    expect(screen.getByText("Auto")).toBeInTheDocument();
  });

  it("reverting: branching from an older version calls createVersion with fromVersionId and switches editing context", async () => {
    const onEditVersion = vi.fn();
    const created = { id: "v-new", versionNumber: 3, name: "" };
    mockCreateVersion.mockReturnValue({ unwrap: () => Promise.resolve(created) });

    render(
      <ScenarioVersionPanel
        scenarioId={1}
        isOpen
        onClose={vi.fn()}
        onEditVersion={onEditVersion}
      />,
    );

    // Open the branch/revert row for the auto-save version.
    fireEvent.click(screen.getAllByTitle("Branch")[0]);
    fireEvent.click(screen.getByTitle("Create"));

    await vi.waitFor(() => {
      expect(mockCreateVersion).toHaveBeenCalledWith(
        expect.objectContaining({ scenarioId: 1, fromVersionId: "v-auto" }),
      );
      expect(onEditVersion).toHaveBeenCalledWith(created);
    });
  });
});
