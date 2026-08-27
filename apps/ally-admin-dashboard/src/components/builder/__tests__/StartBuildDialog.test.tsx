import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { BuilderPrdReadiness, BuilderRepoCommand } from "@types";

// @constants reads off the @components barrel at module-eval time (see the
// BugHunter tests), so the barrel is stubbed rather than loaded for real.
vi.mock("@components", () => ({ cellTypes: {} }));

vi.mock("@assets", () => ({ TooltipIcon: () => <svg /> }));

vi.mock("@ally-ui-mono/ui-shared", () => ({
  Button: ({ children, onClick, disabled }: any) => (
    <button onClick={onClick} disabled={disabled}>
      {children}
    </button>
  ),
  ComposedModal: ({ open, children }: any) => (open ? <div>{children}</div> : null),
  ModalBody: ({ children }: any) => <div>{children}</div>,
  InlineNotification: ({ title, subtitle, children }: any) => (
    <div>
      <p>{title}</p>
      {subtitle && <p>{subtitle}</p>}
      {children}
    </div>
  ),
  NumberInput: ({ id, value, onChange }: any) => (
    <input
      aria-label={id}
      value={value}
      onChange={event => onChange(undefined, { value: event.target.value })}
    />
  ),
  TextInput: ({ id, labelText, value, onChange, placeholder }: any) => (
    <input aria-label={labelText || id} placeholder={placeholder} value={value} onChange={onChange} />
  ),
  Tooltip: ({ children }: any) => <>{children}</>,
  FilterableMultiSelect: ({ items, selectedItems, onChange, invalid, invalidText }: any) => (
    <div>
      {invalid && <p>{invalidText}</p>}
      {items.map((item: BuilderRepoCommand) => {
        const checked = selectedItems.some((s: BuilderRepoCommand) => s.repo === item.repo);
        return (
          <label key={item.repo}>
            <input
              type="checkbox"
              checked={checked}
              onChange={() => {
                const next = checked
                  ? selectedItems.filter((s: BuilderRepoCommand) => s.repo !== item.repo)
                  : [...selectedItems, item];
                onChange({ selectedItems: next });
              }}
            />
            {item.repo}
          </label>
        );
      })}
    </div>
  ),
}));

const repos: BuilderRepoCommand[] = [
  {
    repo: "ally-be",
    description: "Backend",
    test: "npm test",
    lint: "npm run lint",
    typecheck: null,
    e2eCapable: false,
    guardedPaths: [],
  },
  {
    repo: "ally-web",
    description: "Frontend",
    test: "npm test",
    lint: "npm run lint",
    typecheck: null,
    e2eCapable: false,
    guardedPaths: [],
  },
];

const updateSession = vi.fn().mockReturnValue({ unwrap: () => Promise.resolve({}) });
const startBuild = vi.fn().mockReturnValue({ unwrap: () => Promise.resolve({}) });

vi.mock("@api", () => ({
  useGetBuilderRepoCommandsQuery: () => ({ data: { repos } }),
  useUpdateBuilderSessionMutation: () => [updateSession, { isLoading: false }],
  useStartBuilderBuildMutation: () => [startBuild, { isLoading: false }],
}));

// eslint-disable-next-line import/first
import { StartBuildDialog } from "../StartBuildDialog";

const readyReadiness: BuilderPrdReadiness = { score: 100, ready: true, sections: [], blockers: [] };

const blockedReadiness: BuilderPrdReadiness = {
  score: 60,
  ready: false,
  sections: [
    { key: "goals", label: "Goals", ok: true, hint: "" },
    { key: "openQuestions", label: "Open questions", ok: false, hint: "One question is still open" },
  ],
  blockers: ["One question is still open"],
};

const baseProps = {
  isOpen: true,
  onClose: vi.fn(),
  sessionId: "session-1",
  currentRepos: [],
  readiness: readyReadiness,
  onStarted: vi.fn(),
};

describe("StartBuildDialog", () => {
  beforeEach(() => {
    updateSession.mockClear();
    startBuild.mockClear();
  });

  it("blocks starting until at least one repo is chosen", () => {
    render(<StartBuildDialog {...baseProps} />);

    // Two nodes read "Start build" — the heading and the submit button — so
    // the button is targeted by role rather than by text.
    fireEvent.click(screen.getByRole("button", { name: "Start build" }));

    expect(screen.getByText("Choose at least one repo before starting.")).toBeInTheDocument();
    expect(updateSession).not.toHaveBeenCalled();
    expect(startBuild).not.toHaveBeenCalled();
  });

  it("saves the chosen repos before starting the build", async () => {
    render(<StartBuildDialog {...baseProps} />);

    fireEvent.click(screen.getByLabelText("ally-be"));
    fireEvent.click(screen.getByRole("button", { name: "Start build" }));

    await vi.waitFor(() => {
      expect(updateSession).toHaveBeenCalledWith({ id: "session-1", repos: ["ally-be"] });
      expect(startBuild).toHaveBeenCalled();
    });
  });

  it("offers 'Start anyway' and names what is still open when readiness is blocked", () => {
    render(<StartBuildDialog {...baseProps} readiness={blockedReadiness} />);

    expect(screen.getByText("Some things are still open")).toBeInTheDocument();
    expect(screen.getByText("One question is still open")).toBeInTheDocument();
    expect(screen.getByText("Start anyway")).toBeInTheDocument();
  });

  it("shows what is being retried past when opened for a retry", () => {
    render(<StartBuildDialog {...baseProps} retryError="npm test failed in ally-be" />);

    expect(screen.getByText("The last attempt failed:")).toBeInTheDocument();
    expect(screen.getByText("npm test failed in ally-be")).toBeInTheDocument();
    // Both the heading and the submit button read "Retry build" — asserting
    // there are two rather than picking one keeps the test honest about that.
    expect(screen.getAllByText("Retry build")).toHaveLength(2);
  });
});
