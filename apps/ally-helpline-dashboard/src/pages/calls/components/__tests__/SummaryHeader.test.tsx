import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import SummaryHeader from "../SummaryHeader";

// Mock Redux
vi.mock("react-redux", () => ({
  useSelector: (fn: any) =>
    fn({
      user: {
        user: { role: "COUNSELLOR", userId: 1 },
        permissions: ["edit:call:info"],
      },
    }),
}));

// Mock API hooks
const mockUpdateCallInfo = vi.fn();
vi.mock("@api", () => ({
  useUpdateCallInfoMutation: () => [mockUpdateCallInfo],
  useGetCallSummaryQuery: (_chatId: number) => ({ data: { counselorId: 1 } }),
}));

// Mock hooks
vi.mock("@hooks", () => ({
  useDebounce: (fn: any) => fn,
}));

// Mock assets/components
vi.mock("@assets", () => ({
  Edit: (props: any) => <div {...props}>EditIcon</div>,
  Carousel1: (props: any) => <div {...props}>Carousel1</div>,
  Carousel2: (props: any) => <div {...props}>Carousel2</div>,
  Carousel3: (props: any) => <div {...props}>Carousel3</div>,
  Carousel4: (props: any) => <div {...props}>Carousel4</div>,
}));
vi.mock("@components", () => ({ TextField: (props: any) => <input {...props} /> }));

describe("SummaryHeader", () => {
  const chatId = 1;
  const setSummaryName = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders summary name", () => {
    render(
      <SummaryHeader
        summaryName="Test Summary"
        setSummaryName={setSummaryName}
        chatId={chatId}
        counselorId={1}
      />,
    );
    expect(screen.getByDisplayValue("Test Summary")).toBeInTheDocument();
  });

  it("clicking Edit enables renaming and focuses input", () => {
    render(
      <SummaryHeader
        summaryName="Test Summary"
        setSummaryName={setSummaryName}
        chatId={chatId}
        counselorId={1}
      />,
    );
    fireEvent.click(screen.getByText("EditIcon"));
    const input = screen.getByDisplayValue("Test Summary") as HTMLInputElement;

    // Check that the input is no longer disabled (pointer-events-none class removed)
    expect(input).not.toHaveClass("pointer-events-none");

    // Check that the Edit button is no longer visible (since isRenaming is true)
    expect(screen.queryByText("EditIcon")).not.toBeInTheDocument();
  });

  it("changing input calls setSummaryName and updateCallInfo", () => {
    render(
      <SummaryHeader
        summaryName="Old Name"
        setSummaryName={setSummaryName}
        chatId={chatId}
        counselorId={1}
      />,
    );
    const input = screen.getByDisplayValue("Old Name") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "New Name" } });
    expect(setSummaryName).toHaveBeenCalledWith("New Name");
    expect(mockUpdateCallInfo).toHaveBeenCalledWith({
      chatId,
      callInfo: { summaryName: "New Name" },
    });
  });

  it("blurring input disables renaming", () => {
    render(
      <SummaryHeader
        summaryName="Test Summary"
        setSummaryName={setSummaryName}
        chatId={chatId}
        counselorId={1}
      />,
    );
    const input = screen.getByDisplayValue("Test Summary") as HTMLInputElement;
    fireEvent.blur(input);
    expect(input).toHaveClass("pointer-events-none");
  });
});
