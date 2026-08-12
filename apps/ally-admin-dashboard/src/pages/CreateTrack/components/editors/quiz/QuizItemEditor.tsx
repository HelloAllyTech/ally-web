import { FC, useState } from "react";

import { Controller, useFieldArray, useFormContext, useWatch } from "react-hook-form";

import { TextArea, Tooltip } from "@ally-ui-mono/ui-shared";
import { Plus, TooltipIcon, Trash } from "@assets";
import { QUIZ_QUESTION_TYPE_LABELS } from "@constants";
import { QuizQuestion, QuizQuestionType, TrackFormValues, TrackItemType } from "@types";

import { createQuestionOfType } from "../../../trackFormUtils";
import { ItemEditorFrame } from "../ItemEditorFrame";
import { FillBlankEditor } from "./FillBlankEditor";
import { MatchingEditor } from "./MatchingEditor";
import { McqEditor } from "./McqEditor";
import { OpenEndedEditor } from "./OpenEndedEditor";
import { OrderingEditor } from "./OrderingEditor";
import { QuizSettingsFields } from "./QuizSettingsFields";
import { TrueFalseEditor } from "./TrueFalseEditor";

interface QuizItemEditorProps {
  sectionIndex: number;
  itemIndex: number;
  onDelete: () => void;
}

type QuestionPath = `sections.${number}.items.${number}.quiz.questions.${number}`;

const QUESTION_TYPE_ORDER: QuizQuestionType[] = [
  "mcq_single",
  "mcq_multi",
  "true_false",
  "ordering",
  "matching",
  "fill_blank",
  "open_ended",
];

const renderTypeBody = (type: QuizQuestionType, questionPath: QuestionPath) => {
  switch (type) {
    case "mcq_single":
      return <McqEditor questionPath={questionPath} multi={false} />;
    case "mcq_multi":
      return <McqEditor questionPath={questionPath} multi />;
    case "true_false":
      return <TrueFalseEditor questionPath={questionPath} />;
    case "ordering":
      return <OrderingEditor questionPath={questionPath} />;
    case "matching":
      return <MatchingEditor questionPath={questionPath} />;
    case "fill_blank":
      return <FillBlankEditor questionPath={questionPath} />;
    case "open_ended":
      return <OpenEndedEditor questionPath={questionPath} />;
    default:
      return null;
  }
};

