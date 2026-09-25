import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@components", () => ({ cellTypes: {} }));
vi.mock("@assets", () => ({ TooltipIcon: () => <svg /> }));
vi.mock("@utils", () => ({
  formatDate: (d: string) => `full:${d}`,
  formatRelativeTime: (d: string) => `rel:${d}`,
}));

const navigateMock = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<any>("react-router-dom");
  return { ...actual, useNavigate: () => navigateMock };
});

const toastSuccess = vi.fn();
const toastError = vi.fn();
vi.mock("sonner", () => ({
  toast: {
    success: (...a: unknown[]) => toastSuccess(...a),
    error: (...a: unknown[]) => toastError(...a),
  },
}));

vi.mock("@ally-ui-mono/ui-shared", () => ({
  Button: ({ children, onClick, disabled }: any) => (
    <button onClick={onClick} disabled={disabled}>
      {children}
    </button>
  ),
  CarbonToggle: ({ id, labelText, toggled, onToggle }: any) => (
    <label>
      {labelText}
      <input
        type="checkbox"
        aria-label={labelText}
        checked={toggled}
        onChange={event => onToggle(event.target.checked)}
      />
    </label>
  ),
  InlineNotification: ({ title }: any) => <div>{title}</div>,
  NumberInput: ({ id, label, value, onChange }: any) => (
    <input
      aria-label={label || id}
      value={value}
      onChange={event => onChange(undefined, { value: event.target.value })}
    />
  ),
  Select: ({ id, labelText, value, onChange, children }: any) => (
    <select aria-label={labelText || id} value={value} onChange={onChange}>
      {children}
    </select>
  ),
  SelectItem: ({ value, text }: any) => <option value={value}>{text}</option>,
  SkeletonText: () => <div>Loading…</div>,
  TextInput: ({ id, labelText, value, onChange }: any) => (
    <input aria-label={labelText || id} value={value} onChange={onChange} />
  ),
  Tooltip: ({ children }: any) => <>{children}</>,
}));

const updateSettings = vi.fn().mockReturnValue({ unwrap: () => Promise.resolve({}) });
let settingsResult: any;
let repoMapsResult: any;

vi.mock("@api", () => ({
  useGetBuilderSettingsQuery: () => settingsResult,
  useGetBuilderRepoMapsQuery: () => repoMapsResult,
  useGetLlmModelsQuery: () => ({
    data: [
      { provider: "anthropic", model: "claude-opus-5", label: "Claude Opus 5" },
      { provider: "anthropic", model: "claude-sonnet-5", label: "Claude Sonnet 5" },
    ],
  }),
  useUpdateBuilderSettingsMutation: () => [updateSettings, { isLoading: false }],
}));

// eslint-disable-next-line import/first
import { BuilderSettings } from "../BuilderSettings";

const baseSettings = {
  id: "settings-1",
  enabled: true,
  maxConcurrentBuilds: 3,
  defaultBudgetUsd: "25",
  defaultEngine: "claude-code",
  autoReviewEnabled: false,
  autoApproveEnabled: false,
  autoReleaseEnabled: false,
  autoFixEnabled: false,
  plannerModel: null,
  coderModel: "claude-opus",
  verifierModel: null,
};

