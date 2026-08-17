import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { BugFindingStatus } from "@types";

import { BugFindingDrawer } from "../BugFindingDrawer";

const startFixSession = vi.fn();
const releaseFinding = vi.fn();
const getBugFinding = vi.fn();

vi.mock("@api", () => ({
  useGetBugFindingQuery: (...args: unknown[]) => getBugFinding(...args),
  useApproveBugFindingMutation: () => [vi.fn(), { isLoading: false }],
  useRejectBugFindingMutation: () => [vi.fn(), { isLoading: false }],
  useAnswerBugFindingMutation: () => [vi.fn(), { isLoading: false }],
  useStartBugFixSessionMutation: () => [startFixSession, { isLoading: false }],
  useReleaseBugFindingMutation: () => [releaseFinding, { isLoading: false }],
}));

// The @hooks barrel reaches the real Redux store (useScenarioReportsSocket ->
// store -> baseAPI), which the mocked @api above cannot satisfy. Nothing in
// this drawer uses it, so stubbing the barrel keeps the render self-contained
// — the same reason BugHunter.test.tsx stubs it.
vi.mock("@hooks", () => ({}));

vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

// @constants reads `cellTypes` off the @components barrel at module-eval time,
// which drags the whole barrel (and the real store with it) into this render.
// Same stub, same reason as BugHunter.test.tsx.
vi.mock("@components", () => ({ cellTypes: {} }));

vi.mock("@utils", () => ({ formatDate: (d: string) => d }));
vi.mock("@assets", () => ({ TooltipIcon: () => <svg data-testid="tooltip-icon" /> }));

