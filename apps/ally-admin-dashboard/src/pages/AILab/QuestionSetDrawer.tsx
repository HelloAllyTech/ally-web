import React, { useCallback, useEffect, useRef, useState } from "react";

import { ArrowDown, ArrowUp, Delete } from "@icons";
import { toast } from "sonner";

import { Select, SelectItem } from "@ally-ui-mono/ui-shared";
import {
  useGetQuestionSetQuery,
  useCreateQuestionSetMutation,
  useUpdateQuestionSetMutation,
  usePublishQuestionSetMutation,
} from "@api";
import { ActionConfirmationPopup, Button } from "@components";
import { ButtonVariant } from "@components/types";
import { en } from "@constants";
import { LabEvalQuestionType, QuestionSet, QuestionSetQuestionInput } from "@types";

interface QuestionSetDrawerProps {
  isOpen: boolean;
  /** The row that was clicked; null when creating a brand new set. */
  questionSet: QuestionSet | null;
  onClose: () => void;
}

interface QuestionDraft {
  question: string;
  type: LabEvalQuestionType;
  scaleMax: number;
}

const NEW_QUESTION: QuestionDraft = { question: "", type: "RATING", scaleMax: 5 };
const SCALE_OPTIONS = [3, 5, 7, 10];

const toDraft = (q: { question: string; type: LabEvalQuestionType; scaleMax?: number }) => ({
  question: q.question,
  type: q.type,
  scaleMax: q.scaleMax ?? 5,
});

/**
 * Create/edit a draft question set, or view a locked (published) one. A set
 * without an id yet only offers "Save Draft"; once it has an id, "Publish"
 * appears too (Publish first saves any pending edits, then locks the set).
 */
