import React, { useCallback, useMemo, useState } from "react";

import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

import { TextArea } from "@ally-ui-mono/ui-shared";
import { useGetMyAssignmentQuery, useSubmitEvaluationMutation } from "@api";
import { ActionConfirmationPopup, Button } from "@components";
import { ButtonVariant } from "@components/types";
import { en, ROUTES } from "@constants";
import { LabEvalQuestion, SubmitEvaluationAnswerInput } from "@types";

import { EvaluateLayout } from "./EvaluateLayout";

interface DraftAnswer {
  rating?: number;
  yesNo?: boolean;
  text?: string;
}

const Section: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div>
    <h3 className="text-xs uppercase tracking-wide text-typography-500 mb-1">{label}</h3>
    {children}
  </div>
);

const RatingInput: React.FC<{
  question: LabEvalQuestion;
  value?: number;
  disabled: boolean;
  onChange: (value: number) => void;
}> = ({ question, value, disabled, onChange }) => {
  const options: number[] = [];
  for (let v = question.scaleMin; v <= question.scaleMax; v++) options.push(v);
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(option => (
        <button
          key={option}
          type="button"
          disabled={disabled}
          onClick={() => onChange(option)}
          className={`w-10 h-10 rounded-md border text-base transition-colors ${
            value === option
              ? "bg-primary-500 text-white border-primary-500"
              : "bg-white text-typography-900 border-border-light hover:border-primary-300"
          } ${disabled ? "opacity-60 cursor-not-allowed" : ""}`}
        >
          {option}
        </button>
      ))}
    </div>
  );
};

const YesNoInput: React.FC<{
  value?: boolean;
  disabled: boolean;
  onChange: (value: boolean) => void;
}> = ({ value, disabled, onChange }) => (
  <div className="flex gap-2">
    {[
      { label: en.evaluate.yes, val: true },
      { label: en.evaluate.no, val: false },
    ].map(option => (
      <button
        key={option.label}
        type="button"
        disabled={disabled}
        onClick={() => onChange(option.val)}
        className={`px-6 py-2 rounded-md border text-base transition-colors ${
          value === option.val
            ? "bg-primary-500 text-white border-primary-500"
            : "bg-white text-typography-900 border-border-light hover:border-primary-300"
        } ${disabled ? "opacity-60 cursor-not-allowed" : ""}`}
      >
        {option.label}
      </button>
    ))}
  </div>
);

/**
 * One assigned record: full run details + the evaluation question form.
 * Submitting is final — afterwards the answers render read-only.
 */
