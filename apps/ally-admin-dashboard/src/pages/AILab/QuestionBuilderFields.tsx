import React, { useCallback, useState } from "react";

import { Delete } from "@icons";
import { toast } from "sonner";

import { Select, SelectItem } from "@ally-ui-mono/ui-shared";
import { useGetQuestionSetsQuery, useLazyGetQuestionSetQuery } from "@api";
import { Button } from "@components";
import { ButtonVariant } from "@components/types";
import { en } from "@constants";
import { LabEvalQuestionType } from "@types";

export interface QuestionDraft {
  question: string;
  type: LabEvalQuestionType;
  scaleMax: number;
  /** Set when this row was imported from a Question Set (traceability only). */
  sourceQuestionSetId?: string;
}

export const NEW_QUESTION: QuestionDraft = { question: "", type: "RATING", scaleMax: 5 };
const SCALE_OPTIONS = [3, 5, 7, 10];

interface QuestionBuilderFieldsProps {
  questions: QuestionDraft[];
  onChange: (next: QuestionDraft[]) => void;
}

/**
 * Shared question-list builder used by both the single-run PublishRunDrawer
 * and the multi-run BulkPublishDrawer: an "import from a question set"
 * control (imported questions stay fully editable/removable) plus per-question
 * text/type/scale cards and an add-question action.
 */
export const QuestionBuilderFields: React.FC<QuestionBuilderFieldsProps> = ({
  questions,
  onChange,
}) => {
  // Published, non-archived question sets — importable into this draft.
  const { data: setsData } = useGetQuestionSetsQuery({
    publishedOnly: true,
    includeArchived: false,
  });
  const importableSets = setsData?.items ?? [];
  const [selectedSetId, setSelectedSetId] = useState("");
  const [fetchSet, { isFetching: isImporting }] = useLazyGetQuestionSetQuery();

  const handleImport = useCallback(async () => {
    if (!selectedSetId) return;
    try {
      const set = await fetchSet(selectedSetId).unwrap();
      const imported: QuestionDraft[] = (set.questions ?? []).map(q => ({
        question: q.question,
        type: q.type,
        scaleMax: q.scaleMax ?? 5,
        sourceQuestionSetId: set.id,
      }));
      const isPristineDefault =
        questions.length === 1 && !questions[0].question.trim() && !questions[0].sourceQuestionSetId;
      onChange(isPristineDefault ? imported : [...questions, ...imported]);
      toast.success(en.aiLab.questionSets.importedNote);
    } catch {
      toast.error(en.aiLab.questionSets.saveFailed);
    }
  }, [selectedSetId, fetchSet, questions, onChange]);

  const updateQuestion = useCallback(
    (index: number, patch: Partial<QuestionDraft>) => {
      onChange(questions.map((q, i) => (i === index ? { ...q, ...patch } : q)));
    },
    [questions, onChange],
  );

  const removeQuestion = useCallback(
    (index: number) => {
      onChange(questions.filter((_, i) => i !== index));
    },
    [questions, onChange],
  );

  return (
    <>
      <div className="border border-border-light rounded-md p-4 bg-background-secondary/30">
        <label className="text-sm font-medium text-typography-900">
          {en.aiLab.questionSets.importLabel}
        </label>
        {importableSets.length === 0 ? (
          <p className="text-sm text-typography-500 mt-2">{en.aiLab.questionSets.noSets}</p>
        ) : (
          <div className="flex gap-3 mt-2 items-end">
            <div className="flex-1">
              <Select
                id="question-builder-import-set"
                labelText={en.aiLab.questionSets.importLabel}
                hideLabel
                value={selectedSetId}
                onChange={e => setSelectedSetId(e.target.value)}
              >
                <SelectItem value="" text={en.aiLab.questionSets.importPlaceholder} />
                {importableSets.map(set => (
                  <SelectItem
                    key={set.id}
                    value={set.id}
                    text={`${set.name} (${en.aiLab.questionSets.questionCount(set.questionCount)})`}
                  />
                ))}
              </Select>
            </div>
            <Button
              variant={ButtonVariant.SECONDARY}
              onClick={handleImport}
              disabled={!selectedSetId || isImporting}
            >
              {en.aiLab.questionSets.importAction}
            </Button>
          </div>
        )}
      </div>

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
              <label className="text-xs text-typography-500">{en.aiLab.publish.typeLabel}</label>
              <Select
                id={`question-builder-type-${index}`}
                labelText={en.aiLab.publish.typeLabel}
                hideLabel
                value={question.type}
                onChange={e => updateQuestion(index, { type: e.target.value as LabEvalQuestionType })}
              >
                <SelectItem value="RATING" text={en.aiLab.publish.typeRating} />
                <SelectItem value="YES_NO" text={en.aiLab.publish.typeYesNo} />
                <SelectItem value="TEXT" text={en.aiLab.publish.typeText} />
                <SelectItem value="DESCRIPTION" text={en.aiLab.publish.typeDescription} />
              </Select>
            </div>
            {question.type === "RATING" && (
              <div className="flex flex-col gap-1 w-[160px]">
                <label className="text-xs text-typography-500">{en.aiLab.publish.scaleLabel}</label>
                <Select
                  id={`question-builder-scale-${index}`}
                  labelText={en.aiLab.publish.scaleLabel}
                  hideLabel
                  value={question.scaleMax}
                  onChange={e => updateQuestion(index, { scaleMax: Number(e.target.value) })}
                >
                  {SCALE_OPTIONS.map(max => (
                    <SelectItem key={max} value={max} text={en.aiLab.publish.scaleOption(max)} />
                  ))}
                </Select>
              </div>
            )}
          </div>
        </div>
      ))}

      <button
        onClick={() => onChange([...questions, { ...NEW_QUESTION }])}
        className="text-primary-600 hover:underline text-sm font-medium"
      >
        + {en.aiLab.publish.addQuestion}
      </button>
    </>
  );
};