export const QuestionSetDrawer: React.FC<QuestionSetDrawerProps> = ({
  isOpen,
  questionSet,
  onClose,
}) => {
  const [currentId, setCurrentId] = useState<string | null>(null);
  const { data: detail } = useGetQuestionSetQuery(currentId ?? "", { skip: !currentId });

  const [createSet, { isLoading: isCreating }] = useCreateQuestionSetMutation();
  const [updateSet, { isLoading: isUpdating }] = useUpdateQuestionSetMutation();
  const [publishSet, { isLoading: isPublishing }] = usePublishQuestionSetMutation();
  const isSaving = isCreating || isUpdating || isPublishing;

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [questions, setQuestions] = useState<QuestionDraft[]>([]);
  const [showPublishConfirm, setShowPublishConfirm] = useState(false);

  const seededRef = useRef<string | null>(null);

  // Reset (or seed for a brand new set) whenever the drawer opens for a
  // different target than it last showed.
  useEffect(() => {
    if (!isOpen) {
      seededRef.current = null;
      return;
    }
    if (!questionSet) {
      if (seededRef.current !== "new") {
        setCurrentId(null);
        setName("");
        setDescription("");
        setQuestions([{ ...NEW_QUESTION }]);
        seededRef.current = "new";
      }
      return;
    }
    setCurrentId(questionSet.id);
  }, [isOpen, questionSet]);

  // Seed the form from the fetched detail once per record (not on every
  // background refetch, so it doesn't clobber in-progress edits).
  useEffect(() => {
    if (!isOpen || !detail || seededRef.current === detail.id) return;
    setName(detail.name);
    setDescription(detail.description ?? "");
    setQuestions((detail.questions ?? []).map(toDraft));
    seededRef.current = detail.id;
  }, [isOpen, detail]);

  const isReadOnly = detail?.isPublished === true;

  const updateQuestion = useCallback((index: number, patch: Partial<QuestionDraft>) => {
    setQuestions(prev => prev.map((q, i) => (i === index ? { ...q, ...patch } : q)));
  }, []);

  const removeQuestion = useCallback((index: number) => {
    setQuestions(prev => prev.filter((_, i) => i !== index));
  }, []);

  const moveQuestion = useCallback((index: number, direction: -1 | 1) => {
    setQuestions(prev => {
      const target = index + direction;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }, []);

  const nameValid = name.trim().length > 0;
  const questionsValid = questions.every(q => q.question.trim().length > 0);
  const saveDraftValid = nameValid && questionsValid;
  const publishValid = saveDraftValid && questions.length >= 1;

  const buildPayload = useCallback(
    () => ({
      name: name.trim(),
      description: description.trim() || undefined,
      questions: questions.map(
        (q): QuestionSetQuestionInput => ({
          question: q.question.trim(),
          type: q.type,
          ...(q.type === "RATING" ? { scaleMax: q.scaleMax } : {}),
        }),
      ),
    }),
    [name, description, questions],
  );

  const handleSaveDraft = useCallback(async () => {
    if (!saveDraftValid) return;
    const payload = buildPayload();
    try {
      if (currentId) {
        await updateSet({ id: currentId, data: payload }).unwrap();
      } else {
        const created = await createSet(payload).unwrap();
        setCurrentId(created.id);
        seededRef.current = created.id;
      }
      toast.success(en.aiLab.questionSets.updated);
    } catch {
      toast.error(en.aiLab.questionSets.saveFailed);
    }
  }, [saveDraftValid, buildPayload, currentId, updateSet, createSet]);

  const doPublish = useCallback(async () => {
    if (!publishValid) return;
    const payload = buildPayload();
    try {
      let id = currentId;
      if (id) {
        await updateSet({ id, data: payload }).unwrap();
      } else {
        const created = await createSet(payload).unwrap();
        id = created.id;
        setCurrentId(id);
        seededRef.current = id;
      }
      await publishSet(id).unwrap();
      toast.success(en.aiLab.questionSets.published);
      onClose();
    } catch {
      toast.error(en.aiLab.questionSets.publishFailed);
    }
  }, [publishValid, buildPayload, currentId, updateSet, createSet, publishSet, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black bg-opacity-50" onClick={onClose} />
      <div className="w-[50%] min-w-[720px] bg-white shadow-xl border-l-[1px] border-border-light flex flex-col">
        <div className="p-6">
          <span className="text-base font-tertiary font-[500]">
            {isReadOnly
              ? en.aiLab.questionSets.view
              : currentId
                ? en.aiLab.questionSets.edit
                : en.aiLab.questionSets.create}
          </span>
          {isReadOnly && (
            <p className="text-sm text-typography-600 mt-1">{en.aiLab.questionSets.lockedNote}</p>
          )}
        </div>

        <div className="flex-1 min-h-0 px-10 pt-2 overflow-y-auto custom-scrollbar space-y-4 pb-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm text-typography-900 font-primary">
              {en.aiLab.questionSets.nameLabel}
              <span className="text-destructive-500 ml-1">*</span>
            </label>
            <input
              type="text"
              value={name}
              disabled={isReadOnly}
              onChange={e => setName(e.target.value)}
              placeholder={en.aiLab.questionSets.namePlaceholder}
              className="border border-border-light rounded-md px-3 py-2 w-full outline-none text-base bg-white disabled:bg-background-secondary disabled:text-typography-500"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm text-typography-900 font-primary">
              {en.aiLab.questionSets.descriptionLabel}
            </label>
            <textarea
              value={description}
              disabled={isReadOnly}
              onChange={e => setDescription(e.target.value)}
              placeholder={en.aiLab.questionSets.descriptionPlaceholder}
              rows={2}
              className="border border-border-light rounded-md px-3 py-2 w-full outline-none text-base bg-white disabled:bg-background-secondary disabled:text-typography-500"
            />
          </div>

          <div className="space-y-3 pt-2">
            {questions.map((question, index) => (
              <div
                key={index}
                className="border border-border-light rounded-md p-4 space-y-3 bg-background-secondary/30"
              >
                <div className="flex items-start justify-between gap-3">
                  <label className="text-sm font-medium text-typography-900">
                    {en.aiLab.questionSets.questionLabel} {index + 1}
                    <span className="text-destructive-500 ml-1">*</span>
                  </label>
                  {!isReadOnly && (
                    <div className="flex items-center gap-2 text-typography-500">
                      <button
                        onClick={() => moveQuestion(index, -1)}
                        disabled={index === 0}
                        className="hover:text-primary-600 disabled:opacity-30 disabled:hover:text-typography-500"
                        aria-label={en.aiLab.questionSets.moveUp}
                        title={en.aiLab.questionSets.moveUp}
                      >
                        <ArrowUp size={16} />
                      </button>
                      <button
                        onClick={() => moveQuestion(index, 1)}
                        disabled={index === questions.length - 1}
                        className="hover:text-primary-600 disabled:opacity-30 disabled:hover:text-typography-500"
                        aria-label={en.aiLab.questionSets.moveDown}
                        title={en.aiLab.questionSets.moveDown}
                      >
                        <ArrowDown size={16} />
                      </button>
                      <button
                        onClick={() => removeQuestion(index)}
                        className="hover:text-destructive-600"
                        aria-label={en.aiLab.questionSets.remove}
                        title={en.aiLab.questionSets.remove}
                      >
                        <Delete size={16} />
                      </button>
                    </div>
                  )}
                </div>
                <input
                  type="text"
                  value={question.question}
                  disabled={isReadOnly}
                  onChange={e => updateQuestion(index, { question: e.target.value })}
                  placeholder={en.aiLab.questionSets.questionPlaceholder}
                  className="border border-border-light rounded-md px-3 py-2 w-full outline-none text-base bg-white disabled:bg-background-secondary disabled:text-typography-500"
                />
                <div className="flex gap-4">
                  <div className="flex flex-col gap-1 flex-1">
                    <label className="text-xs text-typography-500">
                      {en.aiLab.questionSets.typeLabel}
                    </label>
                    <Select
                      id={`qset-question-type-${index}`}
                      labelText={en.aiLab.questionSets.typeLabel}
                      hideLabel
                      value={question.type}
                      disabled={isReadOnly}
                      onChange={e =>
                        updateQuestion(index, { type: e.target.value as LabEvalQuestionType })
                      }
                    >
                      <SelectItem value="RATING" text={en.aiLab.questionSets.typeRating} />
                      <SelectItem value="YES_NO" text={en.aiLab.questionSets.typeYesNo} />
                      <SelectItem value="TEXT" text={en.aiLab.questionSets.typeText} />
                      <SelectItem
                        value="DESCRIPTION"
                        text={en.aiLab.questionSets.typeDescription}
                      />
                    </Select>
                  </div>
                  {question.type === "RATING" && (
                    <div className="flex flex-col gap-1 w-[160px]">
                      <label className="text-xs text-typography-500">
                        {en.aiLab.questionSets.scaleLabel}
                      </label>
                      <Select
                        id={`qset-question-scale-${index}`}
                        labelText={en.aiLab.questionSets.scaleLabel}
                        hideLabel
                        value={question.scaleMax}
                        disabled={isReadOnly}
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

            {!isReadOnly && (
              <button
                onClick={() => setQuestions(prev => [...prev, { ...NEW_QUESTION }])}
                className="text-primary-600 hover:underline text-sm font-medium"
              >
                + {en.aiLab.questionSets.addQuestion}
              </button>
            )}
          </div>
        </div>

        <div className="border-t border-border-light px-10 py-4 flex gap-3 justify-end">
          <Button variant={ButtonVariant.SECONDARY} onClick={onClose} disabled={isSaving}>
            {isReadOnly ? en.common.close : en.common.cancel}
          </Button>
          {!isReadOnly && (
            <>
              <Button
                variant={ButtonVariant.SECONDARY}
                onClick={handleSaveDraft}
                disabled={!saveDraftValid || isSaving}
                title={!saveDraftValid ? en.aiLab.questionSets.draftValidation : undefined}
              >
                {en.aiLab.questionSets.saveDraft}
              </Button>
              <Button
                variant={ButtonVariant.PRIMARY}
                onClick={() => setShowPublishConfirm(true)}
                disabled={!publishValid || isSaving}
                title={!publishValid ? en.aiLab.questionSets.validation : undefined}
              >
                {en.aiLab.questionSets.publishButton}
              </Button>
            </>
          )}
        </div>
      </div>

      <ActionConfirmationPopup
        isOpen={showPublishConfirm}
        onClose={() => setShowPublishConfirm(false)}
        title={en.aiLab.questionSets.publishConfirmTitle}
        description={en.aiLab.questionSets.publishConfirmDescription}
        primaryButton={{
          label: en.aiLab.questionSets.publishButton,
          onClick: () => {
            setShowPublishConfirm(false);
            doPublish();
          },
        }}
        secondaryButton={{ label: en.common.cancel, onClick: () => setShowPublishConfirm(false) }}
      />
    </div>
  );
};
