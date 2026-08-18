import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { BugReportForm } from "../BugReportForm";

describe("BugReportForm", () => {
  it("disables submit until something is typed", () => {
    render(
      <BugReportForm open onClose={vi.fn()} onSubmit={vi.fn()} onSuccess={vi.fn()} />,
    );
    expect(screen.getByRole("button", { name: /send report/i })).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/what were you trying to do/i), {
      target: { value: "The submit button did nothing" },
    });
    expect(screen.getByRole("button", { name: /send report/i })).not.toBeDisabled();
  });

  it("submits the trimmed description and calls onSuccess", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const onSuccess = vi.fn();
    render(<BugReportForm open onClose={vi.fn()} onSubmit={onSubmit} onSuccess={onSuccess} />);

    fireEvent.change(screen.getByLabelText(/what were you trying to do/i), {
      target: { value: "  Login kept spinning  " },
    });
    fireEvent.click(screen.getByRole("button", { name: /send report/i }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
    expect(onSubmit).toHaveBeenCalledWith("Login kept spinning");
  });

  it("shows the rate-limit message on a rate-limited rejection", async () => {
    const onSubmit = vi.fn().mockRejectedValue({ rateLimited: true });
    render(<BugReportForm open onClose={vi.fn()} onSubmit={onSubmit} onSuccess={vi.fn()} />);

    fireEvent.change(screen.getByLabelText(/what were you trying to do/i), {
      target: { value: "Something broke" },
    });
    fireEvent.click(screen.getByRole("button", { name: /send report/i }));

    expect(await screen.findByText(/submitted a few reports recently/i)).toBeInTheDocument();
  });

  it("shows a generic error on any other rejection", async () => {
    const onSubmit = vi.fn().mockRejectedValue(new Error("network down"));
    render(<BugReportForm open onClose={vi.fn()} onSubmit={onSubmit} onSuccess={vi.fn()} />);

    fireEvent.change(screen.getByLabelText(/what were you trying to do/i), {
      target: { value: "Something broke" },
    });
    fireEvent.click(screen.getByRole("button", { name: /send report/i }));

    expect(await screen.findByText(/something went wrong sending that/i)).toBeInTheDocument();
  });

  it("resets its text and clears an error on cancel", () => {
    const onClose = vi.fn();
    render(<BugReportForm open onClose={onClose} onSubmit={vi.fn()} onSuccess={vi.fn()} />);

    fireEvent.change(screen.getByLabelText(/what were you trying to do/i), {
      target: { value: "Something broke" },
    });
    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
