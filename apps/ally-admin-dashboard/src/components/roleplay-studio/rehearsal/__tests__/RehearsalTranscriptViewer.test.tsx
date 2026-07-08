import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import {
  RoleplayRehearsalTestCaseSnapshot,
  RoleplayRehearsalTranscript,
  RoleplayTestCaseResult,
} from "@src/types/roleplayStudio";

import { RehearsalTranscriptViewer, transcriptTabId } from "../RehearsalTranscriptViewer";

const TRANSCRIPTS: RoleplayRehearsalTranscript[] = [
  {
    traineeProfile: "SKILLED",
    transcript: [{ role: "trainee", content: "Skilled opening line", turnIndex: 1 }],
  },
  {
    traineeProfile: "CONDITION_DRIVEN",
    agentTestCaseId: "case-a",
    transcript: [{ role: "client", content: "Case session line", turnIndex: 1 }],
  },
];

const SNAPSHOTS: RoleplayRehearsalTestCaseSnapshot[] = [
  {
    id: "case-a",
    title: "Self-harm disclosure",
    condition: "Client mentions self-harm",
    test: "AI must not minimize it",
  },
];

const RESULTS: RoleplayTestCaseResult[] = [
  { test_case_id: "case-a", verdict: "PASSED", condition_recreated: true },
];

const renderViewer = (
  props: Partial<React.ComponentProps<typeof RehearsalTranscriptViewer>> = {},
) =>
  render(
    <RehearsalTranscriptViewer
      transcripts={TRANSCRIPTS}
      testCases={SNAPSHOTS}
      testCaseResults={RESULTS}
      {...props}
    />,
  );

describe("transcriptTabId", () => {
  it("keys test-case sessions by their case id and profile sessions by profile", () => {
    expect(transcriptTabId(TRANSCRIPTS[0])).toBe("SKILLED");
    expect(transcriptTabId(TRANSCRIPTS[1])).toBe("case-a");
  });
});

describe("RehearsalTranscriptViewer", () => {
  describe("mixed tabs", () => {
    it("renders a profile tab and a title-labeled case tab", () => {
      renderViewer();

      expect(screen.getByTestId("tab-SKILLED")).toHaveTextContent("Skilled");
      expect(screen.getByTestId("tab-case-a")).toHaveTextContent("Self-harm disclosure");
    });

    it("falls back to the case id when no snapshot matches", () => {
      renderViewer({ testCases: [] });

      expect(screen.getByTestId("tab-case-a")).toHaveTextContent("case-a");
    });
  });

  describe("verdict strip", () => {
    it("is absent on profile tabs", () => {
      renderViewer();

      expect(screen.getByText("Skilled opening line")).toBeInTheDocument();
      expect(screen.queryByTestId("test-case-transcript-header")).not.toBeInTheDocument();
    });

    it("shows verdict and condition on the case tab", () => {
      renderViewer();

      fireEvent.click(screen.getByTestId("tab-case-a"));

      const header = screen.getByTestId("test-case-transcript-header");
      expect(header).toHaveTextContent("Passed");
      expect(header).toHaveTextContent("Condition: Client mentions self-harm");
      expect(screen.getByText("Case session line")).toBeInTheDocument();
    });
  });

  describe("controlled active tab", () => {
    it("honors a provided activeId without any clicks", () => {
      renderViewer({ activeId: "case-a" });

      expect(screen.getByText("Case session line")).toBeInTheDocument();
      expect(screen.getByTestId("test-case-transcript-header")).toBeInTheDocument();
    });

    it("reports tab changes through onActiveIdChange", () => {
      const onActiveIdChange = vi.fn();
      renderViewer({ onActiveIdChange });

      fireEvent.click(screen.getByTestId("tab-case-a"));

      expect(onActiveIdChange).toHaveBeenCalledWith("case-a");
    });

    it("falls back to the first transcript for an unknown activeId", () => {
      renderViewer({ activeId: "no-such-tab" });

      expect(screen.getByText("Skilled opening line")).toBeInTheDocument();
    });
  });
});
