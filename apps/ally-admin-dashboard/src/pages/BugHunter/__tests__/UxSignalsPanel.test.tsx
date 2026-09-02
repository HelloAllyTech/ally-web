import { render, screen, waitFor } from "@testing-library/react";
import { fireEvent } from "@testing-library/dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { UxSignalScanStatus, UxSignalScanTrigger } from "@types";

const invalidateTags = vi.fn();
const startScan = vi.fn();

vi.mock("@api", () => ({
  useScanUxSignalsMutation: vi.fn(() => [startScan, { isLoading: false }]),
  useGetUxSignalScansQuery: vi.fn(() => ({ data: { scans: [] } })),
  baseAPI: { util: { invalidateTags: (tags: unknown) => invalidateTags(tags) } },
}));

vi.mock("react-redux", () => ({
  useSelector: (selector: any) => selector({ user: { features: ["ux_signals"] } }),
  useDispatch: () => (action: unknown) => action,
}));

vi.mock("@utils", () => ({
  hasFeature: (features: string[], key: string) => features.includes(key),
}));

vi.mock("@ally-ui-mono/ui-shared", () => ({
  Tile: ({ children }: any) => <div>{children}</div>,
  InlineNotification: ({ kind, title, subtitle }: any) => (
    <div data-testid="notification" data-kind={kind}>
      {title}
      {subtitle}
    </div>
  ),
}));

vi.mock("@components", () => ({
  Button: ({ children, onClick, disabled }: any) => (
    <button onClick={onClick} disabled={disabled}>
      {children}
    </button>
  ),
  cellTypes: {},
}));

vi.mock("@components/types", () => ({ ButtonVariant: { SECONDARY: "secondary" } }));

import * as api from "@api";

import { UxSignalsPanel } from "../UxSignalsPanel";

/**
 * The panel's job is to say only what it knows.
 *
 * Its predecessor held one HTTP request open for the whole two-minute scan and
 * reported whatever that request did as the scan's outcome. In production the
 * gateway hung up at 60s and an admin was told the scan "could not be completed.
 * Nothing was filed" — while the scan ran on and filed seven findings. Every test
 * here is about the gap between what the panel is entitled to claim and what it
 * actually knows at that moment.
 */
