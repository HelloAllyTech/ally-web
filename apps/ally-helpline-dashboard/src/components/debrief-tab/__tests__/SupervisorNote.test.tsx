import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { SupervisorNote } from "../SupervisorNote";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const copy: Record<string, string> = {
        "postSim.debrief.from": "from Ally",
        "postSim.debrief.aiLabel": "AI-generated",
        "postSim.debrief.aiTooltip": "Ally is an AI supervisor.",
        "postSim.debrief.momentLabel": "See this moment",
      };
      return copy[key] ?? key;
    },
  }),
}));

vi.mock("@ally-ui-mono/ui-shared", () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("@assets", () => ({
  AskAiIcon: () => <svg data-testid="ally-avatar" />,
}));

describe("SupervisorNote", () => {
  it("discloses that the note is AI-written", () => {
    render(<SupervisorNote note="Nice work today." />);

    expect(screen.getByText("AI-generated")).toBeInTheDocument();
    expect(screen.getByText("from Ally")).toBeInTheDocument();
  });

  it("never leaks a raw [[msg:...]] marker to the learner", () => {
    render(
      <SupervisorNote
        note="You asked what evenings were like [[msg:42]] and she opened up."
        onOpenMoment={vi.fn()}
      />,
    );

    expect(screen.getByTestId("supervisor-note").textContent).not.toContain("[[msg:");
    expect(screen.getByTestId("supervisor-note").textContent).not.toContain("42");
  });

  it("turns an anchor into a chip carrying its message id", () => {
    const onOpenMoment = vi.fn();
    render(<SupervisorNote note="Right here [[msg:abc-123]] you paused." onOpenMoment={onOpenMoment} />);

    fireEvent.click(screen.getByRole("button", { name: "See this moment" }));

    expect(onOpenMoment).toHaveBeenCalledWith("abc-123");
  });

  it("renders anchors as nothing when there is no transcript to open", () => {
    // The Transcript tab can be switched off per roleplay. A chip that goes
    // nowhere is worse than no chip, and the note is written so each sentence
    // still reads correctly without it.
    render(<SupervisorNote note="Right here [[msg:abc-123]] you paused." />);

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.getByTestId("supervisor-note").textContent).toContain("you paused.");
  });

  it("renders bold and anchors together without swallowing either", () => {
    const onOpenMoment = vi.fn();
    render(
      <SupervisorNote
        note="That was **genuinely good** listening [[msg:7]] right there."
        onOpenMoment={onOpenMoment}
      />,
    );

    expect(screen.getByText("genuinely good").tagName).toBe("STRONG");
    fireEvent.click(screen.getByRole("button", { name: "See this moment" }));
    expect(onOpenMoment).toHaveBeenCalledWith("7");
  });

  it("keeps paragraphs separate", () => {
    const { container } = render(<SupervisorNote note={"First para.\n\nSecond para."} />);

    expect(container.querySelectorAll("p")).toHaveLength(2);
  });

  it("supports more than one anchor in the same note", () => {
    const onOpenMoment = vi.fn();
    render(
      <SupervisorNote
        note="Here [[msg:1]] and again here [[msg:2]]."
        onOpenMoment={onOpenMoment}
      />,
    );

    const chips = screen.getAllByRole("button", { name: "See this moment" });
    expect(chips).toHaveLength(2);
    fireEvent.click(chips[1]);
    expect(onOpenMoment).toHaveBeenCalledWith("2");
  });
});
