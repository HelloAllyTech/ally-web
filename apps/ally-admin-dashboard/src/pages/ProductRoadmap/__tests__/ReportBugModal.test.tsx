import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ReportBugModal } from "../ReportBugModal";

const mockCreateBugReport = vi.fn();
const mockToastSuccess = vi.fn();

const mockGetBugFindings = vi.fn(() => ({ data: undefined }));

vi.mock("@api", () => ({
  useCreateRoadmapBugReportMutation: () => [mockCreateBugReport],
  useGetBugFindingsQuery: (...args: unknown[]) => mockGetBugFindings(...args),
}));

vi.mock("sonner", () => ({
  toast: {
    success: (message: string) => mockToastSuccess(message),
    error: vi.fn(),
  },
}));

/** The two answers the form insists on besides "what went wrong". */
const fillRequired = () => {
  fireEvent.change(screen.getByLabelText(/what did you expect to happen instead/i), {
    target: { value: "The vote to be saved." },
  });
  fireEvent.click(screen.getByLabelText(/admin dashboard/i));
};

const LONG_ENOUGH = "Vote button saved 0 votes silently after I clicked it twice";

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
      target: { value: LONG_ENOUGH },
    });
    fillRequired();
    fireEvent.click(screen.getByRole("button", { name: /report bug/i }));

    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(mockToastSuccess).toHaveBeenCalledTimes(1);

    const [body] = mockCreateBugReport.mock.calls[0];
    expect(body.description).toBe(LONG_ENOUGH);
    // The structured answers ride in the context; ally-be folds them into the brief.
    expect(body.context.expected).toBe("The vote to be saved.");
    expect(body.context.surface).toBe("admin");
    expect(typeof body.context.happenedAt).toBe("string");
    // The query string is part of the captured screen, not just the path: on this page the
    // open tab and drawer live entirely in ?tab= and ?opportunity=, so a bare pathname would
    // point a triager at the roadmap without saying which of its screens broke.
    expect(body.context.screen).toBe("/product-roadmap?tab=opportunities&opportunity=abc-123");
    expect(typeof body.context.clientTimestamp).toBe("string");
  });

  it("asks three things up front and keeps the rest, including the codebase picker, behind Add details", () => {
    mockCreateBugReport.mockReturnValue({ unwrap: () => Promise.resolve({}) });
    renderModal();

    expect(screen.getByLabelText(/what went wrong/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/what did you expect to happen instead/i)).toBeInTheDocument();
    expect(screen.getByText(/where did you see it\?/i)).toBeInTheDocument();
    // Nothing idea-shaped, and nothing engineer-shaped, on the first screen.
    expect(screen.queryByLabelText(/product goal/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/which codebase/i)).not.toBeInTheDocument();
    expect(screen.queryByTestId("report-bug-details")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /add details/i }));
    expect(screen.getByTestId("report-bug-details")).toBeInTheDocument();
    expect(screen.getByLabelText(/steps to reproduce/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/when did it happen/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/which codebase\? \(optional\)/i)).toHaveValue("");
  });

  it("holds Report until a sentence, an expectation and a place are given", () => {
    mockCreateBugReport.mockReturnValue({ unwrap: () => Promise.resolve({}) });
    renderModal();
    const report = screen.getByRole("button", { name: /report bug/i });

    fireEvent.change(screen.getByLabelText(/what went wrong/i), { target: { value: "broken" } });
    expect(screen.getByText(/more characters/i)).toBeInTheDocument();
    expect(report).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/what went wrong/i), { target: { value: LONG_ENOUGH } });
    expect(report).toBeDisabled();
    fillRequired();
    expect(report).toBeEnabled();
  });

  it("offers the open bugs that read like the report as 'Already reported?', without blocking Send", () => {
    mockCreateBugReport.mockReturnValue({ unwrap: () => Promise.resolve({}) });
    mockGetBugFindings.mockReturnValue({
      data: {
        items: [
          {
            id: "f-dup",
            title: "Vote button saves zero votes",
            description: "clicked twice",
            status: "new",
            repo: "ally-web",
          },
          {
            id: "f-closed",
            title: "Vote button saves zero votes",
            description: "",
            status: "dismissed",
            repo: "ally-web",
          },
          {
            id: "f-other",
            title: "Scheduler drops jobs",
            description: "redis",
            status: "new",
            repo: "ally-be",
          },
        ],
      },
    } as never);
    renderModal();

    fireEvent.change(screen.getByLabelText(/what went wrong/i), { target: { value: LONG_ENOUGH } });
    const hint = screen.getByTestId("report-bug-similar");
    expect(hint).toHaveTextContent("Already reported?");
    expect(hint).toHaveTextContent("Vote button saves zero votes");
    expect(hint.querySelectorAll("li")).toHaveLength(1);
    expect(hint.querySelector("a")?.getAttribute("href")).toBe("/bug-hunter?bug=f-dup");
    fillRequired();
    expect(screen.getByRole("button", { name: /report bug/i })).toBeEnabled();
  });

  it("sends the codebase the reporter named, so Bug Hunter skips guessing", async () => {
    mockCreateBugReport.mockReturnValue({ unwrap: () => Promise.resolve({}) });
    renderModal();

    fireEvent.click(screen.getByRole("button", { name: /add details/i }));
    fireEvent.change(screen.getByLabelText(/which codebase\? \(optional\)/i), {
      target: { value: "ally-web" },
    });
    fireEvent.change(screen.getByLabelText(/what went wrong/i), {
      target: { value: "Report a problem modal buttons stick out of the rounded corners" },
    });
    fillRequired();
    fireEvent.click(screen.getByRole("button", { name: /report bug/i }));

    await waitFor(() =>
      expect(mockCreateBugReport).toHaveBeenCalledWith(
        expect.objectContaining({ repo: "ally-web" }),
      ),
    );
  });

  it("sends no repo when the reporter leaves the picker on the default", async () => {
    mockCreateBugReport.mockReturnValue({ unwrap: () => Promise.resolve({}) });
    renderModal();

    fireEvent.change(screen.getByLabelText(/what went wrong/i), {
      target: { value: LONG_ENOUGH },
    });
    fillRequired();
    fireEvent.click(screen.getByRole("button", { name: /report bug/i }));

    await waitFor(() => expect(mockCreateBugReport).toHaveBeenCalled());
    expect(mockCreateBugReport.mock.calls[0][0]).not.toHaveProperty("repo");
  });

  it("shows the throttle message rather than the generic one on a 429", async () => {
    mockCreateBugReport.mockReturnValue({
      unwrap: () => Promise.reject({ status: 429, data: { statusCode: 429 } }),
    });
    renderModal();

    fireEvent.change(screen.getByLabelText(/what went wrong/i), {
      target: { value: LONG_ENOUGH },
    });
    fillRequired();
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
      target: { value: LONG_ENOUGH },
    });
    fillRequired();
    fireEvent.click(screen.getByRole("button", { name: /report bug/i }));

    expect(await screen.findByText(/could not file that bug report/i)).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByLabelText(/what went wrong/i)).toHaveValue(LONG_ENOUGH);
  });
});
