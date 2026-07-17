import { FC } from "react";

import { Controller, useFormContext } from "react-hook-form";

import { TrackFormValues } from "@types";

interface TrueFalseEditorProps {
  questionPath: `sections.${number}.items.${number}.quiz.questions.${number}`;
}

export const TrueFalseEditor: FC<TrueFalseEditorProps> = ({ questionPath }) => {
  const { control } = useFormContext<TrackFormValues>();
  const name =
    `${questionPath}.correctAnswer` as `sections.0.items.0.quiz.questions.0.correctAnswer`;

  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-typography-800">Correct answer</label>
      <Controller
        control={control}
        name={name}
        render={({ field }) => (
          <div className="flex gap-4">
            {[true, false].map(value => (
              <label
                key={String(value)}
                className="flex items-center gap-2 text-sm text-typography-800"
              >
                <input
                  type="radio"
                  checked={field.value === value}
                  onChange={() => field.onChange(value)}
                  className="cursor-pointer accent-primary-500"
                />
                {value ? "True" : "False"}
              </label>
            ))}
          </div>
        )}
      />
    </div>
  );
};