vi.mock("@ally-ui-mono/ui-shared", () => ({
  Button: ({ children, onClick, disabled }: any) => (
    <button onClick={onClick} disabled={disabled}>
      {children}
    </button>
  ),
  TextArea: ({ value, onChange, placeholder }: any) => (
    <textarea value={value} onChange={onChange} placeholder={placeholder} />
  ),
  Tooltip: ({ children }: any) => <>{children}</>,
  DropdownField: ({ options, onChange }: any) => (
    <select data-testid="repo-picker" onChange={e => onChange(e.target.value)}>
      <option value="">—</option>
      {options.map((option: string) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  ),
  SidePanel: ({ open, title, children }: any) =>
    open ? (
      <div data-testid="side-panel">
        <h2>{title}</h2>
        {children}
      </div>
    ) : null,
}));

vi.mock("@components/action-confirmation-popup", () => ({
  ActionConfirmationPopup: ({ title, description, children, primaryButton }: any) => (
    <div data-testid="confirm-popup">
      <p>{title}</p>
      <p>{description}</p>
      {children}
      <button onClick={primaryButton.onClick} disabled={primaryButton.disabled}>
        {primaryButton.label}
      </button>
    </div>
  ),
}));

const finding = (overrides: Record<string, unknown> = {}) => ({
  id: "finding-1",
  runId: null,
  repo: "ally-be",
  source: "reported_bug",
  title: "Terms link is not formatted correctly",
  description: "The external emergency-services link renders unstyled.",
  file: "src/app.ts",
  evidence: null,
  severity: null,
  proven: false,
  touchesGuardedPath: false,
  reportedBugId: null,
  status: BugFindingStatus.NEW,
  prUrl: null,
  escalationQuestion: null,
  escalationAnswer: null,
  escalationAnsweredBy: null,
  escalationAnsweredAt: null,
  decidedBy: null,
  decidedAt: null,
  sessionRunUrl: null,
  releaseTag: null,
  releaseRunUrl: null,
  releasedBy: null,
  releasedAt: null,
  createdAt: "2026-08-17",
  updatedAt: "2026-08-17",
  events: [],
  steps: [],
  releasable: false,
  releaseTarget: null,
  releaseBlockedReason: null,
  ...overrides,
});

const renderDrawer = (data: Record<string, unknown>) => {
  getBugFinding.mockReturnValue({ data, isLoading: false, isError: false });
  return render(<BugFindingDrawer id="finding-1" onClose={vi.fn()} />);
};

describe("BugFindingDrawer — fix session", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    startFixSession.mockReturnValue({ unwrap: () => Promise.resolve({}) });
    releaseFinding.mockReturnValue({ unwrap: () => Promise.resolve({}) });
  });

  it("offers a fix session on a new, untriaged bug — the whole point of the button", () => {
    renderDrawer(finding());
    expect(screen.getByText("Start fix session")).toBeInTheDocument();
  });

  it("starts the session on confirm, with no repo when the bug already has one", async () => {
    renderDrawer(finding());
    fireEvent.click(screen.getByText("Start fix session"));
    fireEvent.click(screen.getByText("Start session"));

    await waitFor(() =>
      expect(startFixSession).toHaveBeenCalledWith({ id: "finding-1", repo: undefined }),
    );
  });

  it("makes the admin pick a repo when the bug has none, and blocks confirm until they do", async () => {
    renderDrawer(finding({ repo: null }));
    fireEvent.click(screen.getByText("Start fix session"));

    const confirm = screen.getByText("Start session");
    expect(confirm).toBeDisabled();

    fireEvent.change(screen.getByTestId("repo-picker"), { target: { value: "ally-web" } });
    expect(screen.getByText("Start session")).not.toBeDisabled();

    fireEvent.click(screen.getByText("Start session"));
    await waitFor(() =>
      expect(startFixSession).toHaveBeenCalledWith({ id: "finding-1", repo: "ally-web" }),
    );
  });

  it("hides the button while a session is already in flight", () => {
    renderDrawer(finding({ status: BugFindingStatus.FIXING }));
    expect(screen.queryByText("Start fix session")).not.toBeInTheDocument();
  });

  it("offers a retry, worded as such, after a failed attempt", () => {
    renderDrawer(finding({ status: BugFindingStatus.FAILED }));
    expect(screen.getByText("Try fixing again")).toBeInTheDocument();
  });

  it("explains the wait while queued rather than showing an idle drawer", () => {
    renderDrawer(finding({ status: BugFindingStatus.QUEUED }));
    expect(screen.getByText(/waiting for the runner/i)).toBeInTheDocument();
  });

  it("links to the running session once the backend has correlated it", () => {
    renderDrawer(
      finding({ status: BugFindingStatus.FIXING, sessionRunUrl: "https://github.com/run/1" }),
    );
    expect(screen.getByText("Watch it work")).toHaveAttribute(
      "href",
      "https://github.com/run/1",
    );
  });

  it("surfaces the backend's own refusal message rather than a generic one", async () => {
    const { toast } = await import("sonner");
    startFixSession.mockReturnValue({
      unwrap: () => Promise.reject({ data: { message: "Bug Hunter is OFF." } }),
    });
    renderDrawer(finding());

    fireEvent.click(screen.getByText("Start fix session"));
    fireEvent.click(screen.getByText("Start session"));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Bug Hunter is OFF."));
  });
});

describe("BugFindingDrawer — release to production", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    releaseFinding.mockReturnValue({ unwrap: () => Promise.resolve({}) });
  });

  it("offers the release only once the backend says it is releasable", () => {
    renderDrawer(
      finding({
        status: BugFindingStatus.MERGED,
        releasable: true,
        releaseTarget: "Ally backend (ECS)",
      }),
    );
    expect(screen.getByText("Release to production")).toBeInTheDocument();
  });

  it("never offers a release on an unmerged bug", () => {
    renderDrawer(finding({ status: BugFindingStatus.PR_OPENED }));
    expect(screen.queryByText("Release to production")).not.toBeInTheDocument();
  });

  it("names what will be deployed in the confirmation, so the blast radius is visible", () => {
    renderDrawer(
      finding({
        status: BugFindingStatus.MERGED,
        releasable: true,
        releaseTarget: "Admin dashboard (CloudFront)",
      }),
    );
    fireEvent.click(screen.getByText("Release to production"));

    expect(screen.getByText(/Admin dashboard \(CloudFront\)/)).toBeInTheDocument();
  });

  it("releases on confirm", async () => {
    renderDrawer(
      finding({ status: BugFindingStatus.MERGED, releasable: true, releaseTarget: "x" }),
    );
    fireEvent.click(screen.getByText("Release to production"));
    fireEvent.click(screen.getByText("Release"));

    await waitFor(() => expect(releaseFinding).toHaveBeenCalledWith("finding-1"));
  });

  it("explains why a merged fix cannot be released here instead of just hiding the button", () => {
    renderDrawer(
      finding({
        status: BugFindingStatus.MERGED,
        releasable: false,
        releaseBlockedReason: "A change in libs/ ships in all three apps.",
      }),
    );
    expect(screen.getByText(/ships in all three apps/)).toBeInTheDocument();
    expect(screen.queryByText("Release to production")).not.toBeInTheDocument();
  });

  it("says the fix is merged but not deployed when a release fails, and offers a retry", () => {
    renderDrawer(
      finding({
        status: BugFindingStatus.RELEASE_FAILED,
        releaseTag: "v1.4.2",
        releasable: true,
        releaseTarget: "Ally backend (ECS)",
      }),
    );
    expect(screen.getByText(/still merged to master/i)).toBeInTheDocument();
    expect(screen.getByText("Retry release")).toBeInTheDocument();
  });

  it("shows the shipped version once released", () => {
    renderDrawer(
      finding({
        status: BugFindingStatus.RELEASED,
        releaseTag: "v1.4.2",
        releasedBy: 7,
        releasedAt: "2026-08-17",
      }),
    );
    expect(screen.getByText(/Live in production as v1\.4\.2/)).toBeInTheDocument();
    expect(screen.getByText(/Released by user #7/)).toBeInTheDocument();
  });
});

