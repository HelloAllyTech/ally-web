import { useState } from "react";

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ArtifactLabelPalette } from "../ArtifactLabelPalette";
import { ArtifactLabel, ArtifactMark, ArtifactMarker, ArtifactUnit, markKey } from "../ArtifactMarker";

const units: ArtifactUnit[] = [
  { id: "u1", speaker: "Caller", text: "I don't know why I called." },
  { id: "u2", speaker: "Caller", text: "It's not a big deal." },
  { id: "u3", speaker: "Volunteer", text: "What's been happening?" },
];

const labels: ArtifactLabel[] = [
  { id: "l1", text: "Minimising", color: "amber" },
  { id: "l2", text: "Closed question", color: "teal" },
];

/** Mirrors how the player and the admin editor both drive the widget. */
const Harness = ({ initial = [] as ArtifactMark[] }) => {
  const [marks, setMarks] = useState<ArtifactMark[]>(initial);
  const [armedLabelId, setArmedLabelId] = useState<string | null>(null);

  const toggle = (unitId: string, labelId: string) =>
    setMarks(prev =>
      prev.some(m => m.unitId === unitId && m.labelId === labelId)
        ? prev.filter(m => !(m.unitId === unitId && m.labelId === labelId))
        : [...prev, { unitId, labelId }],
    );

  return (
    <>
      <ArtifactLabelPalette
        labels={labels}
        armedLabelId={armedLabelId}
        onArm={setArmedLabelId}
      />
      <ArtifactMarker
        units={units}
        labels={labels}
        marks={marks}
        armedLabelId={armedLabelId}
        onToggleMark={toggle}
      />
      <output data-testid="marks">{marks.map(m => markKey(m.unitId, m.labelId)).join(",")}</output>
    </>
  );
};

const lineButton = (text: string) =>
  screen.getAllByRole("button").find(button => button.textContent?.includes(text))!;

describe("ArtifactMarker", () => {
  it("does nothing until a label is armed", () => {
    render(<Harness />);
    const line = lineButton("It's not a big deal.");
    expect(line).toBeDisabled();
    fireEvent.click(line);
    expect(screen.getByTestId("marks").textContent).toBe("");
  });

  it("arms a label and marks a line with it", () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole("button", { name: /Minimising/ }));
    fireEvent.click(lineButton("It's not a big deal."));
    expect(screen.getByTestId("marks").textContent).toBe(markKey("u2", "l1"));
  });

  it("stays armed so several lines can be painted in a row", () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole("button", { name: /Minimising/ }));
    fireEvent.click(lineButton("I don't know why I called."));
    fireEvent.click(lineButton("It's not a big deal."));
    expect(screen.getByTestId("marks").textContent).toBe(
      `${markKey("u1", "l1")},${markKey("u2", "l1")}`,
    );
  });

  it("removes a mark when the same armed label is tapped again", () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole("button", { name: /Minimising/ }));
    fireEvent.click(lineButton("It's not a big deal."));
    fireEvent.click(lineButton("It's not a big deal."));
    expect(screen.getByTestId("marks").textContent).toBe("");
  });

  it("removes a mark from its chip", () => {
    render(<Harness initial={[{ unitId: "u2", labelId: "l1" }]} />);
    fireEvent.click(screen.getByRole("button", { name: /Remove Minimising from this line/ }));
    expect(screen.getByTestId("marks").textContent).toBe("");
  });

  it("arms a label from its number key and disarms on Escape", () => {
    render(<Harness />);
    fireEvent.keyDown(window, { key: "2" });
    fireEvent.click(lineButton("What's been happening?"));
    expect(screen.getByTestId("marks").textContent).toBe(markKey("u3", "l2"));

    fireEvent.keyDown(window, { key: "Escape" });
    expect(lineButton("I don't know why I called.")).toBeDisabled();
  });

  it("shows a verdict word alongside every marked line in reveal mode", () => {
    render(
      <ArtifactMarker
        units={units}
        labels={labels}
        marks={[{ unitId: "u3", labelId: "l1" }]}
        verdicts={{
          [markKey("u2", "l1")]: "missed",
          [markKey("u3", "l1")]: "notHere",
        }}
        notes={{ [markKey("u2", "l1")]: "Classic minimising move." }}
      />,
    );
    expect(screen.getByText(/Missed/)).toBeInTheDocument();
    expect(screen.getByText(/Not here/)).toBeInTheDocument();
    expect(screen.getByText("Classic minimising move.")).toBeInTheDocument();
  });

  it("is not clickable in reveal mode", () => {
    const onToggleMark = vi.fn();
    render(
      <ArtifactMarker
        units={units}
        labels={labels}
        marks={[]}
        armedLabelId="l1"
        onToggleMark={onToggleMark}
        verdicts={{ [markKey("u2", "l1")]: "missed" }}
      />,
    );
    expect(screen.queryAllByRole("button")).toHaveLength(0);
    expect(onToggleMark).not.toHaveBeenCalled();
  });
});
