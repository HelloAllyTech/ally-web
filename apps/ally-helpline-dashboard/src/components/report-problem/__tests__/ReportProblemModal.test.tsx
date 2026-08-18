import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ReportProblemModal } from "../ReportProblemModal";

const mockCreateBugReport = vi.fn();
const mockToastSuccess = vi.fn();

vi.mock("@api", () => ({
  useCreateBugReportMutation: () => [mockCreateBugReport],
}));

vi.mock("sonner", () => ({
  toast: {
    success: (msg: string) => mockToastSuccess(msg),
    error: vi.fn(),
  },
}));

const renderModal = (onClose = vi.fn()) =>
  render(
    <MemoryRouter initialEntries={["/learn/track/42"]}>
      <ReportProblemModal open onClose={onClose} />
    </MemoryRouter>,
  );

describe("ReportProblemModal", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("submits with silently-captured context and toasts + closes on success", async () => {
    mockCreateBugReport.mockReturnValue({ unwrap: () => Promise.resolve({ id: "1", stage: "new" }) });
    const onClose = vi.fn();
    renderModal(onClose);

    fireEvent.change(screen.getByLabelText(/what were you trying to do/i), {
      target: { value: "The track player froze" },
    });
    fireEvent.click(screen.getByRole("button", { name: /send report/i }));

    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(mockToastSuccess).toHaveBeenCalledTimes(1);

    const [body] = mockCreateBugReport.mock.calls[0];
    expect(body.description).toBe("The track player froze");
    expect(body.context.screen).toBe("/learn/track/42");
    expect(typeof body.context.clientTimestamp).toBe("string");
  });

  it("shows the rate-limit message on a 429", async () => {
    mockCreateBugReport.mockReturnValue({
      unwrap: () => Promise.reject({ status: 429, data: { statusCode: 429 } }),
    });
    renderModal();

    fireEvent.change(screen.getByLabelText(/what were you trying to do/i), {
      target: { value: "Something broke" },
    });
    fireEvent.click(screen.getByRole("button", { name: /send report/i }));

    expect(await screen.findByText(/submitted a few reports recently/i)).toBeInTheDocument();
    expect(mockToastSuccess).not.toHaveBeenCalled();
  });
});
