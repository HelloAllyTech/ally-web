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

vi.mock("@components/builder", () => ({
  BuildView: () => <div>BuildView</div>,
  ChatComposer: () => <div>ChatComposer</div>,
  ChatMessage: () => <div>ChatMessage</div>,
  ConfirmCancelDialog: () => null,
  PrdDocPanel: () => <div>PrdDocPanel</div>,
  ReadinessRing: () => <div>ReadinessRing</div>,
  StartBuildDialog: () => null,
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
vi.mock("@api", () => ({
  useGetBuilderSessionQuery: () => sessionResult,
  useGetBuilderSettingsQuery: () => ({ data: undefined }),
  usePatchBuilderPrdMutation: () => [vi.fn()],
  useCancelBuilderSessionMutation: () => [vi.fn(), { isLoading: false }],
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
});
