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
vi.mock("sonner", () => ({ toast: { success: (...a: unknown[]) => toastSuccess(...a), error: (...a: unknown[]) => toastError(...a) } }));

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
  useUpdateBuilderSettingsMutation: () => [updateSettings, { isLoading: false }],
}));

// eslint-disable-next-line import/first
import { BuilderSettings } from "../BuilderSettings";

const baseSettings = {
  id: "settings-1",
  enabled: true,
  maxConcurrentBuilds: 3,
  defaultBudgetUsd: "25",
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
        maps: [{ repo: "ally-be", commitSha: "abc1234567", generatedAt: "2026-08-23T00:00:00.000Z" }],
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

  it("shows repo-map freshness read-only", () => {
    render(<BuilderSettings />);

    expect(screen.getByText("ally-be")).toBeInTheDocument();
    expect(screen.getByText("map from rel:2026-08-23T00:00:00.000Z @ abc1234")).toBeInTheDocument();
  });
});
