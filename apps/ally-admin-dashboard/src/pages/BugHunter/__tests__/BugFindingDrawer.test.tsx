import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { BugFindingStatus } from "@types";

import { BugFindingDrawer } from "../BugFindingDrawer";

const startFixSession = vi.fn();
const cancelFixSession = vi.fn();
const releaseFinding = vi.fn();
const editDescription = vi.fn();
const getBugFinding = vi.fn();

vi.mock("@api", () => ({
  useGetBugFindingQuery: (...args: unknown[]) => getBugFinding(...args),
  useApproveBugFindingMutation: () => [vi.fn(), { isLoading: false }],
  useRejectBugFindingMutation: () => [vi.fn(), { isLoading: false }],
  useAnswerBugFindingMutation: () => [vi.fn(), { isLoading: false }],
  useStartBugFixSessionMutation: () => [startFixSession, { isLoading: false }],
  useCancelBugFixSessionMutation: () => [cancelFixSession, { isLoading: false }],
  useReleaseBugFindingMutation: () => [releaseFinding, { isLoading: false }],
  useEditBugFindingDescriptionMutation: () => [editDescription, { isLoading: false }],
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

vi.mock("@utils", () => ({
  formatDate: (d: string) => d,
  formatDateTime: (d: string) => d,
  formatTimestamp: (d: string) => d,
}));
vi.mock("@assets", () => ({ TooltipIcon: () => <svg data-testid="tooltip-icon" /> }));

vi.mock("@ally-ui-mono/ui-shared", () => ({
  Button: ({ children, onClick, disabled }: any) => (
    <button onClick={onClick} disabled={disabled}>
      {children}
    </button>
  ),
  TextArea: ({ value, onChange, placeholder, labelText, invalid, invalidText }: any) => (
    <>
      <textarea
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        aria-label={labelText}
      />
      {invalid && <p>{invalidText}</p>}
    </>
  ),
  Tooltip: ({ children }: any) => <>{children}</>,
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
  originalDescription: null,
  descriptionEditedBy: null,
  descriptionEditedAt: null,
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
  sessionRunId: null,
  releaseTag: null,
  releaseRunUrl: null,
  releasedBy: null,
  releasedAt: null,
  cancelledBy: null,
  cancelledAt: null,
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
    expect(screen.getByText("Put me on it")).toBeInTheDocument();
  });

  it("starts the session on confirm, without asking for a repo", async () => {
    renderDrawer(finding());
    fireEvent.click(screen.getByText("Put me on it"));
    fireEvent.click(screen.getByText("Start now"));

    await waitFor(() =>
      expect(startFixSession).toHaveBeenCalledWith({ id: "finding-1" }),
    );
  });

  it("starts the session immediately even when the bug has no repo yet — Bug Hunter classifies it, not the admin", async () => {
    renderDrawer(finding({ repo: null }));
    fireEvent.click(screen.getByText("Put me on it"));

    expect(screen.getByText("Start now")).not.toBeDisabled();
    expect(screen.queryByTestId("repo-picker")).not.toBeInTheDocument();

    fireEvent.click(screen.getByText("Start now"));
    await waitFor(() =>
      expect(startFixSession).toHaveBeenCalledWith({ id: "finding-1" }),
    );
  });

  it("hides the button while a session is already in flight", () => {
    renderDrawer(finding({ status: BugFindingStatus.FIXING }));
    expect(screen.queryByText("Put me on it")).not.toBeInTheDocument();
  });

  it("offers a retry, worded as such, after a failed attempt", () => {
    renderDrawer(finding({ status: BugFindingStatus.FAILED }));
    expect(screen.getByText("Ask me to try again")).toBeInTheDocument();
  });

  it("explains the wait while queued rather than showing an idle drawer", () => {
    renderDrawer(finding({ status: BugFindingStatus.QUEUED }));
    expect(screen.getByText(/waiting for a runner/i)).toBeInTheDocument();
  });

  it("links to the running session once the backend has correlated it", () => {
    renderDrawer(
      finding({ status: BugFindingStatus.FIXING, sessionRunUrl: "https://github.com/run/1" }),
    );
    expect(screen.getByText("Watch me work")).toHaveAttribute("href", "https://github.com/run/1");
  });

  it("surfaces the backend's own refusal message rather than a generic one", async () => {
    const { toast } = await import("sonner");
    startFixSession.mockReturnValue({
      unwrap: () => Promise.reject({ data: { message: "Bug Hunter is OFF." } }),
    });
    renderDrawer(finding());

    fireEvent.click(screen.getByText("Put me on it"));
    fireEvent.click(screen.getByText("Start now"));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Bug Hunter is OFF."));
  });
});

describe("BugFindingDrawer — stop fix session", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cancelFixSession.mockReturnValue({ unwrap: () => Promise.resolve({}) });
  });

  it("offers to stop a session that's queued", () => {
    renderDrawer(finding({ status: BugFindingStatus.QUEUED }));
    expect(screen.getByText("Stop fix session")).toBeInTheDocument();
  });

  it("offers to stop a session that's actively fixing", () => {
    renderDrawer(finding({ status: BugFindingStatus.FIXING }));
    expect(screen.getByText("Stop fix session")).toBeInTheDocument();
  });

  it("hides the stop button once nothing is running — the whole point is stopping something in flight", () => {
    renderDrawer(finding({ status: BugFindingStatus.NEW }));
    expect(screen.queryByText("Stop fix session")).not.toBeInTheDocument();
  });

  it("hides the stop button once the session has already settled", () => {
    renderDrawer(finding({ status: BugFindingStatus.MERGED }));
    expect(screen.queryByText("Stop fix session")).not.toBeInTheDocument();
  });

  it("asks for confirmation before cancelling, rather than stopping on the first click", () => {
    renderDrawer(finding({ status: BugFindingStatus.FIXING }));
    fireEvent.click(screen.getByText("Stop fix session"));

    expect(screen.getByTestId("confirm-popup")).toBeInTheDocument();
    expect(screen.getByText("Stop this fix session?")).toBeInTheDocument();
    expect(cancelFixSession).not.toHaveBeenCalled();
  });

  it("cancels the session only once the confirm dialog is accepted", async () => {
    renderDrawer(finding({ status: BugFindingStatus.FIXING }));
    fireEvent.click(screen.getByText("Stop fix session"));
    fireEvent.click(screen.getByText("Stop it"));

    await waitFor(() => expect(cancelFixSession).toHaveBeenCalledWith("finding-1"));
  });

  it("surfaces the backend's own refusal message rather than a generic one", async () => {
    const { toast } = await import("sonner");
    cancelFixSession.mockReturnValue({
      unwrap: () => Promise.reject({ data: { message: "Session already finished." } }),
    });
    renderDrawer(finding({ status: BugFindingStatus.QUEUED }));

    fireEvent.click(screen.getByText("Stop fix session"));
    fireEvent.click(screen.getByText("Stop it"));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Session already finished."));
  });

  it("falls back to a generic failure message when the backend gives none", async () => {
    const { toast } = await import("sonner");
    cancelFixSession.mockReturnValue({ unwrap: () => Promise.reject({}) });
    renderDrawer(finding({ status: BugFindingStatus.QUEUED }));

    fireEvent.click(screen.getByText("Stop fix session"));
    fireEvent.click(screen.getByText("Stop it"));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Couldn't stop the fix session."));
  });

  it("offers a retry worded the same as a failed attempt once cancelled, not a fresh 'put me on it'", () => {
    renderDrawer(finding({ status: BugFindingStatus.CANCELLED }));
    expect(screen.getByText("Ask me to try again")).toBeInTheDocument();
    expect(screen.queryByText("Stop fix session")).not.toBeInTheDocument();
  });

  it("credits who stopped it, the same way a release or a decision is signed", () => {
    renderDrawer(
      finding({
        status: BugFindingStatus.CANCELLED,
        cancelledBy: 9,
        cancelledAt: "2026-08-19",
      }),
    );
    expect(screen.getByText(/Stopped by user #9/)).toBeInTheDocument();
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
    expect(screen.getByText(/live in production as v1\.4\.2/i)).toBeInTheDocument();
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
    expect(screen.getByText(/release them in the same order/i)).toBeInTheDocument();
  });

  it("offers no fix-session button on a coordinated parent — Bug Hunter drives it", () => {
    renderDrawer(finding({ status: BugFindingStatus.COORDINATING, steps }));
    expect(screen.queryByText("Put me on it")).not.toBeInTheDocument();
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

describe("BugFindingDrawer — a backend older than this build", () => {
  beforeEach(() => vi.clearAllMocks());

  /**
   * The admin console shipped the plan/release drawer one release ahead of the
   * ally-be that serves `steps`, and the drawer read `.some`/`.length` straight
   * off the missing array. With no error boundary above it the throw unmounted
   * the whole console — every row in the bugs table went to a blank screen.
   * The drawer has to survive a response that predates a field it knows about.
   */
  it("still renders the bug when the response carries no steps or events at all", () => {
    const legacy = finding();
    delete legacy.steps;
    delete legacy.events;
    delete legacy.releasable;
    delete legacy.releaseTarget;
    delete legacy.releaseBlockedReason;

    renderDrawer(legacy);

    // What the admin came for is on screen, not a blank page.
    expect(screen.getByText("Terms link is not formatted correctly")).toBeInTheDocument();
    expect(
      screen.getByText("The external emergency-services link renders unstyled."),
    ).toBeInTheDocument();
    // The timeline degrades to its empty state rather than taking the page down.
    expect(screen.getByText(/haven.t touched this one yet/i)).toBeInTheDocument();
    // And no plan block, since an absent step list means the same as an empty one.
    expect(screen.queryByText(/This fix spans/)).not.toBeInTheDocument();
  });
});

/**
 * Rewriting the brief before a fix session runs.
 *
 * The description is not a record of the bug — it is the text ally-be pastes
 * into the fix agent's prompt as the entire statement of what is wrong. So
 * these cover where the control appears (exactly where "Put me on it" does),
 * that it says nothing about approving, and that the original stays reachable
 * once it has been replaced.
 */
describe("BugFindingDrawer — rewriting the description", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    editDescription.mockReturnValue({ unwrap: () => Promise.resolve({}) });
  });

  const openEditor = (data: Record<string, unknown>) => {
    renderDrawer(data);
    fireEvent.click(screen.getByText("Rewrite this for me"));
    return screen.getByRole("textbox", { name: /as you want me to understand it/i });
  };

  it("offers the rewrite on a bug that hasn't been fixed yet", () => {
    renderDrawer(finding());
    expect(screen.getByText("Rewrite this for me")).toBeInTheDocument();
  });

  it.each([
    BugFindingStatus.QUEUED,
    BugFindingStatus.FIXING,
    BugFindingStatus.MERGED,
    BugFindingStatus.RELEASED,
  ])("hides the rewrite while the bug is %s", status => {
    renderDrawer(finding({ status }));
    expect(screen.queryByText("Rewrite this for me")).not.toBeInTheDocument();
  });

  it("starts the draft from the current description, not an empty box", () => {
    const textarea = openEditor(finding());
    expect(textarea).toHaveValue("The external emergency-services link renders unstyled.");
  });

  it("saves the trimmed rewrite", async () => {
    const textarea = openEditor(finding());
    fireEvent.change(textarea, {
      target: { value: "  Tapping the terms link opens an unstyled page on Android only.  " },
    });
    fireEvent.click(screen.getByText("Save description"));

    await waitFor(() =>
      expect(editDescription).toHaveBeenCalledWith({
        id: "finding-1",
        description: "Tapping the terms link opens an unstyled page on Android only.",
      }),
    );
  });

  it("refuses to save an emptied description", () => {
    const textarea = openEditor(finding());
    fireEvent.change(textarea, { target: { value: "   " } });

    // A blank brief would leave the fix agent's prompt saying "Bug:" and
    // nothing else, so the button is closed rather than the failure deferred
    // to a 400.
    expect(screen.getByText("Save description")).toBeDisabled();
  });

  it("blocks and explains a brief that's too long to be one", () => {
    const textarea = openEditor(finding());
    fireEvent.change(textarea, { target: { value: "x".repeat(5001) } });

    expect(screen.getByText(/longer than I can take as a brief/i)).toBeInTheDocument();
    expect(screen.getByText("Save description")).toBeDisabled();
  });

  it("leaves the description alone on cancel", () => {
    const textarea = openEditor(finding());
    fireEvent.change(textarea, { target: { value: "a different bug entirely" } });
    fireEvent.click(screen.getByText("Cancel"));

    expect(editDescription).not.toHaveBeenCalled();
    expect(
      screen.getByText("The external emergency-services link renders unstyled."),
    ).toBeInTheDocument();
  });

  it("keeps what Bug Hunter originally found reachable after a rewrite", () => {
    renderDrawer(
      finding({
        description: "Tapping the terms link opens an unstyled page on Android only.",
        originalDescription: "terms link looks wrong",
        descriptionEditedBy: 42,
        descriptionEditedAt: "2026-08-19",
      }),
    );

    expect(screen.getByText(/Rewritten by user #42/)).toBeInTheDocument();
    // Collapsed by default — the current brief is what matters day to day.
    expect(screen.queryByText("terms link looks wrong")).not.toBeInTheDocument();

    fireEvent.click(screen.getByText("See what I originally found"));
    expect(screen.getByText("terms link looks wrong")).toBeInTheDocument();
  });

  it("says nothing about an original on a bug nobody has rewritten", () => {
    renderDrawer(finding());
    expect(screen.queryByText(/Rewritten by user/)).not.toBeInTheDocument();
    expect(screen.queryByText("See what I originally found")).not.toBeInTheDocument();
  });

  it("surfaces the backend's own refusal verbatim", async () => {
    const { toast } = await import("sonner");
    editDescription.mockReturnValue({
      unwrap: () =>
        Promise.reject({
          data: { message: "Finding finding-1 is queued — its description can't be changed." },
        }),
    });

    const textarea = openEditor(finding());
    fireEvent.change(textarea, { target: { value: "a better brief" } });
    fireEvent.click(screen.getByText("Save description"));

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        "Finding finding-1 is queued — its description can't be changed.",
      ),
    );
  });
});

/**
 * An open draft and a live "Put me on it" cannot coexist.
 *
 * Caught in the real console, not by the tests above: the fix-session button
 * sits directly under the editor, and pressing it mid-rewrite dispatched a
 * session that read the OLD description while the admin's unsaved words went
 * nowhere — briefing the agent on exactly the text that had just been judged
 * wrong. Approving has the same shape via the next sweep.
 */
describe("BugFindingDrawer — an unsaved rewrite blocks the decisions under it", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    editDescription.mockReturnValue({ unwrap: () => Promise.resolve({}) });
    startFixSession.mockReturnValue({ unwrap: () => Promise.resolve({}) });
  });

  it("closes 'Put me on it' while a draft is open, and says why", () => {
    renderDrawer(finding());
    expect(screen.getByText("Put me on it")).not.toBeDisabled();

    fireEvent.click(screen.getByText("Rewrite this for me"));

    expect(screen.getByText("Put me on it")).toBeDisabled();
    expect(screen.getByText(/Save or cancel your rewrite first/i)).toBeInTheDocument();
  });

  it("closes the Manual-mode decision too — the next sweep would read the old words", () => {
    renderDrawer(finding({ status: BugFindingStatus.PENDING_APPROVAL }));
    fireEvent.click(screen.getByText("Rewrite this for me"));

    expect(screen.getByText("Approve — go fix it")).toBeDisabled();
    expect(screen.getByText("Reject")).toBeDisabled();
  });

  it("reopens them once the rewrite is settled", async () => {
    renderDrawer(finding());
    fireEvent.click(screen.getByText("Rewrite this for me"));
    fireEvent.click(screen.getByText("Cancel"));

    await waitFor(() => expect(screen.getByText("Put me on it")).not.toBeDisabled());
    expect(screen.queryByText(/Save or cancel your rewrite first/i)).not.toBeInTheDocument();
  });
});
