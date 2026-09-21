import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ReplyBubble } from "../ReplyBubble";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const copy: Record<string, string> = {
        "postSim.debrief.transcriptReferences": "Transcript References",
        "postSim.debrief.momentLabel": "See this moment",
        "transcription.aiClientSuffix": "AI Client",
        "transcription.youLabel": "You",
      };
      return copy[key] ?? key;
    },
  }),
}));

vi.mock("@ally-ui-mono/ui-shared", () => ({
  Table: ({ children }: any) => <table>{children}</table>,
  TableBody: ({ children }: any) => <tbody>{children}</tbody>,
  TableRow: ({ children }: any) => <tr>{children}</tr>,
  TableCell: ({ children }: any) => <td>{children}</td>,
}));

vi.mock("@assets", () => ({
  AskAiIcon: () => <svg data-testid="ally-avatar" />,
}));

const citation = (over: Partial<Record<string, unknown>> = {}) =>
  ({
    timestamp: "4:12",
    content: "What are evenings like for you?",
    senderId: 7,
    transcriptId: 91,
    ...over,
  }) as any;

describe("ReplyBubble", () => {
  it("renders the learner's own reply without Ally's avatar", () => {
    render(<ReplyBubble role="user" content="Why was that a miss?" />);

    expect(screen.getByText("Why was that a miss?")).toBeInTheDocument();
    expect(screen.queryByTestId("ally-avatar")).not.toBeInTheDocument();
  });

  it("renders inline **bold** as emphasis rather than literal asterisks", () => {
    render(<ReplyBubble role="assistant" content="You used a **closed question** there." />);

    expect(screen.getByText("closed question").tagName).toBe("STRONG");
    expect(screen.queryByText(/\*\*/)).not.toBeInTheDocument();
  });

  describe("transcript citations", () => {
    it("lists the cited transcript lines under the reply", () => {
      // The regression this locks in: the backend resolves timestamps into
      // citations and the UI used to drop them on the floor, so the learner
      // saw a bare "[4:12]" and no way to check the claim.
      render(
        <ReplyBubble
          role="assistant"
          content="At [4:12] you moved on quickly."
          citations={[citation()]}
          counsellorName="Asha"
        />,
      );

      expect(screen.getByText("Transcript References")).toBeInTheDocument();
      expect(screen.getByText("What are evenings like for you?")).toBeInTheDocument();
      expect(screen.getByText("4:12")).toBeInTheDocument();
    });

    it("attributes a cited line to the learner or to the simulated client", () => {
      render(
        <ReplyBubble
          role="assistant"
          content="Compare [4:12] with [5:03]."
          citations={[
            citation(),
            // -1 is how the backend marks the simulated client.
            citation({
              timestamp: "5:03",
              senderId: -1,
              transcriptId: 92,
              content: "I sleep badly.",
            }),
          ]}
          counsellorName="Asha"
          agentName="Meera"
        />,
      );

      expect(screen.getByText("Asha:")).toBeInTheDocument();
      expect(screen.getByText("Meera (AI Client):")).toBeInTheDocument();
    });

    it("falls back to a generic label when the learner's name is unknown", () => {
      render(
        <ReplyBubble role="assistant" content="At [4:12] you paused." citations={[citation()]} />,
      );

      expect(screen.getByText("You:")).toBeInTheDocument();
    });

    it("opens the cited moment in the transcript when the timestamp is clicked", () => {
      const onOpenMoment = vi.fn();
      render(
        <ReplyBubble
          role="assistant"
          content="At [4:12] you moved on quickly."
          citations={[citation()]}
          onOpenMoment={onOpenMoment}
        />,
      );

      fireEvent.click(screen.getByRole("button", { name: "See this moment" }));

      // The transcript focuses by message id, and a citation carries the
      // transcript row it resolved to.
      expect(onOpenMoment).toHaveBeenCalledWith("91");
    });

    it("leaves a timestamp as plain text when there is no transcript tab to open", () => {
      // Mirrors SupervisorNote: a chip that goes nowhere is worse than prose.
      render(
        <ReplyBubble
          role="assistant"
          content="At [4:12] you moved on quickly."
          citations={[citation()]}
        />,
      );

      expect(screen.queryByRole("button", { name: "See this moment" })).not.toBeInTheDocument();
      // Still shown, twice: inline in the sentence and in the references row.
      expect(screen.getAllByText(/4:12/)).toHaveLength(2);
    });

    it("leaves an unresolved timestamp as plain text even when other citations exist", () => {
      // Ally is told never to invent a timestamp, but a translated transcript
      // that dropped a turn can leave one unresolvable. It must not become a
      // chip that jumps nowhere.
      const onOpenMoment = vi.fn();
      render(
        <ReplyBubble
          role="assistant"
          content="At [4:12] you paused, and at [9:99] you recovered."
          citations={[citation()]}
          onOpenMoment={onOpenMoment}
        />,
      );

      expect(screen.getAllByRole("button", { name: "See this moment" })).toHaveLength(1);
      expect(screen.getByText(/9:99/)).toBeInTheDocument();
    });

    it("renders no references block when the reply cites nothing", () => {
      render(<ReplyBubble role="assistant" content="Good session overall." />);

      expect(screen.queryByText("Transcript References")).not.toBeInTheDocument();
    });
  });
});
