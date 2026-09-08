import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@components", () => ({ cellTypes: {} }));
vi.mock("@assets", () => ({ TooltipIcon: () => <svg /> }));

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
  InlineNotification: ({ title }: any) => <div>{title}</div>,
  SkeletonText: () => <div>Loading…</div>,
  TextInput: ({ id, labelText, value, onChange }: any) => (
    <input aria-label={labelText || id} value={value} onChange={onChange} />
  ),
  Tooltip: ({ children }: any) => <>{children}</>,
}));

const updateBugHunterSettings = vi.fn().mockReturnValue({ unwrap: () => Promise.resolve({}) });
const updateBuilderSettings = vi.fn().mockReturnValue({ unwrap: () => Promise.resolve({}) });
let bugHunterResult: any;
let builderResult: any;

vi.mock("@api", () => ({
  useGetBugHunterModelSettingsQuery: () => bugHunterResult,
  useUpdateBugHunterModelSettingsMutation: () => [updateBugHunterSettings, { isLoading: false }],
  useGetBuilderSettingsQuery: () => builderResult,
  useUpdateBuilderSettingsMutation: () => [updateBuilderSettings, { isLoading: false }],
}));

// eslint-disable-next-line import/first
import { AiModelsTab } from "../AiModelsTab";

describe("AiModelsTab", () => {
  beforeEach(() => {
    updateBugHunterSettings.mockClear();
    updateBuilderSettings.mockClear();
    toastSuccess.mockClear();
    toastError.mockClear();
    bugHunterResult = {
      data: { defaultModel: "claude-sonnet-5", escalationModel: "claude-opus-5" },
      isLoading: false,
      isError: false,
    };
    builderResult = {
      data: {
        id: "settings-1",
        enabled: true,
        maxConcurrentBuilds: 3,
        defaultBudgetUsd: "25",
        plannerModel: null,
        coderModel: "claude-opus-5",
        verifierModel: null,
      },
      isLoading: false,
      isError: false,
    };
  });

  it("shows both sections, each loaded from its own backend", () => {
    render(<AiModelsTab />);

    expect(screen.getByText("Bug Hunter")).toBeInTheDocument();
    expect(screen.getByText("Builder")).toBeInTheDocument();
    expect(screen.getByLabelText("Default model")).toHaveValue("claude-sonnet-5");
    expect(screen.getByLabelText("Coder model")).toHaveValue("claude-opus-5");
  });

  it("saves Bug Hunter's section without touching Builder's", async () => {
    render(<AiModelsTab />);

    fireEvent.change(screen.getByLabelText("Escalation model"), {
      target: { value: "claude-haiku-4-5" },
    });
    fireEvent.click(screen.getAllByText("Save")[0]);

    await vi.waitFor(() => {
      expect(updateBugHunterSettings).toHaveBeenCalledWith({
        defaultModel: "claude-sonnet-5",
        escalationModel: "claude-haiku-4-5",
      });
    });
    expect(updateBuilderSettings).not.toHaveBeenCalled();
  });

  it("saves Builder's section without touching Bug Hunter's, clearing a blank tier to the platform default", async () => {
    render(<AiModelsTab />);

    fireEvent.change(screen.getByLabelText("Coder model"), { target: { value: "" } });
    fireEvent.click(screen.getAllByText("Save")[1]);

    await vi.waitFor(() => {
      expect(updateBuilderSettings).toHaveBeenCalledWith({
        plannerModel: "",
        coderModel: "",
        verifierModel: "",
      });
    });
    expect(updateBugHunterSettings).not.toHaveBeenCalled();
  });

  it("shows an error only for the section that failed to load", () => {
    builderResult = { data: undefined, isLoading: false, isError: true };
    render(<AiModelsTab />);

    expect(screen.getByText("Couldn't load Builder's model settings.")).toBeInTheDocument();
    expect(screen.queryByText("Couldn't load Bug Hunter's model settings.")).toBeNull();
  });
});
