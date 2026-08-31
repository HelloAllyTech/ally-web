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
        "postSim.debrief.section.what_worked": "What worked",
        "postSim.debrief.section.what_it_cost": "What it cost",
        "postSim.debrief.section.try_next": "Try this next",
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
    render(
      <SupervisorNote note="Right here [[msg:abc-123]] you paused." onOpenMoment={onOpenMoment} />,
    );

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

  it("gives each keyed section its heading, in the learner's language", () => {
    render(
      <SupervisorNote
        note={
          "Sandeep — tough one.\n\n## [what_worked]\nYou left the silence alone." +
          "\n\n## [what_it_cost]\nReassurance closed a door.\n\n## [try_next]\nAsk one more question."
        }
      />,
    );

    expect(screen.getByRole("heading", { name: "What worked" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "What it cost" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Try this next" })).toBeInTheDocument();
  });

  it("never leaks a raw section key to the learner", () => {
    // The keys exist so the heading can be translated by the app rather than by
    // the model. One rendered as text is the same class of bug as a leaked
    // [[msg:...]] marker.
    render(<SupervisorNote note={"## [what_worked]\nYou left the silence alone."} />);

    const rendered = screen.getByTestId("supervisor-note").textContent ?? "";
    expect(rendered).not.toContain("what_worked");
    expect(rendered).not.toContain("[");
    expect(rendered).toContain("You left the silence alone.");
  });

  it("renders the closing without a heading", () => {
    render(
      <SupervisorNote
        note={
          "## [try_next]\nAsk one more question.\n\n## [closing]\nReply and we'll talk it through."
        }
      />,
    );

    expect(screen.getByText("Reply and we'll talk it through.")).toBeInTheDocument();
    expect(screen.getAllByRole("heading")).toHaveLength(1);
  });

  it("drops the closing invitation when there is nothing to reply in", () => {
    // The logs surfaces mount the note read-only. "Reply and we'll talk it
    // through" next to no composer reads as a broken screen.
    render(
      <SupervisorNote
        note={
          "## [try_next]\nAsk one more question.\n\n## [closing]\nReply and we'll talk it through."
        }
        hideClosing
      />,
    );

    expect(screen.getByText("Ask one more question.")).toBeInTheDocument();
    expect(screen.queryByText("Reply and we'll talk it through.")).not.toBeInTheDocument();
  });

  it("keeps a legacy note whole even when hiding the closing", () => {
    // Without markers there is no way to tell the invitation from the rest of
    // the prose, so the note is left exactly as written rather than guessed at.
    render(<SupervisorNote note={"You paused well.\n\nReply any time."} hideClosing />);

    expect(screen.getByText("You paused well.")).toBeInTheDocument();
    expect(screen.getByText("Reply any time.")).toBeInTheDocument();
  });

  it("renders a note written before sections existed with no headings at all", () => {
    render(<SupervisorNote note={"First para.\n\nSecond para."} />);

    expect(screen.queryByRole("heading")).not.toBeInTheDocument();
    expect(screen.getByText("First para.")).toBeInTheDocument();
    expect(screen.getByText("Second para.")).toBeInTheDocument();
  });

  it("keeps moment chips working inside a section", () => {
    const onOpenMoment = vi.fn();
    render(
      <SupervisorNote
        note={"## [what_worked]\nYou asked what evenings were like [[msg:m7]]."}
        onOpenMoment={onOpenMoment}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "See this moment" }));
    expect(onOpenMoment).toHaveBeenCalledWith("m7");
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
  it("never leaves a machine key in the prose when the model wrote it inline", () => {
    render(
      <SupervisorNote note="## [what_it_cost] You suggested solutions early instead of waiting." />,
    );

    const rendered = screen.getByTestId("supervisor-note").textContent ?? "";
    expect(screen.getByText("What it cost")).toBeInTheDocument();
    expect(rendered).not.toContain("[what_it_cost]");
    expect(rendered).not.toContain("##");
    expect(rendered).toContain("You suggested solutions early instead of waiting.");
  });
});