describe("BuilderSettings", () => {
  beforeEach(() => {
    updateSettings.mockClear();
    toastSuccess.mockClear();
    toastError.mockClear();
    settingsResult = { data: baseSettings, isLoading: false, isError: false };
    repoMapsResult = {
      data: {
        maps: [
          { repo: "ally-be", commitSha: "abc1234567", generatedAt: "2026-08-23T00:00:00.000Z" },
        ],
      },
    };
  });

  it("shows a skeleton while loading", () => {
    settingsResult = { data: undefined, isLoading: true, isError: false };
    render(<BuilderSettings />);
    expect(screen.getByText("Loading…")).toBeInTheDocument();
  });

  it("round-trips the kill switch and the budget", async () => {
    render(<BuilderSettings />);

    const toggle = screen.getByLabelText("Builder enabled");
    fireEvent.click(toggle);

    fireEvent.click(screen.getByText("Save"));

    await vi.waitFor(() => {
      expect(updateSettings).toHaveBeenCalledWith(
        expect.objectContaining({ enabled: false, maxConcurrentBuilds: 3 }),
      );
    });
  });

  it("clears a model tier back to the platform default by sending an empty string", async () => {
    render(<BuilderSettings />);

    const coderField = screen.getByLabelText("Coder model");
    fireEvent.change(coderField, { target: { value: "" } });

    fireEvent.click(screen.getByText("Save"));

    await vi.waitFor(() => {
      expect(updateSettings).toHaveBeenCalledWith(
        expect.objectContaining({ plannerModel: "", coderModel: "", verifierModel: "" }),
      );
    });
  });

  /**
   * One engine, so there is nothing to switch to — the picker's job now is to
   * send what it holds rather than to offer a choice. It stays because the
   * field is real and an admin should be able to see what Builder runs on, and
   * because putting another engine back is an entry in one array.
   */
  it("sends the chosen engine on save", async () => {
    render(<BuilderSettings />);

    fireEvent.change(screen.getByLabelText("Engine"), { target: { value: "opencode" } });
    fireEvent.click(screen.getByText("Save"));

    await vi.waitFor(() => {
      expect(updateSettings).toHaveBeenCalledWith(
        expect.objectContaining({ defaultEngine: "opencode" }),
      );
    });
  });

  /**
   * The engines whose invocation cases, install steps and event normalisers
   * were deleted must not be offerable: choosing one would be a control that
   * looks like it works and silently does not, which is the failure this
   * picker was narrowed to prevent once already.
   */
  it("offers no engine Builder cannot run", () => {
    render(<BuilderSettings />);

    const options = Array.from(screen.getByLabelText("Engine").querySelectorAll("option")).map(
      option => option.getAttribute("value"),
    );

    expect(options).toEqual(["opencode"]);
  });

  it("shows repo-map freshness read-only", () => {
    render(<BuilderSettings />);

    expect(screen.getByText("ally-be")).toBeInTheDocument();
    expect(screen.getByText("map from rel:2026-08-23T00:00:00.000Z @ abc1234")).toBeInTheDocument();
  });

  /**
   * The three autonomy switches, ordered by how much they let go of: review
   * only reads, approve vouches for the result, fix writes to a branch someone
   * may be reading.
   *
   * The nesting is the point. Approve is meaningless without review — it fires
   * on a clean review and nothing else — so offering it while review is off
   * would be a control that silently does nothing.
   */
  describe("the autonomy switches", () => {
    it("hides approve until review is on", () => {
      render(<BuilderSettings />);

      expect(
        screen.queryByLabelText("Approve a pull request it found nothing wrong with"),
      ).toBeNull();

      fireEvent.click(screen.getByLabelText("Review its own pull requests"));

      expect(
        screen.getByLabelText("Approve a pull request it found nothing wrong with"),
      ).toBeInTheDocument();
    });

    it("sends both switches on save", async () => {
      settingsResult = {
        data: { ...baseSettings, autoReviewEnabled: true },
        isLoading: false,
        isError: false,
      };
      render(<BuilderSettings />);

      fireEvent.click(screen.getByLabelText("Approve a pull request it found nothing wrong with"));
      fireEvent.click(screen.getByText("Save"));

      await vi.waitFor(() => {
        expect(updateSettings).toHaveBeenCalledWith(
          expect.objectContaining({ autoReviewEnabled: true, autoApproveEnabled: true }),
        );
      });
    });

    /**
     * The ladder, top to bottom: read, vouch, ship. Release is nested under
     * approve because releasing something nobody approved is not a state
     * anyone should be able to reach by accident.
     */
    it("hides release until approve is on", () => {
      settingsResult = {
        data: { ...baseSettings, autoReviewEnabled: true },
        isLoading: false,
        isError: false,
      };
      render(<BuilderSettings />);

      expect(screen.queryByLabelText("Release it to production once it merges")).toBeNull();

      fireEvent.click(screen.getByLabelText("Approve a pull request it found nothing wrong with"));

      expect(screen.getByLabelText("Release it to production once it merges")).toBeInTheDocument();
    });

    it("warns that a failed release reads as done", () => {
      settingsResult = {
        data: { ...baseSettings, autoReviewEnabled: true, autoApproveEnabled: true },
        isLoading: false,
        isError: false,
      };
      render(<BuilderSettings />);

      expect(screen.getByText(/merged-but-not-deployed reads as done/)).toBeInTheDocument();
    });

    /**
     * The approval body is what a reader sees on the pull request, so the help
     * text has to say plainly that a machine is doing the approving — a toggle
     * that reads like a human sign-off would be the wrong thing to hand an
     * admin.
     */
    it("says the approval is a machine one", () => {
      render(<BuilderSettings />);
      fireEvent.click(screen.getByLabelText("Review its own pull requests"));

      expect(screen.getByText(/a machine approved it/)).toBeInTheDocument();
    });
  });

  /**
   * A tier is a model id the runner passes straight to the CLI, so a typo used
   * to reach production and fail at dispatch. Picking from the catalog removes
   * the class of mistake rather than validating it later.
   */
  describe("the model tiers", () => {
    it("offers the catalog rather than a free-text box", () => {
      render(<BuilderSettings />);

      const planner = screen.getByLabelText("Planner model") as HTMLSelectElement;
      const options = Array.from(planner.querySelectorAll("option")).map(o => o.textContent);

      expect(options).toContain("Claude Opus 5 (claude-opus-5)");
      expect(options).toContain("Claude Sonnet 5 (claude-sonnet-5)");
    });

    /** Empty is how a tier falls back to the platform default. */
    it("keeps a blank row for the platform default", () => {
      render(<BuilderSettings />);
      const planner = screen.getByLabelText("Planner model") as HTMLSelectElement;
      expect(planner.querySelector('option[value=""]')).not.toBeNull();
    });

    /**
     * Opening the page must not silently reset a deliberate choice just because
     * the catalog stopped offering it.
     */
    it("keeps a model the catalog no longer lists", () => {
      settingsResult = {
        data: { ...baseSettings, plannerModel: "retired-model-v1" },
        isLoading: false,
        isError: false,
      };
      render(<BuilderSettings />);

      const planner = screen.getByLabelText("Planner model") as HTMLSelectElement;
      expect(planner.value).toBe("retired-model-v1");
    });
  });
});
