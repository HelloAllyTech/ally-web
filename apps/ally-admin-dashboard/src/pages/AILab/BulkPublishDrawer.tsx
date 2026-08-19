import React, { useCallback, useEffect, useMemo, useState } from "react";

import { toast } from "sonner";

import { usePublishLabRunMutation } from "@api";
import { Button } from "@components";
import { ButtonVariant } from "@components/types";
import { en } from "@constants";
import { LabRun, PublishRunQuestionInput } from "@types";

import { NEW_QUESTION, QuestionBuilderFields, QuestionDraft } from "./QuestionBuilderFields";

interface BulkPublishDrawerProps {
  /** Selected COMPLETED, unpublished runs. Empty = closed. */
  runs: LabRun[];
  onClose: () => void;
}

const RUN_PREVIEW_LIMIT = 6;

/**
 * Publish several completed runs for human evaluation in one action: the same
 * question list (built or imported from a Question Set) is attached to every
 * selected run. Each run is published independently server-side, so one
 * failure (e.g. a run published concurrently elsewhere) doesn't block the rest.
 */
export const BulkPublishDrawer: React.FC<BulkPublishDrawerProps> = ({ runs, onClose }) => {
  const [publishRun] = usePublishLabRunMutation();
  const [questions, setQuestions] = useState<QuestionDraft[]>([{ ...NEW_QUESTION }]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset when the actual set of selected runs changes, not on every parent
  // re-render (the `runs` array is recomputed from scratch each time).
  const runIdsKey = runs.map(r => r.id).join(",");
  useEffect(() => {
    if (runs.length > 0) setQuestions([{ ...NEW_QUESTION }]);
  }, [runIdsKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const isValid = questions.length >= 1 && questions.every(q => q.question.trim().length > 0);

  const previewNames = useMemo(
    () => runs.slice(0, RUN_PREVIEW_LIMIT).map(r => r.skillName),
    [runs],
  );
  const previewExtra = runs.length - previewNames.length;

  const handlePublishAll = useCallback(async () => {
    if (!isValid || runs.length === 0) return;
    const payload: PublishRunQuestionInput[] = questions.map(q => ({
      question: q.question.trim(),
      type: q.type,
      ...(q.type === "RATING" ? { scaleMax: q.scaleMax } : {}),
      ...(q.sourceQuestionSetId ? { sourceQuestionSetId: q.sourceQuestionSetId } : {}),
    }));

    setIsSubmitting(true);
    const results = await Promise.allSettled(
      runs.map(run => publishRun({ runId: run.id, questions: payload }).unwrap()),
    );
    setIsSubmitting(false);

    const succeeded = results.filter(r => r.status === "fulfilled").length;
    const failed = results.length - succeeded;
    if (failed === 0) {
      toast.success(en.aiLab.bulkPublish.allSucceeded(succeeded));
    } else if (succeeded === 0) {
      toast.error(en.aiLab.bulkPublish.allFailed);
    } else {
      toast.error(en.aiLab.bulkPublish.partialFailure(failed, results.length));
    }
    onClose();
  }, [isValid, runs, questions, publishRun, onClose]);

  if (runs.length === 0) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black bg-opacity-50" onClick={onClose} />
      <div className="w-[50%] min-w-[720px] bg-white shadow-xl border-l-[1px] border-border-light flex flex-col">
        <div className="p-6">
          <span className="text-base font-tertiary font-[500]">
            {en.aiLab.bulkPublish.drawerTitle}
          </span>
          <p className="text-sm text-typography-600 mt-1">
            {en.aiLab.bulkPublish.subtitle(runs.length)}
          </p>
          <p className="text-xs text-typography-500 mt-2">
            {previewNames.join(", ")}
            {previewExtra > 0 && ` (+${previewExtra} more)`}
          </p>
        </div>

        <div className="flex-1 min-h-0 px-10 pt-2 overflow-y-auto custom-scrollbar space-y-4 pb-4">
          <QuestionBuilderFields questions={questions} onChange={setQuestions} />
        </div>

        <div className="border-t border-border-light px-10 py-4 flex gap-3 justify-end">
          <Button variant={ButtonVariant.SECONDARY} onClick={onClose} disabled={isSubmitting}>
            {en.common.cancel}
          </Button>
          <Button
            variant={ButtonVariant.PRIMARY}
            onClick={handlePublishAll}
            disabled={!isValid || isSubmitting}
            title={!isValid ? en.aiLab.bulkPublish.validation : undefined}
          >
            {isSubmitting ? en.aiLab.bulkPublish.publishing : en.aiLab.bulkPublish.publishButton}
          </Button>
        </div>
      </div>
    </div>
  );
};