describe("BugFindingDrawer — multi-repo plan", () => {
  const steps = [
    {
      id: "step-0",
      stepIndex: 0,
      repo: "ally-be",
      stepSummary: "Add the emergencyServicesUrl field",
      status: BugFindingStatus.MERGED,
      prUrl: "https://github.com/pr/1",
      releaseTag: "v1.4.2",
      sessionRunUrl: null,
      releaseRunUrl: null,
    },
    {
      id: "step-1",
      stepIndex: 1,
      repo: "ally-web",
      stepSummary: "Render it as a proper link",
      status: BugFindingStatus.BLOCKED,
      prUrl: null,
      releaseTag: null,
      sessionRunUrl: null,
      releaseRunUrl: null,
    },
  ];

  beforeEach(() => vi.clearAllMocks());

  it("shows the plan in ship order, with each step's own state", () => {
    renderDrawer(finding({ status: BugFindingStatus.COORDINATING, steps }));

    expect(screen.getByText("This fix spans 2 repos")).toBeInTheDocument();
    expect(screen.getByText("Step 1")).toBeInTheDocument();
    expect(screen.getByText("ally-be")).toBeInTheDocument();
    expect(screen.getByText("Add the emergencyServicesUrl field")).toBeInTheDocument();
    expect(screen.getByText("Step 2")).toBeInTheDocument();
    expect(screen.getByText("Render it as a proper link")).toBeInTheDocument();
  });

  it("says the order matters, since that is the whole reason for the plan", () => {
    renderDrawer(finding({ status: BugFindingStatus.COORDINATING, steps }));
    expect(screen.getByText(/releases them in the same order/i)).toBeInTheDocument();
  });

  it("offers no fix-session button on a coordinated parent — Bug Hunter drives it", () => {
    renderDrawer(finding({ status: BugFindingStatus.COORDINATING, steps }));
    expect(screen.queryByText("Start fix session")).not.toBeInTheDocument();
  });

  it("offers one release for the whole sequence once every step is merged", () => {
    renderDrawer(
      finding({
        status: BugFindingStatus.MERGED,
        steps: steps.map(step => ({ ...step, status: BugFindingStatus.MERGED })),
        releasable: true,
        releaseTarget: "Ally backend (ECS) → Admin dashboard (CloudFront)",
      }),
    );

    expect(screen.getAllByText("Release to production")).toHaveLength(1);
    fireEvent.click(screen.getByText("Release to production"));
    // The confirm names every deploy the click sets off, in order.
    expect(
      screen.getByText(/Ally backend \(ECS\) → Admin dashboard \(CloudFront\)/),
    ).toBeInTheDocument();
  });

  it("shows no plan block for an ordinary single-repo bug", () => {
    renderDrawer(finding());
    expect(screen.queryByText(/This fix spans/)).not.toBeInTheDocument();
  });
});