export const QuizItemEditor: FC<QuizItemEditorProps> = ({ sectionIndex, itemIndex, onDelete }) => {
  const { control } = useFormContext<TrackFormValues>();
  const base = `sections.${sectionIndex}.items.${itemIndex}` as const;
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const { fields, append, remove } = useFieldArray({
    control,
    name: `${base}.quiz.questions`,
    keyName: "fieldId",
  });

  const questions = (useWatch({ control, name: `${base}.quiz.questions` }) ?? []) as QuizQuestion[];

  const addQuestion = (type: QuizQuestionType) => {
    append(createQuestionOfType(type));
    setActiveIndex(fields.length);
    setShowAddMenu(false);
  };

  const removeQuestion = (index: number) => {
    remove(index);
    setActiveIndex(prev => Math.max(0, prev >= index ? prev - 1 : prev));
  };

  const activeQuestion = questions[activeIndex];
  const questionPath = `${base}.quiz.questions.${activeIndex}` as QuestionPath;

  return (
    <ItemEditorFrame
      sectionIndex={sectionIndex}
      itemIndex={itemIndex}
      type={TrackItemType.QUIZ}
      onDelete={onDelete}
    >
      <div className="flex flex-col gap-5">
        <div className="grid grid-cols-[220px_1fr] gap-4 min-h-[320px]">
          {/* Question list */}
          <div className="border border-border-light rounded-md p-2 flex flex-col gap-1 overflow-y-auto max-h-[420px]">
            {fields.map((field, index) => {
              const type = questions[index]?.type;
              return (
                <button
                  key={field.fieldId}
                  type="button"
                  onClick={() => setActiveIndex(index)}
                  className={`text-left rounded-md px-2 py-2 text-sm flex items-center justify-between gap-2 ${
                    index === activeIndex
                      ? "bg-primary-50 text-primary-700"
                      : "hover:bg-secondary-50 text-typography-800"
                  }`}
                >
                  <span className="truncate">
                    {index + 1}. {type ? QUIZ_QUESTION_TYPE_LABELS[type] : "Question"}
                  </span>
                  <Trash
                    className="w-3.5 h-3.5 text-destructive-500 flex-shrink-0"
                    onClick={(event: React.MouseEvent) => {
                      event.stopPropagation();
                      removeQuestion(index);
                    }}
                  />
                </button>
              );
            })}

            <div className="relative mt-1">
              <button
                type="button"
                onClick={() => setShowAddMenu(prev => !prev)}
                className="w-full inline-flex items-center justify-center gap-1 border border-dashed border-border-dark rounded-md py-2 text-sm text-typography-600 hover:bg-secondary-50"
              >
                <Plus className="w-4 h-4" />
                Add question
              </button>
              {showAddMenu && (
                <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-border-light rounded-md shadow-lg py-1">
                  {QUESTION_TYPE_ORDER.map(type => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => addQuestion(type)}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-secondary-50 text-typography-800"
                    >
                      {QUIZ_QUESTION_TYPE_LABELS[type]}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Active question editor */}
          <div className="border border-border-light rounded-md p-4">
            {activeQuestion ? (
              <div className="flex flex-col gap-4">
                {activeQuestion.type !== "fill_blank" && (
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium text-typography-800">Question</label>
                    <Controller
                      control={control}
                      name={`${questionPath}.prompt`}
                      render={({ field }) => (
                        <TextArea
                          id={`${questionPath}.prompt`}
                          labelText="Question"
                          hideLabel
                          {...field}
                          value={field.value ?? ""}
                          rows={2}
                          placeholder="Question text"
                          className="w-full"
                        />
                      )}
                    />
                  </div>
                )}

                {renderTypeBody(activeQuestion.type, questionPath)}

                <div className="flex flex-col gap-1.5">
                  <span className="inline-flex items-center gap-1">
                    <label className="text-sm font-medium text-typography-800">
                      Explanation (optional)
                    </label>
                    <Tooltip
                      label="Only shown to learners if enabled under Quiz settings → Show explanations, below."
                      align="top"
                    >
                      <button type="button" className="cursor-pointer inline-flex items-center">
                        <TooltipIcon />
                      </button>
                    </Tooltip>
                  </span>
                  <Controller
                    control={control}
                    name={`${questionPath}.explanation`}
                    render={({ field }) => (
                      <TextArea
                        id={`${questionPath}.explanation`}
                        labelText="Explanation (optional)"
                        hideLabel
                        {...field}
                        value={field.value ?? ""}
                        rows={2}
                        placeholder="Shown after answering, per quiz settings"
                        className="w-full"
                      />
                    )}
                  />
                </div>

                <div className="flex items-center gap-3">
                  <label className="text-sm font-medium text-typography-800">Points</label>
                  <Controller
                    control={control}
                    name={`${questionPath}.points`}
                    render={({ field }) => (
                      <input
                        type="number"
                        min={1}
                        className="w-20 border border-border-light rounded-md px-2 py-1 text-sm outline-none focus:border-primary-400"
                        value={field.value ?? ""}
                        onChange={event =>
                          field.onChange(
                            event.target.value === "" ? undefined : Number(event.target.value),
                          )
                        }
                        onWheel={event => event.currentTarget.blur()}
                      />
                    )}
                  />
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-sm text-typography-500">
                Add a question to get started.
              </div>
            )}
          </div>
        </div>

        <div className="border-t border-border-light pt-4">
          <p className="text-sm font-semibold text-typography-900 mb-2">Quiz settings</p>
          <QuizSettingsFields sectionIndex={sectionIndex} itemIndex={itemIndex} />
        </div>
      </div>
    </ItemEditorFrame>
  );
};
