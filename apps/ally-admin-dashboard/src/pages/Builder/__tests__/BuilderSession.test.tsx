import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@components", () => ({ cellTypes: {} }));

vi.mock("@ally-ui-mono/ui-shared", () => ({
  Button: ({ children, onClick, disabled }: any) => (
    <button onClick={onClick} disabled={disabled}>
      {children}
    </button>
  ),
  InlineNotification: ({ title }: any) => <div>{title}</div>,
  SkeletonText: () => <div>Loading…</div>,
  Tag: ({ children }: any) => <span>{children}</span>,
}));

// SteerComposer and CollapsibleAside render only in the build layout, which no
// test reached until the restart cases below.
vi.mock("@components/builder", () => ({
  BuildView: () => <div>BuildView</div>,
  ChatComposer: () => <div>ChatComposer</div>,
  ChatMessage: () => <div>ChatMessage</div>,
  CollapsibleAside: ({ children }: any) => <div>{children}</div>,
  ConfirmCancelDialog: () => null,
  PrdDocPanel: () => <div>PrdDocPanel</div>,
  ReadinessRing: () => <div>ReadinessRing</div>,
  StartBuildDialog: () => null,
  SteerComposer: () => <div>SteerComposer</div>,
}));

vi.mock("@components/error-boundary", () => ({
  ErrorBoundary: ({ children }: any) => <>{children}</>,
}));

const navigateMock = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<any>("react-router-dom");
  return {
    ...actual,
    useNavigate: () => navigateMock,
    useParams: () => ({ sessionId: "session-1" }),
    useLocation: () => ({ pathname: "/builder/session-1", state: null }),
  };
});

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

vi.mock("@utils", () => ({ asAgentText: (value: any) => value ?? "" }));

let onSessionInvalid: (() => Promise<null>) | undefined;
vi.mock("@hooks", () => ({
  useBuilderStream: (opts: any) => {
    onSessionInvalid = opts.onSessionInvalid;
    return {
      messages: [],
      isStreaming: false,
      sendMessage: vi.fn(),
      stop: vi.fn(),
      hydrateMessages: vi.fn(),
    };
  },
}));

let sessionResult: any;
let pullRequests: any[] = [];
vi.mock("@api", () => ({
  useGetBuilderSessionQuery: () => sessionResult,
  useGetBuilderSettingsQuery: () => ({ data: undefined }),
  usePatchBuilderPrdMutation: () => [vi.fn()],
  useCancelBuilderSessionMutation: () => [vi.fn(), { isLoading: false }],
  useGetBuilderPullRequestsQuery: () => ({ data: pullRequests }),
}));

// eslint-disable-next-line import/first
import { BuilderSession } from "../BuilderSession";

const baseSession = {
  id: "session-1",
  title: "Test session",
  status: "INTERVIEWING",
  prd: { title: "" },
  readiness: { ready: false },
  prdVersionNumber: 1,
  messages: [],
  repos: [],
  currentStage: null,
  error: null,
  budgetUsd: null,
};

describe("BuilderSession", () => {
  beforeEach(() => {
    navigateMock.mockClear();
    onSessionInvalid = undefined;
    sessionResult = { data: baseSession, isLoading: false, isError: false };
    pullRequests = [];
  });

  it("closes the embedded drawer instead of navigating away when the session is lost and 'New session' is clicked", async () => {
    const onClose = vi.fn();
    render(<BuilderSession sessionId="session-1" onClose={onClose} />);

    await act(async () => {
      await onSessionInvalid?.();
    });

    fireEvent.click(screen.getByText("New build"));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(navigateMock).not.toHaveBeenCalled();
  });

  it("navigates to the full-page Builder when the session is lost outside the drawer", async () => {
    render(<BuilderSession />);

    await act(async () => {
      await onSessionInvalid?.();
    });

    fireEvent.click(screen.getByText("New build"));

    expect(navigateMock).toHaveBeenCalledWith("/builder");
  });

  /**
   * Stopping a build used to strand the session. The start control lives in the
   * readiness panel, which stops rendering once a session has a build, and the
   * header offered its retry only on FAILED — so pressing stop, the one
   * deliberate mid-build action a person takes, was also the action that left
   * the PRD and the branch with no route back into a build.
   */
  const terminal = (status: string) => {
    sessionResult = {
      data: { ...baseSession, status, currentStage: "CODING" },
      isLoading: false,
      isError: false,
    };
    render(<BuilderSession />);
  };

  it("offers a way back into a build after a stop", () => {
    terminal("CANCELLED");
    expect(screen.getByText("Retry build")).toBeTruthy();
  });

  it("still offers one after a failure", () => {
    terminal("FAILED");
    expect(screen.getByText("Retry build")).toBeTruthy();
  });

  /**
   * Not from COMPLETED: its pull requests are open or merged, and a second
   * build of finished work opens a competing set against the same PRD.
   */
  it("does not offer one on finished work", () => {
    pullRequests = [{ id: "pr-1" }];
    terminal("COMPLETED");
    expect(screen.queryByText("Retry build")).toBeNull();
  });

  /**
   * "A session with no pull requests has shipped nothing, whatever its status."
   * A run that claimed done and left an empty branch settles the session green;
   * without this the page offers no way onward from a success that did not
   * happen.
   */
  it("offers one on a completed session that shipped nothing", () => {
    pullRequests = [];
    terminal("COMPLETED");
    expect(screen.getByText("Retry build")).toBeTruthy();
  });

  /**
   * The header used to prefer a local copy of the status that was seeded once,
   * at load, and never cleared — so a build that finished while you watched it
   * kept reading "Building" beneath a phase rail that had already reached the
   * end, and only a refresh reconciled the two. The poll moving is the moment
   * the local copy stops being the newer of the two.
   */
  it("follows the session row when a build finishes while the page is open", () => {
    sessionResult = {
      data: { ...baseSession, status: "BUILDING", currentStage: "CODING" },
      isLoading: false,
      isError: false,
    };
    const { rerender } = render(<BuilderSession />);
    expect(screen.getByText("Building")).toBeTruthy();

    sessionResult = {
      data: { ...baseSession, status: "COMPLETED", currentStage: "CODING" },
      isLoading: false,
      isError: false,
    };
    rerender(<BuilderSession />);

    expect(screen.getByText("Done")).toBeTruthy();
    expect(screen.queryByText("Building")).toBeNull();
  });
});
