import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { SummaryFieldKey } from "@types";

import SummaryFieldInput from "../SummaryFieldInput";
import { FieldType, SummaryField, SummarySectionKey } from "../../types";

describe("SummaryFieldInput", () => {
  const multilineField: SummaryField = {
    isEditable: true,
    key: SummaryFieldKey.ObjectiveObservations,
    label: "Objective Observations",
    sectionKey: SummarySectionKey.ObjectiveObservations,
    type: FieldType.Multiline,
  };

  // Regression for the /scribe-logs dead-click cluster: read-only narrative
  // sections ("Objective Observations", "Plans for Next Call") were rendered
  // as a fully interactive-looking text box (bordered, focusable, blinking
  // cursor) even though typing into it did nothing, so supervisors reviewing
  // a session they can't edit kept clicking into it expecting a response.
  it("renders a disabled Multiline field as plain read-only text, not an editable-looking textbox", () => {
    render(
      <SummaryFieldInput
        field={multilineField}
        value="Client reported feeling calmer by the end of the call."
        disabled
        onChange={vi.fn()}
      />,
    );

    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(
      screen.getByText("Client reported feeling calmer by the end of the call."),
    ).toBeInTheDocument();
  });

  it("still renders an editable textbox for a Multiline field that is not disabled", () => {
    render(
      <SummaryFieldInput
        field={multilineField}
        value="Draft notes"
        disabled={false}
        onChange={vi.fn()}
      />,
    );

    expect(screen.getByRole("textbox")).toBeInTheDocument();
  });
});
