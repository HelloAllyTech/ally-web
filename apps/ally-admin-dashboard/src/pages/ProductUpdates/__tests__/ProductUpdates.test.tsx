import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";

const {
  mockToast,
  mockUseGetProductUpdatesQuery,
  mockUseGetProductUpdatesStatusQuery,
  mockUseGetProductUpdateQuery,
  mockRun,
  mockSave,
} = vi.hoisted(() => ({
  mockToast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
  mockUseGetProductUpdatesQuery: vi.fn(),
  mockUseGetProductUpdatesStatusQuery: vi.fn(),
  mockUseGetProductUpdateQuery: vi.fn(),
  mockRun: vi.fn(),
  mockSave: vi.fn(),
}));

vi.mock("sonner", () => ({ toast: mockToast }));

vi.mock("@api", async importOriginal => {
  const actual = await importOriginal<typeof import("@api")>();
  return {
    ...actual,
    useGetProductUpdatesQuery: (...args: any[]) => mockUseGetProductUpdatesQuery(...args),
    useGetProductUpdatesStatusQuery: (...args: any[]) =>
      mockUseGetProductUpdatesStatusQuery(...args),
    useGetProductUpdateQuery: (...args: any[]) => mockUseGetProductUpdateQuery(...args),
    useRunProductUpdatesMutation: () => [mockRun, { isLoading: false }],
    useUpdateProductUpdateMutation: () => [mockSave, { isLoading: false }],
  };
});

// Load `@constants` before the (partially mocked) `@api`, so the api -> utils -> store import
// cycle resolves in the same order the app uses.
import "@constants";

import { ProductUpdates } from "../ProductUpdates";

const makeUpdate = (overrides: Record<string, unknown> = {}) => ({
  id: "u-1",
  slug: "voice-roleplays",
  title: "Voice roleplays start faster",
  summary: "Roleplays now open in about half the time.",
  teamNotes: "- Warm-up removed",
  kind: "improved",
  audience: "public",
  surfaces: ["web_app", "mobile_app"],
  area: "Roleplays",
  confidence: 0.9,
  hidden: false,
  isPublic: true,
  editedFields: [],
  firstMergedAt: "2026-09-01T10:00:00Z",
  lastMergedAt: "2026-09-02T10:00:00Z",
  liveAt: "2026-09-03T10:00:00Z",
  publishedAt: "2026-09-03T11:00:00Z",
  decisionReason: "User-visible speed-up.",
  model: "test-model",
  sourceCount: 2,
  ...overrides,
});

const updates = [
  makeUpdate(),
  makeUpdate({
    id: "u-2",
    title: "Scribe notes export",
    kind: "new",
    audience: "public",
    isPublic: false,
    liveAt: null,
    publishedAt: null,
    surfaces: ["web_app"],
    area: "Scribe",
    confidence: 0.4,
    editedFields: ["title"],
    sourceCount: 1,
  }),
  makeUpdate({
    id: "u-3",
    title: "Internal cleanup",
    kind: "fixed",
    audience: "internal",
    isPublic: false,
    hidden: false,
  }),
  makeUpdate({ id: "u-4", title: "Hidden thing", hidden: true, isPublic: false }),
];

const detailSources = [
  {
    id: "s-1",
    repo: "ally-be",
    prNumber: 412,
    prUrl: "https://github.com/org/ally-be/pull/412",
    author: "asha",
    subjects: ["Speed up roleplay start", "second line"],
    mergedAt: "2026-09-01T10:00:00Z",
    liveAt: "2026-09-03T10:00:00Z",
    deployables: ["ally-be"],
    gatesLiveness: true,
  },
  {
    id: "s-2",
    repo: "ally-web",
    prNumber: null,
    prUrl: "https://github.com/org/ally-web/compare/a...b",
    author: null,
    subjects: ["direct push"],
    mergedAt: "2026-09-02T10:00:00Z",
    liveAt: null,
    deployables: ["admin", "helpline"],
    gatesLiveness: true,
  },
];

const status = {
  enabled: true,
  digestConfigured: true,
  running: false,
  sources: { pending: 3, enriched: 2, consolidated: 10, noise: 4 },
  updates: { total: 12, public: 8, waiting: 2 },
  lastRun: {
    trigger: "schedule",
    startedAt: "2026-09-29T02:00:00Z",
    finishedAt: "2026-09-29T02:05:00Z",
    ingested: 5,
    enriched: 5,
    degraded: false,
    batches: [],
    liveness: null,
    error: null,
  },
};