export const EvaluateRecordDetail: React.FC = () => {
  const { assignmentId = "" } = useParams<{ assignmentId: string }>();
  const navigate = useNavigate();
  const { data, isLoading, isError } = useGetMyAssignmentQuery(assignmentId, {
    skip: !assignmentId,
    refetchOnMountOrArgChange: true,
  });
  const [submitEvaluation, { isLoading: isSubmitting }] = useSubmitEvaluationMutation();

  const [draft, setDraft] = useState<Record<string, DraftAnswer>>({});
  const [showConfirm, setShowConfirm] = useState(false);

  const submitted = Boolean(data?.submittedAt);

  // Read-only values from the server after submission.
  const submittedByQuestion = useMemo(
    () => new Map((data?.answers ?? []).map(a => [a.questionId, a])),
    [data],
  );

  const allAnswered = useMemo(() => {
    if (!data) return false;
    return data.questions.every(question => {
      const answer = draft[question.id];
      if (!answer) return false;
      if (question.type === "RATING") return answer.rating != null;
      if (question.type === "YES_NO") return answer.yesNo != null;
      return Boolean(answer.text && answer.text.trim());
    });
  }, [data, draft]);

  const updateDraft = useCallback((questionId: string, patch: DraftAnswer) => {
    setDraft(prev => ({ ...prev, [questionId]: { ...prev[questionId], ...patch } }));
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!data || !allAnswered) return;
    setShowConfirm(false);
    const answers: SubmitEvaluationAnswerInput[] = data.questions.map(question => {
      const answer = draft[question.id] ?? {};
      if (question.type === "RATING") return { questionId: question.id, rating: answer.rating };
      if (question.type === "YES_NO") return { questionId: question.id, yesNo: answer.yesNo };
      return { questionId: question.id, text: answer.text?.trim() };
    });
    try {
      await submitEvaluation({ assignmentId, answers }).unwrap();
      toast.success(en.evaluate.submitted);
      // Return to the list on success: the record is now immutable, so there
      // is no editable window to double-submit into, and the list shows the
      // Submitted state. Reopening the record shows the read-only answers.
      navigate(ROUTES.EVALUATE_RECORDS);
    } catch {
      toast.error(en.evaluate.submitFailed);
    }
  }, [data, allAnswered, draft, assignmentId, submitEvaluation, navigate]);

  return (
    <EvaluateLayout>
      <button
        onClick={() => navigate(ROUTES.EVALUATE_RECORDS)}
        className="text-primary-600 hover:underline text-sm mb-4"
      >
        ← {en.evaluate.back}
      </button>

      {isLoading ? (
        <p className="text-typography-600 py-8 text-center">{en.common.loading}</p>
      ) : isError || !data ? (
        <p className="text-destructive-600 py-8 text-center">{en.evaluate.loadFailed}</p>
      ) : (
        <div className="space-y-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl text-typography-900 font-secondary">{data.run.skillName}</h1>
              <p className="text-sm text-typography-500 mt-1">
                {en.evaluate.modelLabel}: <span className="font-mono">{data.run.model}</span>
              </p>
            </div>
            {submitted && data.submittedAt && (
              <span className="text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded-full px-3 py-1 whitespace-nowrap">
                {en.evaluate.submittedOn} {new Date(data.submittedAt).toLocaleString()}
              </span>
            )}
          </div>

          {data.run.variableValues.length > 0 && (
            <Section label={en.evaluate.variablesHeading}>
              <div className="space-y-2">
                {data.run.variableValues.map(variable => (
                  <div
                    key={variable.name}
                    className="border border-border-light rounded-md bg-white px-3 py-2"
                  >
                    <div className="font-mono text-sm text-typography-700 mb-1 break-all">
                      {`{{${variable.name}}}`}
                    </div>
                    <div className="text-sm text-typography-900 whitespace-pre-wrap break-words max-h-40 overflow-y-auto custom-scrollbar">
                      {variable.value}
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          )}

          <Section label={en.evaluate.promptHeading}>
            <pre className="whitespace-pre-wrap break-words font-mono text-sm bg-white border border-border-light rounded-md p-3 max-h-[220px] overflow-y-auto custom-scrollbar">
              {data.run.resolvedPrompt}
            </pre>
          </Section>

          <Section label={en.evaluate.outputHeading}>
            <pre className="whitespace-pre-wrap break-words text-base bg-white border border-border-light rounded-md p-4 max-h-[420px] overflow-y-auto custom-scrollbar">
              {data.run.output || ""}
            </pre>
          </Section>

          <Section label={en.evaluate.questionsHeading}>
            {submitted && (
              <p className="text-sm text-typography-600 bg-background-secondary border border-border-light rounded-md px-4 py-3 mb-3">
                {en.evaluate.readOnlyNote}
              </p>
            )}
            <div className="space-y-4">
              {data.questions.map((question, index) => {
                const saved = submittedByQuestion.get(question.id);
                const current = submitted
                  ? {
                      rating: saved?.rating ?? undefined,
                      yesNo: saved?.yesNo ?? undefined,
                      text: saved?.text ?? undefined,
                    }
                  : (draft[question.id] ?? {});
                return (
                  <div
                    key={question.id}
                    className="border border-border-light rounded-md bg-white p-4 space-y-3"
                  >
                    <div className="text-base text-typography-900 font-medium">
                      {index + 1}. {question.question}
                    </div>
                    {question.type === "RATING" && (
                      <RatingInput
                        question={question}
                        value={current.rating}
                        disabled={submitted}
                        onChange={rating => updateDraft(question.id, { rating })}
                      />
                    )}
                    {question.type === "YES_NO" && (
                      <YesNoInput
                        value={current.yesNo}
                        disabled={submitted}
                        onChange={yesNo => updateDraft(question.id, { yesNo })}
                      />
                    )}
                    {question.type === "TEXT" && (
                      <TextArea
                        id={`eval-answer-${question.id}`}
                        labelText={en.evaluate.textPlaceholder}
                        hideLabel
                        value={current.text ?? ""}
                        disabled={submitted}
                        onChange={e => updateDraft(question.id, { text: e.target.value })}
                        placeholder={en.evaluate.textPlaceholder}
                        rows={4}
                        className="w-full"
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </Section>

          {!submitted && (
            <div className="flex justify-end pb-8">
              <Button
                variant={ButtonVariant.PRIMARY}
                onClick={() => setShowConfirm(true)}
                disabled={!allAnswered || isSubmitting}
                title={!allAnswered ? en.evaluate.answerAll : undefined}
              >
                {isSubmitting ? en.evaluate.submitting : en.evaluate.submit}
              </Button>
            </div>
          )}
        </div>
      )}

      <ActionConfirmationPopup
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        title={en.evaluate.submitConfirmTitle}
        description={en.evaluate.submitConfirmDescription}
        primaryButton={{ label: en.evaluate.submitConfirm, onClick: handleSubmit }}
        secondaryButton={{ label: en.evaluate.cancel, onClick: () => setShowConfirm(false) }}
      />
    </EvaluateLayout>
  );
};
