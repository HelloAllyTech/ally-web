import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { Cohort } from "@types";

import { CohortRestrictionCell } from "../CohortRestrictionCell";

const { mockSetRestrictions, mockToastSuccess, mockToastError } = vi.hoisted(() => ({
  mockSetRestrictions: vi.fn(),
  mockToastSuccess: vi.fn(),
  mockToastError: vi.fn(),
}));

vi.mock("@api", () => ({
  useSetCohortRestrictionsMutation: () => [mockSetRestrictions, { isLoading: false }],
}));

vi.mock("sonner", () => ({
  toast: { success: mockToastSuccess, error: mockToastError },
}));

vi.mock("@assets", () => ({
  Close: () => <svg data-testid="close-icon" />,
}));

vi.mock("@components", () => ({
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
}));

vi.mock("@components/types", () => ({
  ButtonVariant: { PRIMARY: "primary", SECONDARY: "secondary" },
}));

vi.mock("@constants", () => ({
  en: {
    common: { cancel: "Cancel", save: "Save", saving: "Saving...", close: "Close" },
    userManagement: {
      cohortRestrictionEveryone: "Everyone",
      cohortRestrictionOneGroup: "1 group",
      cohortRestrictionCount: (count: number) => `${count} groups`,
      cohortRestrictionAria: (title: string) => `Change who can see ${title}`,
      cohortRestrictionTitle: (title: string) => `Who can see ${title}?`,
      cohortRestrictionHint: "Leave every group unchecked to keep this available to everyone.",
      cohortRestrictionUnassignedHint: "(people not in any group)",
      cohortRestrictionReachAll: (total: number) => `Visible to everyone — all ${total} people.`,
      cohortRestrictionReach: (reach: number, total: number) =>
        `Visible to ${reach} of ${total} people.`,
      cohortRestrictionGraceNote: "People who have already started this keep access.",
      cohortRestrictionCleared: (title: string) => `${title} is now visible to everyone`,
      cohortRestrictionSaved: (title: string, count: number) =>
        `${title} is now limited to ${count} groups`,
      cohortRestrictionFailed: "Failed to update access",
      peopleCount: (count: number) => `${count} people`,
    },
  },
}));

const COHORTS: Cohort[] = [
  { id: "cohort-a", name: "Night shift", memberCount: 4, isUnassignedBucket: false },
  { id: "cohort-b", name: "New joiners", memberCount: 6, isUnassignedBucket: false },
  { id: "unassigned", name: "Unassigned", memberCount: 2, isUnassignedBucket: true },
];

const renderCell = (overrides: Partial<Parameters<typeof CohortRestrictionCell>[0]> = {}) =>
  render(
    <CohortRestrictionCell
      tenantId="tenant-1"
      contentType="track"
      contentId="track-1"
      contentTitle="Crisis basics"
      cohorts={COHORTS}
      restrictedTo={[]}
      {...overrides}
    />,
  );

describe("CohortRestrictionCell", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSetRestrictions.mockReturnValue({ unwrap: () => Promise.resolve({ success: true }) });
  });

  it("reads as Everyone when the item has no restrictions", () => {
    renderCell();
    expect(screen.getByRole("button", { name: /Change who can see/ })).toHaveTextContent("Everyone");
  });

  it("names the single group an item is limited to", () => {
    renderCell({ restrictedTo: ["cohort-a"] });
    expect(screen.getByRole("button", { name: /Change who can see/ })).toHaveTextContent(
      "Night shift",
    );
  });

  it("counts the groups when limited to more than one", () => {
    renderCell({ restrictedTo: ["cohort-a", "cohort-b"] });
    expect(screen.getByRole("button", { name: /Change who can see/ })).toHaveTextContent("2 groups");
  });

  it("sends the full selection, not a delta, and reports the reach while editing", async () => {
    const user = userEvent.setup();
    renderCell({ restrictedTo: ["cohort-a"] });

    await user.click(screen.getByRole("button", { name: /Change who can see/ }));
    await user.click(screen.getByRole("checkbox", { name: /New joiners/ }));

    // 4 (Night shift) + 6 (New joiners) of 12 in the tenant.
    expect(screen.getByText("Visible to 10 of 12 people.")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() =>
      expect(mockSetRestrictions).toHaveBeenCalledWith({
        tenantId: "tenant-1",
        contentType: "track",
        contentId: "track-1",
        cohortIds: ["cohort-a", "cohort-b"],
      }),
    );
  });

  it("clears every restriction when the last group is unchecked", async () => {
    const user = userEvent.setup();
    renderCell({ restrictedTo: ["cohort-a"] });

    await user.click(screen.getByRole("button", { name: /Change who can see/ }));
    await user.click(screen.getByRole("checkbox", { name: /Night shift/ }));
    expect(screen.getByText("Visible to everyone — all 12 people.")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() =>
      expect(mockSetRestrictions).toHaveBeenCalledWith(
        expect.objectContaining({ cohortIds: [] }),
      ),
    );
    expect(mockToastSuccess).toHaveBeenCalledWith("Crisis basics is now visible to everyone");
  });

  it("promises the in-progress grace only where it exists", async () => {
    const user = userEvent.setup();
    const { unmount } = renderCell({ restrictedTo: ["cohort-a"] });
    await user.click(screen.getByRole("button", { name: /Change who can see/ }));
    expect(screen.getByText(/keep access/)).toBeInTheDocument();
    unmount();

    // A roleplay has nothing to resume, so the same note would be a lie.
    renderCell({ contentType: "scenario", contentId: "42", restrictedTo: ["cohort-a"] });
    await user.click(screen.getByRole("button", { name: /Change who can see/ }));
    expect(screen.queryByText(/keep access/)).not.toBeInTheDocument();
  });

  it("keeps the dialog open and surfaces the reason when the save fails", async () => {
    const user = userEvent.setup();
    mockSetRestrictions.mockReturnValue({
      unwrap: () => Promise.reject({ data: { message: "Cohort belongs to another tenant" } }),
    });
    renderCell();

    await user.click(screen.getByRole("button", { name: /Change who can see/ }));
    await user.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() =>
      expect(mockToastError).toHaveBeenCalledWith("Cohort belongs to another tenant"),
    );
    expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
  });
});