const lastQueryArgs = () => {
  const calls = mockUseGetProductUpdatesQuery.mock.calls;
  return calls[calls.length - 1][0];
};

describe("ProductUpdates page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseGetProductUpdatesQuery.mockReturnValue({
      data: { updates, count: updates.length },
      isLoading: false,
      isFetching: false,
      isError: false,
      refetch: vi.fn(),
    });
    mockUseGetProductUpdatesStatusQuery.mockReturnValue({ data: status, isError: false });
    // The single-update endpoint returns the same update plus its merges.
    mockUseGetProductUpdateQuery.mockImplementation((id: string, opts?: { skip?: boolean }) => ({
      data: opts?.skip ? undefined : { ...updates.find(u => u.id === id), sources: detailSources },
      isLoading: false,
      isError: false,
    }));
    mockRun.mockResolvedValue({ data: { started: true } });
    mockSave.mockResolvedValue({ data: makeUpdate() });
  });

  // Every RTK Query hook the page uses is stubbed above, so no store is needed.
  const renderPage = () => render(<ProductUpdates />);

  describe("list", () => {
    it("renders the header, description and a row per update", () => {
      renderPage();
      expect(screen.getByRole("heading", { name: "Product updates" })).toBeInTheDocument();
      expect(
        screen.getByText(/Anything you edit here is never rewritten automatically/),
      ).toBeInTheDocument();
      expect(screen.getByText("Voice roleplays start faster")).toBeInTheDocument();
      expect(screen.getByText("Scribe notes export")).toBeInTheDocument();
      expect(screen.getByText("Internal cleanup")).toBeInTheDocument();
      expect(screen.getByText("Hidden thing")).toBeInTheDocument();
      expect(screen.getByText("Showing 1–4 of 4")).toBeInTheDocument();
    });

    it("labels audience, waiting and edited state per row", () => {
      renderPage();
      const rowOf = (title: string) => screen.getByText(title).closest("tr") as HTMLElement;
      const selectedAudience = (title: string) =>
        within(
          within(rowOf(title)).getByRole("radiogroup", { name: `Audience for “${title}”` }),
        ).getByRole("radio", { checked: true });

      expect(selectedAudience("Voice roleplays start faster")).toHaveTextContent("Public");
      expect(selectedAudience("Scribe notes export")).toHaveTextContent("Public");
      expect(selectedAudience("Internal cleanup")).toHaveTextContent("Internal");
      expect(
        within(rowOf("Scribe notes export")).getByText("Waiting on release"),
      ).toBeInTheDocument();
      expect(
        within(rowOf("Voice roleplays start faster")).queryByText("Waiting on release"),
      ).not.toBeInTheDocument();
      expect(within(rowOf("Scribe notes export")).getByText("Waiting")).toBeInTheDocument();
      expect(within(rowOf("Scribe notes export")).getByText("Edited")).toBeInTheDocument();
      expect(
        within(rowOf("Hidden thing")).getByText("Hidden from the changelog"),
      ).toBeInTheDocument();
      expect(
        within(rowOf("Voice roleplays start faster")).queryByText("Edited"),
      ).not.toBeInTheDocument();
      expect(
        within(rowOf("Voice roleplays start faster")).getByText("Web app, Mobile app"),
      ).toBeInTheDocument();
    });

    it("switches an update to Internal from the row without opening the panel", async () => {
      renderPage();
      const row = screen.getByText("Voice roleplays start faster").closest("tr") as HTMLElement;

      fireEvent.click(within(row).getByRole("radio", { name: "Internal" }));

      await waitFor(() => expect(mockSave).toHaveBeenCalledTimes(1));
      expect(mockSave).toHaveBeenCalledWith({
        id: "u-1",
        data: { audience: "internal" },
        listArgs: lastQueryArgs(),
      });
      await waitFor(() =>
        expect(mockToast.success).toHaveBeenCalledWith(
          "Audience set to Internal. The automation won't change it back.",
        ),
      );
      expect(screen.queryByLabelText("Public summary")).not.toBeInTheDocument();
    });

    it("switches an internal update to Public", async () => {
      renderPage();
      const row = screen.getByText("Internal cleanup").closest("tr") as HTMLElement;

      fireEvent.click(within(row).getByRole("radio", { name: "Public" }));

      await waitFor(() =>
        expect(mockSave).toHaveBeenCalledWith(
          expect.objectContaining({ id: "u-3", data: { audience: "public" } }),
        ),
      );
    });

    it("saves nothing when the current audience is clicked again", () => {
      renderPage();
      const row = screen.getByText("Voice roleplays start faster").closest("tr") as HTMLElement;

      fireEvent.click(within(row).getByRole("radio", { name: "Public" }));

      expect(mockSave).not.toHaveBeenCalled();
      expect(screen.queryByLabelText("Public summary")).not.toBeInTheDocument();
    });

    it("toasts an error when the audience change fails", async () => {
      mockSave.mockResolvedValueOnce({ error: { status: 500 } });
      renderPage();
      const row = screen.getByText("Voice roleplays start faster").closest("tr") as HTMLElement;

      fireEvent.click(within(row).getByRole("radio", { name: "Internal" }));

      await waitFor(() =>
        expect(mockToast.error).toHaveBeenCalledWith("Could not change the audience. Try again."),
      );
      expect(mockToast.success).not.toHaveBeenCalled();
    });

    it("shows the no-updates empty state without filters", () => {
      mockUseGetProductUpdatesQuery.mockReturnValue({
        data: { updates: [], count: 0 },
        isLoading: false,
        isFetching: false,
        isError: false,
        refetch: vi.fn(),
      });
      renderPage();
      expect(
        screen.getByText("No product updates yet. They appear after the automation's next run."),
      ).toBeInTheDocument();
    });

    it("shows the filtered empty state when filters are active", async () => {
      mockUseGetProductUpdatesQuery.mockReturnValue({
        data: { updates: [], count: 0 },
        isLoading: false,
        isFetching: false,
        isError: false,
        refetch: vi.fn(),
      });
      const { container } = renderPage();
      fireEvent.change(container.querySelector("#product-updates-audience-filter")!, {
        target: { value: "internal" },
      });
      expect(await screen.findByText("No updates match these filters.")).toBeInTheDocument();
    });
  });

  describe("filters", () => {
    it("starts by asking for the first page without hidden updates", () => {
      renderPage();
      expect(lastQueryArgs()).toEqual({ limit: 25, offset: 0, hidden: false });
    });

    it("sends status, audience and surface and clears them again", async () => {
      const { container } = renderPage();
      fireEvent.change(container.querySelector("#product-updates-status-filter")!, {
        target: { value: "merged" },
      });
      fireEvent.change(container.querySelector("#product-updates-audience-filter")!, {
        target: { value: "public" },
      });
      fireEvent.change(container.querySelector("#product-updates-surface-filter")!, {
        target: { value: "whatsapp" },
      });
      await waitFor(() =>
        expect(lastQueryArgs()).toEqual({
          limit: 25,
          offset: 0,
          hidden: false,
          status: "merged",
          audience: "public",
          surface: "whatsapp",
        }),
      );

      fireEvent.click(screen.getByText("Clear filters"));
      await waitFor(() => expect(lastQueryArgs()).toEqual({ limit: 25, offset: 0, hidden: false }));
      expect(screen.queryByText("Clear filters")).not.toBeInTheDocument();
    });

    it("drops hidden=false once Show hidden is ticked", async () => {
      renderPage();
      fireEvent.click(screen.getByLabelText("Show hidden"));
      await waitFor(() => expect(lastQueryArgs()).toEqual({ limit: 25, offset: 0 }));
    });

    it("debounces the search box and sends the trimmed term", async () => {
      renderPage();
      fireEvent.change(screen.getByPlaceholderText("Title or summary"), {
        target: { value: "  scribe " },
      });
      expect(lastQueryArgs().search).toBeUndefined();
      await waitFor(() => expect(lastQueryArgs().search).toBe("scribe"), { timeout: 2000 });
    });

    it("resets the offset to 0 when a filter changes", async () => {
      mockUseGetProductUpdatesQuery.mockReturnValue({
        data: { updates, count: 60 },
        isLoading: false,
        isFetching: false,
        isError: false,
        refetch: vi.fn(),
      });
      const { container } = renderPage();
      fireEvent.click(screen.getByText("Next"));
      await waitFor(() => expect(lastQueryArgs().offset).toBe(25));
      expect(screen.getByText("Showing 26–50 of 60")).toBeInTheDocument();

      fireEvent.change(container.querySelector("#product-updates-surface-filter")!, {
        target: { value: "mobile_app" },
      });
      await waitFor(() =>
        expect(lastQueryArgs()).toEqual(
          expect.objectContaining({ surface: "mobile_app", offset: 0 }),
        ),
      );
    });

    it("pages back with Previous", async () => {
      mockUseGetProductUpdatesQuery.mockReturnValue({
        data: { updates, count: 60 },
        isLoading: false,
        isFetching: false,
        isError: false,
        refetch: vi.fn(),
      });
      renderPage();
      expect(screen.getByText("Previous")).toBeDisabled();
      fireEvent.click(screen.getByText("Next"));
      await waitFor(() => expect(lastQueryArgs().offset).toBe(25));
      fireEvent.click(screen.getByText("Previous"));
      await waitFor(() => expect(lastQueryArgs().offset).toBe(0));
    });
  });

  describe("status strip and Run now", () => {
    it("shows schedule, last run, merges in progress and counts", () => {
      renderPage();
      const strip = screen.getByTestId("product-updates-status");
      expect(within(strip).getByText("On")).toBeInTheDocument();
      expect(within(strip).getByText("OK")).toBeInTheDocument();
      // pending 3 + enriched 2
      expect(within(strip).getByText("5")).toBeInTheDocument();
      expect(within(strip).getByText("8")).toBeInTheDocument();
      expect(within(strip).getByText("2")).toBeInTheDocument();
    });

    it("shows the last run's error", () => {
      mockUseGetProductUpdatesStatusQuery.mockReturnValue({
        data: { ...status, lastRun: { ...status.lastRun, error: "Digest job blew up" } },
        isError: false,
      });
      renderPage();
      expect(screen.getByText("Failed")).toBeInTheDocument();
      expect(screen.getByText("Digest job blew up")).toBeInTheDocument();
    });

    it("starts a run and toasts", async () => {
      renderPage();
      fireEvent.click(screen.getByRole("button", { name: "Run now" }));
      await waitFor(() => expect(mockRun).toHaveBeenCalledTimes(1));
      await waitFor(() => expect(mockToast.success).toHaveBeenCalledWith("Run started"));
    });

    it("toasts the reason when a run did not start", async () => {
      mockRun.mockResolvedValue({
        data: { started: false, reason: "A run is already in progress." },
      });
      renderPage();
      fireEvent.click(screen.getByRole("button", { name: "Run now" }));
      await waitFor(() =>
        expect(mockToast.info).toHaveBeenCalledWith("A run is already in progress."),
      );
    });

    it("toasts an error when the request fails", async () => {
      mockRun.mockResolvedValue({ error: { status: 500 } });
      renderPage();
      fireEvent.click(screen.getByRole("button", { name: "Run now" }));
      await waitFor(() => expect(mockToast.error).toHaveBeenCalledWith("Could not start a run."));
    });

    it("disables the button and says Running… while a run is in flight, and polls status", () => {
      mockUseGetProductUpdatesStatusQuery.mockReturnValue({
        data: { ...status, running: true },
        isError: false,
      });
      renderPage();
      const button = within(screen.getByTestId("product-updates-status")).getAllByText("Running…");
      expect(button.length).toBeGreaterThan(0);
      expect(screen.getByRole("button", { name: "Running…" })).toBeDisabled();
      const lastCall = mockUseGetProductUpdatesStatusQuery.mock.calls.at(-1)!;
      expect(lastCall[1]).toEqual({ pollingInterval: 15000 });
    });

    it("does not poll when idle", () => {
      renderPage();
      const lastCall = mockUseGetProductUpdatesStatusQuery.mock.calls.at(-1)!;
      expect(lastCall[1]).toEqual({ pollingInterval: 0 });
    });
  });

  describe("side panel", () => {
    const openRow = async (title: string) => {
      fireEvent.click(screen.getByText(title));
      await screen.findByLabelText("Public summary");
    };

    it("opens with the update's values and merges", async () => {
      renderPage();
      await openRow("Voice roleplays start faster");

      expect((screen.getByLabelText("Title") as HTMLInputElement).value).toBe(
        "Voice roleplays start faster",
      );
      expect((screen.getByLabelText("Public summary") as HTMLTextAreaElement).value).toBe(
        "Roleplays now open in about half the time.",
      );
      expect((screen.getByLabelText("Team notes") as HTMLTextAreaElement).value).toBe(
        "- Warm-up removed",
      );
      expect((screen.getByLabelText("Kind") as HTMLSelectElement).value).toBe("improved");
      expect((screen.getByLabelText("Area") as HTMLSelectElement).value).toBe("Roleplays");
      expect(screen.getByLabelText("Web app")).toBeChecked();
      expect(screen.getByLabelText("Mobile app")).toBeChecked();
      expect(screen.getByLabelText("WhatsApp")).not.toBeChecked();
      expect(screen.getByLabelText("Hide from the public changelog")).not.toBeChecked();
      expect(screen.getByText("28/90")).toBeInTheDocument();

      expect(screen.getByText("90%")).toBeInTheDocument();
      expect(screen.queryByText("Low confidence — check the wording")).not.toBeInTheDocument();
      expect(screen.getByText("User-visible speed-up.")).toBeInTheDocument();
      expect(screen.getByText("test-model")).toBeInTheDocument();

      const link = screen.getByRole("link", { name: "ally-be #412" });
      expect(link).toHaveAttribute("href", "https://github.com/org/ally-be/pull/412");
      expect(screen.getByText("Speed up roleplay start")).toBeInTheDocument();
      expect(screen.getByText("asha")).toBeInTheDocument();
      expect(screen.getByText(/✓ live on/)).toBeInTheDocument();
      const push = screen.getByRole("link", { name: "ally-web push" });
      expect(push).toHaveAttribute("href", "https://github.com/org/ally-web/compare/a...b");
      expect(screen.getByText("waiting on admin, helpline")).toBeInTheDocument();
    });

    it("flags low confidence", async () => {
      renderPage();
      await openRow("Scribe notes export");
      expect(screen.getByText("40%")).toBeInTheDocument();
      expect(screen.getByText("Low confidence — check the wording")).toBeInTheDocument();
    });

    it("disables Save until something changes", async () => {
      renderPage();
      await openRow("Voice roleplays start faster");
      expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
      fireEvent.change(screen.getByLabelText("Title"), { target: { value: "New title" } });
      expect(screen.getByRole("button", { name: "Save" })).toBeEnabled();
    });

    it("saves only the changed fields", async () => {
      const { container } = renderPage();
      await openRow("Voice roleplays start faster");

      fireEvent.change(screen.getByLabelText("Title"), {
        target: { value: "  Faster roleplays " },
      });
      fireEvent.change(container.querySelector("#product-update-audience")!, {
        target: { value: "internal" },
      });
      fireEvent.click(screen.getByLabelText("WhatsApp"));
      fireEvent.click(screen.getByLabelText("Hide from the public changelog"));
      fireEvent.click(screen.getByRole("button", { name: "Save" }));

      await waitFor(() => expect(mockSave).toHaveBeenCalledTimes(1));
      expect(mockSave).toHaveBeenCalledWith({
        id: "u-1",
        data: {
          title: "Faster roleplays",
          audience: "internal",
          surfaces: ["web_app", "mobile_app", "whatsapp"],
          hidden: true,
        },
      });
      await waitFor(() =>
        expect(mockToast.success).toHaveBeenCalledWith(
          "Saved. Edited fields won't be rewritten automatically.",
        ),
      );
      await waitFor(() =>
        expect(screen.queryByLabelText("Public summary")).not.toBeInTheDocument(),
      );
    });

    it("blocks Save with no surface selected", async () => {
      renderPage();
      await openRow("Scribe notes export");
      fireEvent.click(screen.getByLabelText("Web app"));
      expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
      expect(screen.getAllByText("Pick at least one surface.").length).toBeGreaterThan(0);
    });

    it("blocks Save with an empty public summary", async () => {
      renderPage();
      await openRow("Voice roleplays start faster");
      fireEvent.change(screen.getByLabelText("Public summary"), { target: { value: "   " } });
      expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
    });

    it("blocks Save when the title is over 90 characters", async () => {
      renderPage();
      await openRow("Voice roleplays start faster");
      fireEvent.change(screen.getByLabelText("Title"), { target: { value: "x".repeat(91) } });
      expect(screen.getByText("91/90")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
    });

    it("keeps the panel open and toasts an error when saving fails", async () => {
      mockSave.mockResolvedValue({ error: { status: 500 } });
      renderPage();
      await openRow("Voice roleplays start faster");
      fireEvent.change(screen.getByLabelText("Title"), { target: { value: "Other" } });
      fireEvent.click(screen.getByRole("button", { name: "Save" }));
      await waitFor(() =>
        expect(mockToast.error).toHaveBeenCalledWith("Could not save this update."),
      );
      expect(screen.getByLabelText("Public summary")).toBeInTheDocument();
    });

    it("asks before discarding unsaved edits", async () => {
      renderPage();
      await openRow("Voice roleplays start faster");
      fireEvent.change(screen.getByLabelText("Title"), { target: { value: "Other" } });
      fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
      expect(await screen.findByText("Unsaved Changes")).toBeInTheDocument();
    });
  });
});
