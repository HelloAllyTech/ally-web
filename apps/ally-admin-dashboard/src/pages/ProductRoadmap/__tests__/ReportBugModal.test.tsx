import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ReportBugModal } from "../ReportBugModal";

const mockCreateBugReport = vi.fn();
const mockToastSuccess = vi.fn();

vi.mock("@api", () => ({
  useCreateRoadmapBugReportMutation: () => [mockCreateBugReport],
}));

vi.mock("sonner", () => ({
  toast: {
    success: (message: string) => mockToastSuccess(message),
    error: vi.fn(),
  },
}));

const renderModal = (onClose = vi.fn()) =>
  render(
    <MemoryRouter initialEntries={["/product-roadmap?tab=opportunities&opportunity=abc-123"]}>
      <ReportBugModal onClose={onClose} />
    </MemoryRouter>,
  );

describe("ReportBugModal", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("submits with silently-captured context, then toasts and closes", async () => {
    mockCreateBugReport.mockReturnValue({
      unwrap: () => Promise.resolve({ id: "finding-1", stage: "new" }),
    });
    const onClose = vi.fn();
    renderModal(onClose);

    fireEvent.change(screen.getByLabelText(/what went wrong/i), {
      target: { value: "Vote button saved 0 votes silently" },
    });
    fireEvent.click(screen.getByRole("button", { name: /report bug/i }));

    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(mockToastSuccess).toHaveBeenCalledTimes(1);

    const [body] = mockCreateBugReport.mock.calls[0];
    expect(body.description).toBe("Vote button saved 0 votes silently");
    // The query string is part of the captured screen, not just the path: on this page the
    // open tab and drawer live entirely in ?tab= and ?opportunity=, so a bare pathname would
    // point a triager at the roadmap without saying which of its screens broke.
    expect(body.context.screen).toBe("/product-roadmap?tab=opportunities&opportunity=abc-123");
    expect(typeof body.context.clientTimestamp).toBe("string");
  });

  it("never asks the reporter for anything but the one prompt", () => {
    mockCreateBugReport.mockReturnValue({ unwrap: () => Promise.resolve({}) });
    renderModal();

    // The Type dropdown this replaces made filing a bug a field on a form full of
    // idea-shaped questions. Nothing about a product goal, severity or category belongs here.
    expect(screen.queryByLabelText(/product goal/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/severity/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/type/i)).not.toBeInTheDocument();
  });

  it("shows the throttle message rather than the generic one on a 429", async () => {
    mockCreateBugReport.mockReturnValue({
      unwrap: () => Promise.reject({ status: 429, data: { statusCode: 429 } }),
    });
    renderModal();

    fireEvent.change(screen.getByLabelText(/what went wrong/i), {
      target: { value: "Something broke" },
    });
    fireEvent.click(screen.getByRole("button", { name: /report bug/i }));

    expect(await screen.findByText(/filed a few reports just now/i)).toBeInTheDocument();
    expect(mockToastSuccess).not.toHaveBeenCalled();
  });

  it("keeps the form open on a non-429 failure so the typed report is not lost", async () => {
    mockCreateBugReport.mockReturnValue({
      unwrap: () => Promise.reject({ status: 500 }),
    });
    const onClose = vi.fn();
    renderModal(onClose);

    fireEvent.change(screen.getByLabelText(/what went wrong/i), {
      target: { value: "Board renders empty after applying a saved view" },
    });
    fireEvent.click(screen.getByRole("button", { name: /report bug/i }));

    expect(await screen.findByText(/could not file that bug report/i)).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByLabelText(/what went wrong/i)).toHaveValue(
      "Board renders empty after applying a saved view",
    );
  });
});
