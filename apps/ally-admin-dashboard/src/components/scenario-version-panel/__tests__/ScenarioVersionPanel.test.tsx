import { render, screen, fireEvent } from "@testing-library/react";
import { toast } from "sonner";
import { vi, describe, it, expect, beforeEach } from "vitest";

import { ScenarioVersionPanel } from "../ScenarioVersionPanel";
import { ScenarioVersionStatus, ScenarioVersionType, formatVersionLabel } from "@types";

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

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("@assets", () => ({
  Branch: () => <span data-testid="icon-branch" />,
  Close: () => <span data-testid="icon-close" />,
  Edit: () => <span data-testid="icon-edit" />,
  Tick: () => <span data-testid="icon-tick" />,
  Trash: () => <span data-testid="icon-trash" />,
}));

// A stand-in for the real confirmation popup: renders just enough to drive the
// destructive flow (its own tests cover its markup).
vi.mock("@components", () => ({
  ActionConfirmationPopup: ({ isOpen, titleItalic, primaryButton, secondaryButton }: any) =>
    isOpen ? (
      <div data-testid="confirm-popup">
        <span data-testid="confirm-title">{titleItalic}</span>
        <button onClick={primaryButton.onClick}>{`confirm-${primaryButton.label}`}</button>
        <button onClick={secondaryButton.onClick}>{`dismiss-${secondaryButton.label}`}</button>
      </div>
    ) : null,
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
        createError: "Couldn't create a new version",
        renameError: "Couldn't rename this version",
        deleteError: "Couldn't delete this version",
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

const publishedVersion = {
  ...autoVersion,
  id: "v-published",
  versionNumber: 3,
  name: "Shipped opener",
  status: ScenarioVersionStatus.PUBLISHED,
  type: ScenarioVersionType.MANUAL,
};

const renderPanel = (props: Partial<React.ComponentProps<typeof ScenarioVersionPanel>> = {}) =>
  render(
    <ScenarioVersionPanel
      scenarioId={1}
      isOpen
      onClose={vi.fn()}
      onEditVersion={vi.fn()}
      {...props}
    />,
  );

describe("ScenarioVersionPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseGetScenarioVersionsQuery.mockReturnValue({
      data: [autoVersion, manualVersion],
      isFetching: false,
    });
  });

  it("renders both manual and automatic versions, with the auto-save name shown and badged", () => {
    renderPanel();

    expect(screen.getByText("Auto-save 2023-10-27 · v2")).toBeInTheDocument();
    expect(screen.getByText("v1")).toBeInTheDocument();
    expect(screen.getByText("Auto")).toBeInTheDocument();
  });

  it("reverting: branching from an older version calls createVersion with fromVersionId and switches editing context", async () => {
    const onEditVersion = vi.fn();
    const created = { id: "v-new", versionNumber: 3, name: "" };
    mockCreateVersion.mockReturnValue({ unwrap: () => Promise.resolve(created) });

    renderPanel({ onEditVersion });

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

  describe("creating a blank version", () => {
    it("creates an empty draft with the typed name and opens it in the editor", async () => {
      const onEditVersion = vi.fn();
      const created = { id: "v-blank", versionNumber: 4, name: "warmer opener" };
      mockCreateVersion.mockReturnValue({ unwrap: () => Promise.resolve(created) });

      renderPanel({ onEditVersion });

      fireEvent.click(screen.getByText("+ New version"));
      expect(screen.getByText("New blank version")).toBeInTheDocument();

      fireEvent.change(screen.getByPlaceholderText("e.g. warmer opener"), {
        target: { value: "  warmer opener  " },
      });
      fireEvent.click(screen.getByTitle("Create"));

      await vi.waitFor(() => {
        expect(mockCreateVersion).toHaveBeenCalledWith({
          scenarioId: 1,
          name: "warmer opener",
          fromVersionId: undefined,
          empty: true,
        });
      });
      expect(toast.success).toHaveBeenCalledWith("Created warmer opener · v4");
      expect(onEditVersion).toHaveBeenCalledWith(created);
      // The inline create row closes once the version exists.
      expect(screen.queryByText("New blank version")).not.toBeInTheDocument();
    });

    it("sends no name when the field is left blank, so the server names the version", async () => {
      mockCreateVersion.mockReturnValue({
        unwrap: () => Promise.resolve({ id: "v-blank", versionNumber: 4, name: null }),
      });

      renderPanel();

      fireEvent.click(screen.getByText("+ New version"));
      fireEvent.change(screen.getByPlaceholderText("e.g. warmer opener"), {
        target: { value: "   " },
      });
      fireEvent.click(screen.getByTitle("Create"));

      await vi.waitFor(() => {
        expect(mockCreateVersion).toHaveBeenCalledWith(
          expect.objectContaining({ name: undefined, empty: true }),
        );
      });
    });

    it("creates on Enter and abandons the row on Escape", async () => {
      mockCreateVersion.mockReturnValue({
        unwrap: () => Promise.resolve({ id: "v-blank", versionNumber: 4, name: null }),
      });

      renderPanel();

      fireEvent.click(screen.getByText("+ New version"));
      fireEvent.keyDown(screen.getByPlaceholderText("e.g. warmer opener"), { key: "Escape" });
      expect(screen.queryByText("New blank version")).not.toBeInTheDocument();
      expect(mockCreateVersion).not.toHaveBeenCalled();

      fireEvent.click(screen.getByText("+ New version"));
      fireEvent.keyDown(screen.getByPlaceholderText("e.g. warmer opener"), { key: "Enter" });
      await vi.waitFor(() => expect(mockCreateVersion).toHaveBeenCalledTimes(1));
    });

    // The confirm button is disabled while a create is in flight, but Enter in
    // the name field went straight to the handler — so a double Enter (or an
    // Enter plus a click before React re-rendered) created two versions.
    it("creates only one version when Enter is pressed twice before the request settles", async () => {
      const onEditVersion = vi.fn();
      let settle: (v: unknown) => void = () => {};
      mockCreateVersion.mockReturnValue({
        unwrap: () => new Promise(resolve => (settle = resolve)),
      });

      renderPanel({ onEditVersion });

      fireEvent.click(screen.getByText("+ New version"));
      const input = screen.getByPlaceholderText("e.g. warmer opener");
      fireEvent.keyDown(input, { key: "Enter" });
      fireEvent.keyDown(input, { key: "Enter" });

      await vi.waitFor(() => expect(mockCreateVersion).toHaveBeenCalledTimes(1));

      settle({ id: "v-blank", versionNumber: 4, name: null });
      await vi.waitFor(() => expect(onEditVersion).toHaveBeenCalledTimes(1));
      expect(mockCreateVersion).toHaveBeenCalledTimes(1);
    });

    it("flushes the parent's unsaved edits before creating, so a branch clones the latest config", async () => {
      const calls: string[] = [];
      const onBeforeCreate = vi.fn(() => {
        calls.push("flush");
        return Promise.resolve();
      });
      mockCreateVersion.mockImplementation(() => {
        calls.push("create");
        return { unwrap: () => Promise.resolve({ id: "v-new", versionNumber: 3, name: null }) };
      });

      renderPanel({ onBeforeCreate });

      fireEvent.click(screen.getAllByTitle("Branch")[0]);
      fireEvent.click(screen.getByTitle("Create"));

      await vi.waitFor(() => expect(mockCreateVersion).toHaveBeenCalled());
      expect(calls).toEqual(["flush", "create"]);
    });

    it("does not create anything when flushing the parent's edits fails", async () => {
      const onBeforeCreate = vi.fn(() => Promise.reject(new Error("save failed")));

      renderPanel({ onBeforeCreate });

      fireEvent.click(screen.getByText("+ New version"));
      fireEvent.click(screen.getByTitle("Create"));

      await vi.waitFor(() =>
        expect(toast.error).toHaveBeenCalledWith("Couldn't create a new version"),
      );
      expect(mockCreateVersion).not.toHaveBeenCalled();
    });

    it("keeps the create row open and reports the failure when the API rejects", async () => {
      const onEditVersion = vi.fn();
      mockCreateVersion.mockReturnValue({ unwrap: () => Promise.reject(new Error("500")) });

      renderPanel({ onEditVersion });

      fireEvent.click(screen.getByText("+ New version"));
      fireEvent.change(screen.getByPlaceholderText("e.g. warmer opener"), {
        target: { value: "warmer opener" },
      });
      fireEvent.click(screen.getByTitle("Create"));

      await vi.waitFor(() =>
        expect(toast.error).toHaveBeenCalledWith("Couldn't create a new version"),
      );
      expect(onEditVersion).not.toHaveBeenCalled();
      // The typed name survives so the admin can retry without retyping it.
      expect(screen.getByPlaceholderText("e.g. warmer opener")).toHaveValue("warmer opener");
    });
  });

  describe("renaming a version", () => {
    it("saves the trimmed new name and leaves edit mode", async () => {
      mockUpdateVersion.mockReturnValue({
        unwrap: () => Promise.resolve({ ...autoVersion, name: "warmer opener" }),
      });

      renderPanel();

      fireEvent.click(screen.getAllByLabelText("Rename")[0]);
      const input = screen.getByDisplayValue("Auto-save 2023-10-27");
      fireEvent.change(input, { target: { value: "  warmer opener  " } });
      fireEvent.click(screen.getByTitle("Save"));

      await vi.waitFor(() => {
        expect(mockUpdateVersion).toHaveBeenCalledWith({
          scenarioId: 1,
          versionId: "v-auto",
          name: "warmer opener",
        });
      });
      expect(toast.success).toHaveBeenCalledWith("Renamed to warmer opener · v2");
      await vi.waitFor(() => expect(screen.queryByTitle("Save")).not.toBeInTheDocument());
    });

    it("renames on Enter and discards the edit on Escape", async () => {
      mockUpdateVersion.mockReturnValue({ unwrap: () => Promise.resolve(autoVersion) });

      renderPanel();

      fireEvent.click(screen.getAllByLabelText("Rename")[0]);
      fireEvent.keyDown(screen.getByDisplayValue("Auto-save 2023-10-27"), { key: "Escape" });
      expect(mockUpdateVersion).not.toHaveBeenCalled();
      expect(screen.queryByTitle("Save")).not.toBeInTheDocument();

      fireEvent.click(screen.getAllByLabelText("Rename")[0]);
      fireEvent.keyDown(screen.getByDisplayValue("Auto-save 2023-10-27"), { key: "Enter" });
      await vi.waitFor(() => expect(mockUpdateVersion).toHaveBeenCalledTimes(1));
    });

    it("sends only one rename when Enter is pressed twice before the request settles", async () => {
      let settle: (v: unknown) => void = () => {};
      mockUpdateVersion.mockReturnValue({
        unwrap: () => new Promise(resolve => (settle = resolve)),
      });

      renderPanel();

      fireEvent.click(screen.getAllByLabelText("Rename")[0]);
      const input = screen.getByDisplayValue("Auto-save 2023-10-27");
      fireEvent.keyDown(input, { key: "Enter" });
      fireEvent.keyDown(input, { key: "Enter" });

      await vi.waitFor(() => expect(mockUpdateVersion).toHaveBeenCalledTimes(1));

      settle(autoVersion);
      await vi.waitFor(() => expect(toast.success).toHaveBeenCalledTimes(1));
      expect(mockUpdateVersion).toHaveBeenCalledTimes(1);
    });

    it("keeps the row in edit mode and reports the failure when the API rejects", async () => {
      mockUpdateVersion.mockReturnValue({ unwrap: () => Promise.reject(new Error("500")) });

      renderPanel();

      fireEvent.click(screen.getAllByLabelText("Rename")[0]);
      fireEvent.change(screen.getByDisplayValue("Auto-save 2023-10-27"), {
        target: { value: "warmer opener" },
      });
      fireEvent.click(screen.getByTitle("Save"));

      await vi.waitFor(() =>
        expect(toast.error).toHaveBeenCalledWith("Couldn't rename this version"),
      );
      expect(screen.getByTitle("Save")).toBeInTheDocument();
    });

    it("starts from an empty field for an unnamed version", () => {
      renderPanel();

      // Second row is the unnamed live version (v1).
      fireEvent.click(screen.getAllByLabelText("Rename")[1]);

      expect(screen.getByPlaceholderText("e.g. warmer opener")).toHaveValue("");
    });
  });

  describe("deleting a version", () => {
    it("confirms, deletes, and tells the parent which version went away", async () => {
      const onVersionDeleted = vi.fn();
      mockDeleteVersion.mockReturnValue({ unwrap: () => Promise.resolve(true) });

      renderPanel({ onVersionDeleted });

      fireEvent.click(screen.getByLabelText("Delete"));
      expect(screen.getByTestId("confirm-title")).toHaveTextContent("Auto-save 2023-10-27 · v2");

      fireEvent.click(screen.getByText("confirm-Delete"));

      await vi.waitFor(() => {
        expect(mockDeleteVersion).toHaveBeenCalledWith({ scenarioId: 1, versionId: "v-auto" });
        expect(onVersionDeleted).toHaveBeenCalledWith("v-auto");
      });
      expect(toast.success).toHaveBeenCalledWith("Deleted Auto-save 2023-10-27 · v2");
      expect(screen.queryByTestId("confirm-popup")).not.toBeInTheDocument();
    });

    it("deletes nothing when the confirmation is dismissed", () => {
      renderPanel();

      fireEvent.click(screen.getByLabelText("Delete"));
      fireEvent.click(screen.getByText("dismiss-Cancel"));

      expect(screen.queryByTestId("confirm-popup")).not.toBeInTheDocument();
      expect(mockDeleteVersion).not.toHaveBeenCalled();
    });

    it("reports the failure and does not tell the parent when the API rejects", async () => {
      const onVersionDeleted = vi.fn();
      mockDeleteVersion.mockReturnValue({ unwrap: () => Promise.reject(new Error("500")) });

      renderPanel({ onVersionDeleted });

      fireEvent.click(screen.getByLabelText("Delete"));
      fireEvent.click(screen.getByText("confirm-Delete"));

      await vi.waitFor(() =>
        expect(toast.error).toHaveBeenCalledWith("Couldn't delete this version"),
      );
      expect(onVersionDeleted).not.toHaveBeenCalled();
    });

    it("offers no delete for the live-mirroring or published versions", () => {
      mockUseGetScenarioVersionsQuery.mockReturnValue({
        data: [publishedVersion, manualVersion],
        isFetching: false,
      });

      renderPanel();

      expect(screen.queryByLabelText("Delete")).not.toBeInTheDocument();
    });
  });

  describe("active version highlighting", () => {
    it("marks the version named by activeVersionId as the one being edited", () => {
      renderPanel({ activeVersionId: "v-auto" });

      const editing = screen.getByText("editing");
      expect(editing).toBeInTheDocument();
      expect(editing.closest("li")).toHaveTextContent("Auto-save 2023-10-27 · v2");
    });

    it("falls back to the live-mirroring version when no version is open", () => {
      renderPanel();

      expect(screen.getByText("editing").closest("li")).toHaveTextContent("v1");
    });

    it("marks nothing as being edited when activeVersionId is not in the list", () => {
      renderPanel({ activeVersionId: "v-gone" });

      expect(screen.queryByText("editing")).not.toBeInTheDocument();
    });
  });

  describe("list states", () => {
    it("shows the loading copy only while the first fetch is in flight", () => {
      mockUseGetScenarioVersionsQuery.mockReturnValue({ data: [], isFetching: true });

      renderPanel();

      expect(screen.getByText("Loading…")).toBeInTheDocument();
    });

    it("shows the empty copy when the scenario has no versions", () => {
      mockUseGetScenarioVersionsQuery.mockReturnValue({ data: [], isFetching: false });

      renderPanel();

      expect(screen.getByText("No versions yet. Create one to start iterating.")).toBeInTheDocument();
    });

    it("renders nothing and skips the query when closed", () => {
      const { container } = renderPanel({ isOpen: false });

      expect(container).toBeEmptyDOMElement();
      expect(mockUseGetScenarioVersionsQuery).toHaveBeenCalledWith(
        { scenarioId: 1 },
        expect.objectContaining({ skip: true }),
      );
    });
  });
});

describe("formatVersionLabel", () => {
  it("falls back to the auto label when the version is unnamed", () => {
    expect(formatVersionLabel({ name: null, versionNumber: 3 })).toBe("v3");
    expect(formatVersionLabel({ versionNumber: 3 })).toBe("v3");
  });

  it("ignores a name that is only whitespace", () => {
    expect(formatVersionLabel({ name: "   ", versionNumber: 3 })).toBe("v3");
  });

  it("does not repeat a name that is already the auto label", () => {
    expect(formatVersionLabel({ name: "v3", versionNumber: 3 })).toBe("v3");
    expect(formatVersionLabel({ name: "  v3  ", versionNumber: 3 })).toBe("v3");
  });

  it("combines a code name with the auto label", () => {
    expect(formatVersionLabel({ name: "warmer opener", versionNumber: 3 })).toBe(
      "warmer opener · v3",
    );
    expect(formatVersionLabel({ name: "  warmer opener  ", versionNumber: 3 })).toBe(
      "warmer opener · v3",
    );
  });
});
