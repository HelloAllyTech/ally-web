import React from "react";

import { useNavigate } from "react-router-dom";

import { useGetMyAssignmentsQuery } from "@api";
import { en, ROUTES } from "@constants";

import { EvaluateLayout } from "./EvaluateLayout";

const StatusChip: React.FC<{ submitted: boolean }> = ({ submitted }) => (
  <span
    className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full border ${
      submitted
        ? "bg-green-50 text-green-700 border-green-200"
        : "bg-amber-50 text-amber-700 border-amber-200"
    }`}
  >
    {submitted ? en.evaluate.statusSubmitted : en.evaluate.statusPending}
  </span>
);

/** The evaluator's assigned records, as clickable cards. */
export const EvaluateRecords: React.FC = () => {
  const navigate = useNavigate();
  const { data, isLoading, isError } = useGetMyAssignmentsQuery(undefined, {
    refetchOnMountOrArgChange: true,
  });
  const items = data?.items ?? [];

  return (
    <EvaluateLayout>
      <h1 className="text-2xl text-typography-900 font-secondary">{en.evaluate.recordsHeading}</h1>
      <p className="text-sm text-typography-600 mt-1 mb-6">{en.evaluate.recordsSubtitle}</p>

      {isLoading ? (
        <p className="text-typography-600 py-8 text-center">{en.common.loading}</p>
      ) : isError ? (
        <p className="text-destructive-600 py-8 text-center">{en.evaluate.loadFailed}</p>
      ) : items.length === 0 ? (
        <div className="text-center py-16">
          <h2 className="text-xl text-typography-900 mb-1">{en.evaluate.noRecords}</h2>
          <p className="text-typography-600 text-sm">{en.evaluate.noRecordsSubtitle}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {items.map(item => (
            <button
              key={item.id}
              onClick={() => navigate(ROUTES.EVALUATE_RECORD(item.id))}
              className="text-left border border-border-light rounded-md bg-white p-5 hover:border-primary-300 hover:shadow-sm transition-all"
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <span className="text-lg text-typography-900 font-medium">
                  {item.run.skillName}
                </span>
                <StatusChip submitted={Boolean(item.submittedAt)} />
              </div>
              <p className="text-sm text-typography-600 line-clamp-3 whitespace-pre-wrap mb-3">
                {item.run.output}
              </p>
              <div className="flex items-center gap-3 text-xs text-typography-500">
                <span>{en.evaluate.questionsCount(item.questionCount)}</span>
                <span>·</span>
                <span>
                  {en.evaluate.assignedOn} {new Date(item.assignedAt).toLocaleDateString()}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </EvaluateLayout>
  );
};
