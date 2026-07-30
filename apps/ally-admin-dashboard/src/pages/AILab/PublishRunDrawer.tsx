import React, { useCallback, useEffect, useState } from "react";

import { toast } from "sonner";

import { usePublishLabRunMutation } from "@api";
import { Button } from "@components";
import { ButtonVariant } from "@components/types";
import { en } from "@constants";
import { LabRun, PublishRunQuestionInput } from "@types";

import { NEW_QUESTION, QuestionBuilderFields, QuestionDraft } from "./QuestionBuilderFields";

interface PublishRunDrawerProps {
  run: LabRun | null;
  onClose: () => void;
}

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

  const isValid = questions.length >= 1 && questions.every(q => q.question.trim().length > 0);

  const handlePublish = useCallback(async () => {
    if (!run || !isValid) return;
    const payload: PublishRunQuestionInput[] = questions.map(q => ({
      question: q.question.trim(),
      type: q.type,
      ...(q.type === "RATING" ? { scaleMax: q.scaleMax } : {}),
      ...(q.sourceQuestionSetId ? { sourceQuestionSetId: q.sourceQuestionSetId } : {}),
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
          <QuestionBuilderFields questions={questions} onChange={setQuestions} />
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