describe("UxSignalsPanel", () => {
  const scan = (over: Partial<Record<string, unknown>> = {}) => ({
    id: "scan-1",
    trigger: UxSignalScanTrigger.MANUAL,
    status: UxSignalScanStatus.COMPLETED,
    windowFrom: "2026-08-26",
    windowTo: "2026-09-02",
    signalsDetected: 9,
    findingsCreated: 7,
    suggestionsCreated: 2,
    skippedDuplicates: 1,
    failedDetectors: [],
    error: null,
    startedBy: 1,
    startedAt: new Date().toISOString(),
    finishedAt: new Date().toISOString(),
    ...over,
  });

  const withScans = (...scans: unknown[]) =>
    (api.useGetUxSignalScansQuery as any).mockReturnValue({ data: { scans } });

  beforeEach(() => {
    vi.clearAllMocks();
    (api.useScanUxSignalsMutation as any).mockReturnValue([startScan, { isLoading: false }]);
    withScans();
  });

  it("claims nothing about the outcome while the scan is still running", async () => {
    // The whole bug, in one assertion: starting a scan tells you it started, and
    // nothing about what it found — because at this moment nothing has been found.
    startScan.mockReturnValue({ unwrap: async () => ({ scanId: "scan-1" }) });
    const { rerender } = render(<UxSignalsPanel />);

    fireEvent.click(screen.getByRole("button"));
    await waitFor(() => expect(startScan).toHaveBeenCalled());

    // The scan exists; nothing has been found yet.
    expect(screen.queryByTestId("notification")).not.toBeInTheDocument();
    // Disabled from the click itself, not from the next poll — a second press in
    // that gap could only earn a 409.
    expect(screen.getByRole("button")).toBeDisabled();

    withScans(scan({ status: UxSignalScanStatus.RUNNING, finishedAt: null }));
    rerender(<UxSignalsPanel />);

    expect(screen.getByText(/A scan is running now/)).toBeInTheDocument();
    expect(screen.queryByTestId("notification")).not.toBeInTheDocument();
  });

  it("reports the counts once the scan log says it finished, and refreshes both queues", async () => {
    startScan.mockReturnValue({ unwrap: async () => ({ scanId: "scan-1" }) });
    const { rerender } = render(<UxSignalsPanel />);

    withScans(scan({ status: UxSignalScanStatus.RUNNING, finishedAt: null }));
    fireEvent.click(screen.getByRole("button"));
    await waitFor(() => expect(startScan).toHaveBeenCalled());

    // The poll lands and the run is done.
    withScans(scan());
    rerender(<UxSignalsPanel />);

    await waitFor(() =>
      expect(screen.getByTestId("notification")).toHaveTextContent(
        "7 bugs and 2 suggestions filed",
      ),
    );
    expect(screen.getByTestId("notification")).toHaveAttribute("data-kind", "success");
    // The findings only exist now, so this is the first moment either table has
    // anything new to fetch.
    expect(invalidateTags).toHaveBeenCalled();
  });

  it("names the reason a scan failed rather than sending the reader to find a log", async () => {
    startScan.mockReturnValue({ unwrap: async () => ({ scanId: "scan-1" }) });
    const { rerender } = render(<UxSignalsPanel />);

    withScans(scan({ status: UxSignalScanStatus.RUNNING, finishedAt: null }));
    fireEvent.click(screen.getByRole("button"));
    await waitFor(() => expect(startScan).toHaveBeenCalled());

    withScans(
      scan({
        status: UxSignalScanStatus.FAILED,
        error: "PostHog rejected the query (403)",
        findingsCreated: 0,
        suggestionsCreated: 0,
      }),
    );
    rerender(<UxSignalsPanel />);

    await waitFor(() =>
      expect(screen.getByTestId("notification")).toHaveTextContent(
        "PostHog rejected the query (403)",
      ),
    );
    expect(screen.getByTestId("notification")).toHaveAttribute("data-kind", "error");
    // A failed scan must never be invalidated into the queues as though it wrote.
    expect(invalidateTags).not.toHaveBeenCalled();
  });

  it("stops waiting on a scan that died mid-run instead of spinning forever", () => {
    // A RUNNING row past the backend's staleness cutoff: the process that was
    // running it is gone. Without this the panel polls a dead row indefinitely
    // and the button stays disabled for a scan that will never report.
    withScans(
      scan({
        status: UxSignalScanStatus.RUNNING,
        finishedAt: null,
        startedAt: new Date(Date.now() - 20 * 60_000).toISOString(),
      }),
    );

    render(<UxSignalsPanel />);

    expect(screen.getByText(/never reported back/)).toBeInTheDocument();
    expect(screen.getByRole("button")).not.toBeDisabled();
  });

  it("does not claim nothing was filed when it could not confirm the start", async () => {
    // The catch-all branch — a gateway error page, a dropped connection. The app
    // does not know whether the scan was claimed, so it must not say.
    startScan.mockReturnValue({
      unwrap: async () => {
        throw { status: 504, data: "<html>Gateway Timeout</html>" };
      },
    });

    render(<UxSignalsPanel />);
    fireEvent.click(screen.getByRole("button"));

    const notification = await screen.findByTestId("notification");
    expect(notification).toHaveTextContent(/Couldn’t confirm the scan started/);
    expect(notification).not.toHaveTextContent(/Nothing was filed/);
  });

  it("answers a 409 in its own words, since the server's add nothing a reader needs", async () => {
    // The one status where our copy beats the server's: "you double-clicked" and
    // "you lost a race" are the same event to the reader, and the next step is
    // the same too.
    startScan.mockReturnValue({
      unwrap: async () => {
        throw { status: 409, data: { message: "A UX Signals scan is already running." } };
      },
    });

    render(<UxSignalsPanel />);
    fireEvent.click(screen.getByRole("button"));

    expect(await screen.findByTestId("notification")).toHaveTextContent(
      /A scan is already running/,
    );
  });
});
