import { render, screen, fireEvent } from "@testing-library/react";
import { FormProvider, useForm } from "react-hook-form";
import { describe, expect, it, vi } from "vitest";

import { TrackFormValues, TrackGameKey, TrackItemType } from "@types";
import { BreathingExerciseEditor } from "../BreathingExerciseEditor";

vi.mock("../ItemEditorFrame", () => ({
  ItemEditorFrame: ({ children }: any) => <div data-testid="item-editor-frame">{children}</div>,
}));

vi.mock("@assets", () => ({
  TooltipIcon: () => <span data-testid="tooltip-icon" />,
  Trash: () => <span data-testid="trash-icon" />,
}));

vi.mock("@ally-ui-mono/ui-shared", () => ({
  NumberInput: ({ label, value, onChange, id }: any) => (
    <div>
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        type="number"
        value={value}
        onChange={(e) => onChange(null, { value: Number(e.target.value) })}
      />
    </div>
  ),
  TextInput: ({ labelText, value, onChange, id }: any) => (
    <div>
      <label htmlFor={id}>{labelText}</label>
      <input
        id={id}
        type="text"
        value={value}
        onChange={(e) => onChange(e)}
      />
    </div>
  ),
  Tooltip: ({ children }: any) => <div>{children}</div>,
  Stack: ({ children }: any) => <div>{children}</div>,
}));

const Harness = ({ defaultValues }: { defaultValues: any }) => {
  const methods = useForm<TrackFormValues>({ defaultValues });
  return (
    <FormProvider {...methods}>
      <BreathingExerciseEditor sectionIndex={0} itemIndex={0} onDelete={vi.fn()} />
    </FormProvider>
  );
};

describe("BreathingExerciseEditor", () => {
  const defaultBreathingExercise = {
    inhale: 4,
    holdIn: 4,
    exhale: 4,
    holdOut: 4,
    cycles: 4,
    inhaleText: "Inhale",
    holdInText: "Hold",
    exhaleText: "Exhale",
    holdOutText: "Hold",
  };

  const defaultValues = {
    sections: [
      {
        localId: "s1",
        items: [
          {
            localId: "i1",
            type: TrackItemType.GAME,
            title: "Breathing",
            game: {
              gameKey: TrackGameKey.BREATHING_EXERCISE,
              breathingExercise: defaultBreathingExercise,
            },
          },
        ],
      },
    ],
  };

  it("renders all configuration inputs with default values", () => {
    render(<Harness defaultValues={defaultValues} />);

    expect(screen.getByLabelText(/Inhale \(seconds\)/)).toHaveValue(4);
    expect(screen.getByLabelText(/Hold after inhale \(seconds\)/)).toHaveValue(4);
    expect(screen.getByLabelText(/Exhale \(seconds\)/)).toHaveValue(4);
    expect(screen.getByLabelText(/Hold after exhale \(seconds\)/)).toHaveValue(4);
    expect(screen.getByLabelText(/Total cycles/)).toHaveValue(4);

    expect(screen.getByLabelText(/Inhale prompt/)).toHaveValue("Inhale");
    expect(screen.getByLabelText(/Hold \(in\) prompt/)).toHaveValue("Hold");
    expect(screen.getByLabelText(/Exhale prompt/)).toHaveValue("Exhale");
    expect(screen.getByLabelText(/Hold \(out\) prompt/)).toHaveValue("Hold");
  });

  it("updates form state when inputs change", () => {
    render(<Harness defaultValues={defaultValues} />);

    const inhaleInput = screen.getByLabelText(/Inhale \(seconds\)/);
    fireEvent.change(inhaleInput, { target: { value: "5" } });
    expect(inhaleInput).toHaveValue(5);

    const inhaleTextInput = screen.getByLabelText(/Inhale prompt/);
    fireEvent.change(inhaleTextInput, { target: { value: "Breathe in" } });
    expect(inhaleTextInput).toHaveValue("Breathe in");
  });
});
