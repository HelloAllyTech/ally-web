import React from "react";

import { useGetRunResultsQuery } from "@api";
import { DoubleArrowRight } from "@assets";
import { en } from "@constants";
import { LabRun, LabRunResults, LabRunResultsQuestion } from "@types";

interface RunResultsDrawerProps {
  run: LabRun | null;
  onClose: () => void;
}

/** Trigger a client-side file download of `content`. */
const download = (filename: string, content: string, mime: string) => {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

const csvCell = (v: string | number | null | undefined): string => {
  const s = v == null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** Share of responses on the most common answer (0–1), or null if no responses. */
const questionAgreement = (q: LabRunResultsQuestion): number | null => {
  if (q.type === "RATING") {
    const counts = Object.values(q.distribution ?? {});
    const total = counts.reduce((a, b) => a + b, 0);
    return total > 0 ? Math.max(...counts) / total : null;
  }
  if (q.type === "YES_NO") {
    const yes = q.yesCount ?? 0;
    const no = q.noCount ?? 0;
    const total = yes + no;
    return total > 0 ? Math.max(yes, no) / total : null;
  }
  return null;
};

/** Build a per-question summary CSV from the results. */
const resultsToCsv = (skillName: string, data: LabRunResults): string => {
  const rows: string[] = [];
  rows.push(["skill", "assigned", "submitted", "record_score_pct"].map(csvCell).join(","));
  rows.push(
    [skillName, data.totals.assigned, data.totals.submitted, data.recordLevel.normalizedScore ?? ""]
      .map(csvCell)
      .join(","),
  );
  rows.push("");
  rows.push(["question", "type", "responses", "summary", "agreement_pct"].map(csvCell).join(","));
  for (const q of data.questions) {
    const agreement = questionAgreement(q);
    const summary =
      q.type === "RATING"
        ? `avg ${q.average ?? "n/a"} / ${q.scaleMax}`
        : q.type === "YES_NO"
          ? `yes ${q.yesCount ?? 0} / no ${q.noCount ?? 0}`
          : q.type === "DESCRIPTION"
            ? "n/a (description)"
            : `${q.answers?.length ?? 0} answers`;
    rows.push(
      [
        q.question,
        q.type,
        q.responseCount,
        summary,
        agreement == null ? "" : Math.round(agreement * 100),
      ]
        .map(csvCell)
        .join(","),
    );
  }
  return rows.join("\n");
};

const Stat: React.FC<{ label: string; value: React.ReactNode; help?: string }> = ({
  label,
  value,
  help,
}) => (
  <div className="border border-border-light rounded-md px-4 py-3 flex-1" title={help}>
    <div className="text-xs uppercase tracking-wide text-typography-500">{label}</div>
    <div className="text-2xl text-typography-900 mt-1">{value}</div>
  </div>
);

const RatingResult: React.FC<{ question: LabRunResultsQuestion }> = ({ question }) => {
  const distribution = question.distribution ?? {};
  const values = Object.keys(distribution)
    .map(Number)
    .sort((a, b) => a - b);
  const maxCount = Math.max(1, ...values.map(v => distribution[v] ?? 0));
  return (
    <div>
      <div className="flex items-baseline gap-2 mb-2">
        <span className="text-2xl text-typography-900">
          {question.average != null ? question.average : "—"}
        </span>
        <span className="text-sm text-typography-500">
          / {question.scaleMax} · {question.responseCount} {en.aiLab.results.responsesLabel}
        </span>
      </div>
      <div className="space-y-1">
        {values.map(value => {
          const count = distribution[value] ?? 0;
          return (
            <div key={value} className="flex items-center gap-2 text-sm">
              <span className="w-5 text-right text-typography-600">{value}</span>
              <div className="flex-1 h-3 bg-background-secondary rounded overflow-hidden">
                <div
                  className="h-full bg-primary-500"
                  style={{ width: `${(count / maxCount) * 100}%` }}
                />
              </div>
              <span className="w-6 text-typography-600">{count}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const YesNoResult: React.FC<{ question: LabRunResultsQuestion }> = ({ question }) => {
  const yes = question.yesCount ?? 0;
  const no = question.noCount ?? 0;
  const total = yes + no;
  const yesPct = total > 0 ? Math.round((yes / total) * 100) : 0;
  return (
    <div>
      <div className="flex items-center gap-4 text-sm mb-2">
        <span className="text-typography-900">
          {en.aiLab.results.yes}: <strong>{yes}</strong>
        </span>
        <span className="text-typography-900">
          {en.aiLab.results.no}: <strong>{no}</strong>
        </span>
        <span className="text-typography-500">
          {total} {en.aiLab.results.responsesLabel}
        </span>
      </div>
      <div className="h-3 bg-destructive-100 rounded overflow-hidden">
        <div className="h-full bg-green-500" style={{ width: `${yesPct}%` }} />
      </div>
    </div>
  );
};

const DescriptionResult: React.FC = () => (
  <p className="text-sm text-typography-500">{en.aiLab.results.descriptionNote}</p>
);

const TextResult: React.FC<{ question: LabRunResultsQuestion }> = ({ question }) => {
  const answers = question.answers ?? [];
  if (answers.length === 0) {
    return <p className="text-sm text-typography-500">{en.aiLab.results.noTextAnswers}</p>;
  }
  return (
    <div className="space-y-2">
      {answers.map((answer, index) => (
        <div key={index} className="border border-border-light rounded-md px-3 py-2 bg-white">
          <div className="text-xs text-typography-500 mb-1">{answer.evaluatorEmail}</div>
          <div className="text-sm text-typography-900 whitespace-pre-wrap break-words">
            {answer.text}
          </div>
        </div>
      ))}
    </div>
  );
};

/** Aggregated human-eval results for one published run (super-duper-admin). */
export const RunResultsDrawer: React.FC<RunResultsDrawerProps> = ({ run, onClose }) => {
  const { data, isFetching, isError } = useGetRunResultsQuery(run?.id ?? "", {
    skip: !run,
    refetchOnMountOrArgChange: true,
  });

  if (!run) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black bg-opacity-50" onClick={onClose} />
      <div className="w-[50%] min-w-[720px] bg-white shadow-xl border-l-[1px] border-border-light flex flex-col">
        <div className="flex items-center justify-between p-6">
          <button
            onClick={onClose}
            className="flex flex-row items-center gap-2 text-typography-600 hover:text-neutral-800"
          >
            <DoubleArrowRight width={14} height={14} />
            <span className="text-base font-tertiary font-[500]">
              {en.aiLab.results.drawerTitle}
            </span>
          </button>
          <div className="flex items-center gap-3">
            {data && (
              <>
                <button
                  onClick={() =>
                    download(
                      `run-${run.id}-results.csv`,
                      resultsToCsv(run.skillName, data),
                      "text/csv",
                    )
                  }
                  className="text-xs text-typography-600 hover:text-primary-600 border border-border-light rounded px-2 py-1"
                >
                  {en.aiLab.results.exportCsv}
                </button>
                <button
                  onClick={() =>
                    download(
                      `run-${run.id}-results.json`,
                      JSON.stringify(data, null, 2),
                      "application/json",
                    )
                  }
                  className="text-xs text-typography-600 hover:text-primary-600 border border-border-light rounded px-2 py-1"
                >
                  {en.aiLab.results.exportJson}
                </button>
              </>
            )}
            <span className="text-sm text-typography-600">{run.skillName}</span>
          </div>
        </div>

        <div className="flex-1 min-h-0 px-10 pt-2 overflow-y-auto custom-scrollbar space-y-6 pb-8">
          {isFetching ? (
            <p className="text-typography-600 py-8 text-center">{en.common.loading}</p>
          ) : isError || !data ? (
            <p className="text-destructive-600 py-8 text-center">{en.aiLab.results.loadFailed}</p>
          ) : (
            <>
              <div className="flex gap-3">
                <Stat label={en.aiLab.results.assigned} value={data.totals.assigned} />
                <Stat label={en.aiLab.results.submitted} value={data.totals.submitted} />
                <Stat
                  label={en.aiLab.results.recordAverage}
                  help={en.aiLab.results.recordAverageHelp}
                  value={
                    data.recordLevel.normalizedScore != null ? (
                      `${data.recordLevel.normalizedScore}%`
                    ) : (
                      <span className="text-base text-typography-500">
                        {en.aiLab.results.noRatingsYet}
                      </span>
                    )
                  }
                />
              </div>

              {data.questions.map((question, index) => (
                <div
                  key={question.id}
                  className="border border-border-light rounded-md p-4 space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="text-base font-medium text-typography-900">
                      {index + 1}. {question.question}
                    </div>
                    {(() => {
                      const agreement = questionAgreement(question);
                      return agreement != null ? (
                        <span
                          className="shrink-0 text-xs text-typography-500 whitespace-nowrap"
                          title={en.aiLab.results.agreementHelp}
                        >
                          {en.aiLab.results.agreement}: {Math.round(agreement * 100)}%
                        </span>
                      ) : null;
                    })()}
                  </div>
                  {question.type === "RATING" && <RatingResult question={question} />}
                  {question.type === "YES_NO" && <YesNoResult question={question} />}
                  {question.type === "TEXT" && <TextResult question={question} />}
                  {question.type === "DESCRIPTION" && <DescriptionResult />}
                </div>
              ))}

              <div>
                <h4 className="text-xs uppercase tracking-wide text-typography-500 mb-2">
                  {en.aiLab.results.evaluatorsHeading}
                </h4>
                <div className="border border-border-light rounded-md divide-y divide-border-light">
                  {data.assignments.map(assignment => (
                    <div
                      key={assignment.id}
                      className="flex items-center justify-between px-4 py-2 text-sm"
                    >
                      <span className="text-typography-900">
                        {assignment.evaluator?.email ?? "—"}
                      </span>
                      {assignment.submittedAt ? (
                        <span className="text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded-full px-2 py-0.5">
                          {en.aiLab.results.submitted}
                        </span>
                      ) : (
                        <span className="text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
                          {en.aiLab.results.pending}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
