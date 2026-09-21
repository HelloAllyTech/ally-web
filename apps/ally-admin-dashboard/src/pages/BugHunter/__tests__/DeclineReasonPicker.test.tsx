import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@ally-ui-mono/ui-shared", () => ({
  TextArea: ({ id, labelText, value, onChange, invalid, invalidText }: any) => (
    <label htmlFor={id}>
      {labelText}
      <textarea id={id} value={value} onChange={onChange} />
      {invalid && <span role="alert">{invalidText}</span>}
    </label>
  ),
}));

vi.mock("@components", () => ({ cellTypes: {} }));

import { BUG_FINDING_DECISION_NOTE_MAX_LENGTH, BugFindingDecisionReason } from "@types";

import { canSubmitDecline, DeclineReasonPicker } from "../DeclineReasonPicker";

const mount = (
  over: Partial<React.ComponentProps<typeof DeclineReasonPicker>> = {},
) => {
  const onReasonChange = vi.fn();
  const onNoteChange = vi.fn();
  render(
    <DeclineReasonPicker
      idPrefix="t"
      reason={null}
      onReasonChange={onReasonChange}
      note=""
      onNoteChange={onNoteChange}
      {...over}
    />,
  );
  return { onReasonChange, onNoteChange };
};

describe("DeclineReasonPicker", () => {
  it("offers every reason, with the likeliest answer first", () => {
    // The order is a product decision: the whole point of a radio list over a
    // dropdown is that the usual answer is the first thing under the cursor.
    mount();

    const radios = screen.getAllByRole("radio");
    expect(radios).toHaveLength(6);
    expect(radios[0]).toHaveAccessibleName("It isn't a bug");
  });

  it("says what the answer is actually for", () => {
    // A field that reads as bookkeeping gets whichever option is nearest the
    // cursor. This copy is what stops that.
    mount();

    expect(screen.getByText(/I read these back before my next sweep/)).toBeInTheDocument();
  });

  it("explains which reasons count against the agent and which do not", () => {
    mount();

    expect(screen.getByText("I misread the code. Tell me and I won't file it again.")).toBeInTheDocument();
    expect(
      screen.getByText(/I got this right — it just isn't worth the change/),
    ).toBeInTheDocument();
  });

  it("reports the reason the reader picked", () => {
    const { onReasonChange } = mount();

    fireEvent.click(screen.getByLabelText("Already tracked elsewhere"));

    expect(onReasonChange).toHaveBeenCalledWith(BugFindingDecisionReason.DUPLICATE);
  });

  it("says the one reason covers the whole batch when declining several", () => {
    mount({ count: 14 });

    expect(screen.getByText(/The same reason goes on all 14\./)).toBeInTheDocument();
  });

  it("keeps the batch wording off a single decline", () => {
    mount({ count: 1 });

    expect(screen.queryByText(/The same reason goes on all/)).not.toBeInTheDocument();
  });

  it("flags an over-long note rather than letting the request fail", () => {
    mount({ note: "x".repeat(BUG_FINDING_DECISION_NOTE_MAX_LENGTH + 1) });

    expect(screen.getByRole("alert")).toBeInTheDocument();
  });
});

describe("canSubmitDecline", () => {
  it("refuses a decline with no reason", () => {
    // The rule every one of the four decline surfaces gates on. Shared so
    // that one of them cannot disagree about it.
    expect(canSubmitDecline(null, "")).toBe(false);
  });

  it("allows a reason with no note — the note is optional on purpose", () => {
    // Making the note mandatory would push people towards whichever reason
    // needs least typing, which corrupts the field that is actually counted.
    expect(canSubmitDecline(BugFindingDecisionReason.NOT_A_BUG, "")).toBe(true);
  });

  it("refuses a note longer than the column can hold", () => {
    expect(
      canSubmitDecline(
        BugFindingDecisionReason.OTHER,
        "x".repeat(BUG_FINDING_DECISION_NOTE_MAX_LENGTH + 1),
      ),
    ).toBe(false);
  });

  it("allows a note exactly at the cap", () => {
    expect(
      canSubmitDecline(
        BugFindingDecisionReason.OTHER,
        "x".repeat(BUG_FINDING_DECISION_NOTE_MAX_LENGTH),
      ),
    ).toBe(true);
  });
});
