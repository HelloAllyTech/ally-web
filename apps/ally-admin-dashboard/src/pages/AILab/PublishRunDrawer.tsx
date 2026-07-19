import React, { useCallback, useEffect, useState } from "react";

import { Delete } from "@icons";
import { toast } from "sonner";

import { Select, SelectItem } from "@ally-ui-mono/ui-shared";
import { usePublishLabRunMutation } from "@api";
import { Button } from "@components";
import { ButtonVariant } from "@components/types";
import { en } from "@constants";
import { LabRun, LabEvalQuestionType, PublishRunQuestionInput } from "@types";

interface PublishRunDrawerProps {
  run: LabRun | null;
  onClose: () => void;
}

interface QuestionDraft {
  question: string;
  type: LabEvalQuestionType;
  scaleMax: number;
}

const NEW_QUESTION: QuestionDraft = { question: "", type: "RATING", scaleMax: 5 };
const SCALE_OPTIONS = [3, 5, 7, 10];

/**
 * Publishing a completed run for human evaluation: the admin attaches the
 * evaluation questions (>= 1) evaluators will answer. Questions freeze at
 * publish time.
 */
export const PublishRunDrawer: React.FC<PublishRunDrawerProps> = ({ run, onClose }) => {
  const [publishRun, { isLoading }] = usePublishLabRunMutation();
  const [questions, setQuestions] = useState<QuestionDraft[]>([{ ...NEW_QUESTION }]);

  useEffect(() => {
    if (run) setQuestions([{ ...NEW_QUESTION }]);
  }, [run]);

  const updateQuestion = useCallback((index: number, patch: Partial<QuestionDraft>) => {
    setQuestions(prev => prev.map((q, i) => (i === index ? { ...q, ...patch } : q)));
  }, []);

  const removeQuestion = useCallback((index: number) => {
    setQuestions(prev => prev.filter((_, i) => i !== index));
  }, []);

  const isValid = questions.length >= 1 && questions.every(q => q.question.trim().length > 0);

  const handlePublish = useCallback(async () => {
    if (!run || !isValid) return;
    const payload: PublishRunQuestionInput[] = questions.map(q => ({
      question: q.question.trim(),
      type: q.type,
      ...(q.type === "RATING" ? { scaleMax: q.scaleMax } : {}),
    }));
    try {
      await publishRun({ runId: run.id, questions: payload }).unwrap();
      toast.success(en.aiLab.publish.published);
      onClose();
    } catch {
      toast.error(en.aiLab.publish.publishFailed);
    }
  }, [run, isValid, questions, publishRun, onClose]);

  if (!run) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black bg-opacity-50" onClick={onClose} />
      <div className="w-[50%] min-w-[720px] bg-white shadow-xl border-l-[1px] border-border-light flex flex-col">
        <div className="p-6">
          <span className="text-base font-tertiary font-[500]">{en.aiLab.publish.drawerTitle}</span>
          <p className="text-sm text-typography-600 mt-1">
            {run.skillName} — {en.aiLab.publish.subtitle}
          </p>
        </div>

        <div className="flex-1 min-h-0 px-10 pt-2 overflow-y-auto custom-scrollbar space-y-4 pb-4">
          {questions.map((question, index) => (
            <div
              key={index}
              className="border border-border-light rounded-md p-4 space-y-3 bg-background-secondary/30"
            >
              <div className="flex items-start justify-between gap-3">
                <label className="text-sm font-medium text-typography-900">
                  {en.aiLab.publish.questionLabel} {index + 1}
                  <span className="text-destructive-500 ml-1">*</span>
                </label>
                {questions.length > 1 && (
                  <button
                    onClick={() => removeQuestion(index)}
                    className="text-typography-500 hover:text-destructive-600"
                    aria-label={en.aiLab.publish.remove}
                    title={en.aiLab.publish.remove}
                  >
                    <Delete size={16} />
                  </button>
                )}
              </div>
              <input
                type="text"
                value={question.question}
                onChange={e => updateQuestion(index, { question: e.target.value })}
                placeholder={en.aiLab.publish.questionPlaceholder}
                className="border border-border-light rounded-md px-3 py-2 w-full outline-none text-base bg-white"
              />
              <div className="flex gap-4">
                <div className="flex flex-col gap-1 flex-1">
                  <label className="text-xs text-typography-500">
                    {en.aiLab.publish.typeLabel}
                  </label>
                  <Select
                    id={`publish-question-type-${index}`}
                    labelText={en.aiLab.publish.typeLabel}
                    hideLabel
                    value={question.type}
                    onChange={e =>
                      updateQuestion(index, { type: e.target.value as LabEvalQuestionType })
                    }
                  >
                    <SelectItem value="RATING" text={en.aiLab.publish.typeRating} />
                    <SelectItem value="YES_NO" text={en.aiLab.publish.typeYesNo} />
                    <SelectItem value="TEXT" text={en.aiLab.publish.typeText} />
                  </Select>
                </div>
                {question.type === "RATING" && (
                  <div className="flex flex-col gap-1 w-[160px]">
                    <label className="text-xs text-typography-500">
                      {en.aiLab.publish.scaleLabel}
                    </label>
                    <Select
                      id={`publish-question-scale-${index}`}
                      labelText={en.aiLab.publish.scaleLabel}
                      hideLabel
                      value={question.scaleMax}
                      onChange={e => updateQuestion(index, { scaleMax: Number(e.target.value) })}
                    >
                      {SCALE_OPTIONS.map(max => (
                        <SelectItem
                          key={max}
                          value={max}
                          text={en.aiLab.publish.scaleOption(max)}
                        />
                      ))}
                    </Select>
                  </div>
                )}
              </div>
            </div>
          ))}

          <button
            onClick={() => setQuestions(prev => [...prev, { ...NEW_QUESTION }])}
            className="text-primary-600 hover:underline text-sm font-medium"
          >
            + {en.aiLab.publish.addQuestion}
          </button>
        </div>

        <div className="border-t border-border-light px-10 py-4 flex gap-3 justify-end">
          <Button variant={ButtonVariant.SECONDARY} onClick={onClose} disabled={isLoading}>
            {en.common.cancel}
          </Button>
          <Button
            variant={ButtonVariant.PRIMARY}
            onClick={handlePublish}
            disabled={!isValid || isLoading}
            title={!isValid ? en.aiLab.publish.validation : undefined}
          >
            {en.aiLab.publish.publishButton}
          </Button>
        </div>
      </div>
    </div>
  );
};
