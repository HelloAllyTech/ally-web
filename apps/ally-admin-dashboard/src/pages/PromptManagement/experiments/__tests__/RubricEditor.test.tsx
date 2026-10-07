import React from "react";

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@ally-ui-mono/ui-shared", async importOriginal => ({
  ...(await importOriginal<Record<string, unknown>>()),
  Tooltip: ({ label, children }: any) => <span aria-label={label}>{children}</span>,
}));
vi.mock("@assets", async importOriginal => ({
  ...(await importOriginal<Record<string, unknown>>()),
  TooltipIcon: () => <span>?</span>,
}));
vi.mock("@components", async importOriginal => ({
  ...(await importOriginal<Record<string, unknown>>()),
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
}));

import { en } from "@constants";

import { criterionKey, RubricEditor, rubricErrors } from "../RubricEditor";

const RUBRIC = [{ key: "tone", name: "Tone", description: "Warm and direct", weight: 2 }];

const setup = (props: Partial<React.ComponentProps<typeof RubricEditor>> = {}) => {
  const onSave = vi.fn();
  render(
    <RubricEditor
      value={RUBRIC}
      canEdit
      saving={false}
      onSave={onSave}
      onDirtyChange={() => {}}
      {...props}
    />,
  );
  return { onSave };
};

describe("criterionKey", () => {
  it("derives the snake_case key the judge answers under", () => {
    expect(criterionKey("Grounded in the transcript!")).toBe("grounded_in_the_transcript");
  });

  it("always starts with a letter, as the backend requires", () => {
    expect(criterionKey("2nd pass")).toBe("c_2nd_pass");
    expect(criterionKey("!!!")).toMatch(/^c_/);
  });
});

describe("rubricErrors", () => {
  it("refuses an empty rubric and blank fields", () => {
    expect(rubricErrors([])).toContain(en.skillExperiments.rubric.errors.empty);
    expect(rubricErrors([{ name: "", description: "x", weight: 1 }])).toContain(
      en.skillExperiments.rubric.errors.nameRequired,
    );
  });

  it("refuses two criteria that would share a key", () => {
    expect(
      rubricErrors([
        { name: "Tone", description: "a", weight: 1 },
        { name: "tone!", description: "b", weight: 1 },
      ]),
    ).toContain(en.skillExperiments.rubric.errors.duplicate);
  });
});

describe("RubricEditor", () => {
  it("saves a new criterion with a derived key, keeping the existing one's key", () => {
    const { onSave } = setup();
    fireEvent.click(screen.getByText(`+ ${en.skillExperiments.rubric.add}`));
    const names = screen.getAllByLabelText(en.skillExperiments.rubric.name);
    const descriptions = screen.getAllByLabelText(en.skillExperiments.rubric.description);
    fireEvent.change(names[0], { target: { value: "Warm tone" } });
    fireEvent.change(names[1], { target: { value: "Accuracy" } });
    fireEvent.change(descriptions[1], { target: { value: "Facts are right" } });

    fireEvent.click(screen.getByText(en.skillExperiments.rubric.save));

    expect(onSave).toHaveBeenCalledWith([
      { key: "tone", name: "Warm tone", description: "Warm and direct", weight: 2 },
      { key: "accuracy", name: "Accuracy", description: "Facts are right", weight: 2 },
    ]);
  });

  it("disables save until something changed", () => {
    setup();
    expect(screen.getByText(en.skillExperiments.rubric.save)).toBeDisabled();
  });

  it("shows why it is read-only while a run is live, with no editing controls", () => {
    setup({ lockedReason: en.skillExperiments.rubric.lockedWhileLive });
    expect(screen.getByText(en.skillExperiments.rubric.lockedWhileLive)).toBeInTheDocument();
    expect(screen.queryByText(en.skillExperiments.rubric.save)).not.toBeInTheDocument();
    expect(screen.getByLabelText(en.skillExperiments.rubric.name)).toBeDisabled();
  });
});
