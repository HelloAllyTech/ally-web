import { FC } from "react";

import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

// The mock factory is hoisted, so we must define the constant inside it
// to ensure it exists when utils.ts is imported and mocked.
vi.mock("@types", () => {
  const MOCK_CHAT_SUMMARY_STATUS_INTERNAL = {
    PENDING: "pending",
    IN_PROGRESS: "inProgress",
    SUCCESS: "success",
    FAILED: "failed",
    NO_AUDIO: "noAudio",
    UNKNOWN: "unknown",
  } as const;

  return {
    ChatSummaryStatus: MOCK_CHAT_SUMMARY_STATUS_INTERNAL,
  };
});

// Mock the ErrorIcon from @assets, as it is used in the getStatusConfig utility.
// The MockErrorIcon definition must be inside the factory to avoid hoisting issues.
vi.mock("@assets", () => {
  const MockErrorIcon: FC = () => <svg data-testid="mock-error-icon" />;
  return {
    ErrorIcon: MockErrorIcon,
  };
});

// We redefine the constant here for local type definition and test access.
const MOCK_CHAT_SUMMARY_STATUS = {
  PENDING: "pending",
  IN_PROGRESS: "inProgress",
  SUCCESS: "success",
  FAILED: "failed",
  NO_AUDIO: "noAudio",
  UNKNOWN: "unknown",
} as const;

// We also redefine the MockErrorIcon here for local test access.
const MockErrorIcon: FC = () => <svg data-testid="mock-error-icon" />;

type SummaryStatus = (typeof MOCK_CHAT_SUMMARY_STATUS)[keyof typeof MOCK_CHAT_SUMMARY_STATUS];

interface SummaryStatusProps {
  status: SummaryStatus;
  className?: string;
}

interface StatusConfig {
  label: string;
  outerDivClassName: string;
  dotClassName?: string;
  icon?: FC;
}

const mockGetStatusConfig = vi.fn<(status: SummaryStatus) => StatusConfig>();

vi.mock("./utils", () => ({
  getStatusConfig: mockGetStatusConfig,
}));

const mockNoAudioConfig: StatusConfig = {
  label: "No audio detected",
  outerDivClassName: "some-icon-bg",
  icon: MockErrorIcon, // Use the actual mocked icon reference
};

const mockSuccessConfig: StatusConfig = {
  label: "Generated",
  outerDivClassName: "bg-[#DCEBDD]",
  dotClassName: "bg-[#47B881]",
};

// Moving the component import into the describe block guarantees it loads after all mocks are set.
import SummaryStatusChip from "../SummaryStatusChip";

describe("SummaryStatusChip", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the chip with an icon when config provides one ('noAudio' case)", () => {
    const status = MOCK_CHAT_SUMMARY_STATUS.NO_AUDIO;
    mockGetStatusConfig.mockReturnValue(mockNoAudioConfig);
    render(<SummaryStatusChip status={status as any} />);

    expect(screen.getByText("No audio detected")).toBeInTheDocument();

    // Now checking for the mocked ErrorIcon
    expect(screen.getByTestId("mock-error-icon")).toBeInTheDocument();
  });

  it("renders the chip with a dot when config does not provide an icon ('success' case)", () => {
    const status = MOCK_CHAT_SUMMARY_STATUS.SUCCESS;
    mockGetStatusConfig.mockReturnValue(mockSuccessConfig);
    const { container } = render(<SummaryStatusChip status={status as any} />);

    expect(screen.getByText("Generated")).toBeInTheDocument();

    // Fix for invalid selector: Query the specific dot element using its class.
    // CSS selectors (querySelector) for arbitrary Tailwind values must escape non-standard characters,
    // so we will query the whole container and look for the specific class.
    const dotElement = container.querySelector(`[class*='bg-[#47B881]']`);
    expect(dotElement).toBeInTheDocument();
    expect(dotElement).toHaveClass("bg-[#47B881]");
    expect(screen.queryByTestId("mock-error-icon")).not.toBeInTheDocument();
  });

  it("applies the outerDivClassName and custom className correctly", () => {
    const customClass = "shadow-lg-custom";
    const status = MOCK_CHAT_SUMMARY_STATUS.SUCCESS;
    mockGetStatusConfig.mockReturnValue(mockSuccessConfig);
    render(<SummaryStatusChip status={status as any} className={customClass} />);

    const chipContainer = screen.getByText("Generated").closest("div");

    expect(chipContainer).toHaveClass("bg-[#DCEBDD]");
    expect(chipContainer).toHaveClass(customClass);
  });

  it("applies default empty className when none is provided", () => {
    const status = MOCK_CHAT_SUMMARY_STATUS.SUCCESS;
    mockGetStatusConfig.mockReturnValue(mockSuccessConfig);
    const { container } = render(<SummaryStatusChip status={status as any} />);

    const chipContainer = container.firstChild;

    expect(chipContainer).toHaveClass("bg-[#DCEBDD]");
    expect(chipContainer).not.toHaveClass("undefined");
  });
});
