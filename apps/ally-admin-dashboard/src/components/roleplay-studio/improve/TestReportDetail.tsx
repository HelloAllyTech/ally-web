import React, { useEffect, useRef, useState } from "react";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { useGetRoleplayTestReportQuery } from "@api";
import { en } from "@constants";
import { RoleplayReportImproveStatus } from "@src/types/roleplayStudio";

import { roleplayMarkdownComponents } from "../markdownComponents";

/** Score-to-colour scale, matching the session-log / scenario-report bars. */
const scoreColor = (value: number): string => {
  if (value < 33) return "#FE6F64";
  if (value < 66) return "#FFB74D";
  return "#81C784";
};

/** A labelled 0-100 metric bar (judge dimensions / rubric criteria). */
const MetricBar: React.FC<{ label: string; score: number }> = ({ label, score }) => {
  const clamped = Math.max(0, Math.min(100, score));
  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between text-sm text-typography-900">
        <span>{label}</span>
        <span className="font-medium">{Math.round(clamped)}</span>
      </div>
      <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-2 rounded-full"
          style={{ width: `${clamped}%`, backgroundColor: scoreColor(score) }}
        />
      </div>
    </div>
  );
};

interface TestReportDetailProps {
  reportId: string;
  /** Live list-row status — a change (e.g. PENDING → COMPLETED) refetches the detail. */
  status?: string;
  improveStatus?: string | null;
}

/**
 * Expanded body of a test-report card: the judge's markdown report, the
 * rubric / session-quality dimension bars, and a collapsible transcript.
 * Fetched lazily — this only mounts when the card is expanded.
 */
export const TestReportDetail: React.FC<TestReportDetailProps> = ({
  reportId,
  status,
  improveStatus,
}) => {
  const strings = en.roleplayStudio.improve;
  const { data, isLoading, isError, refetch } = useGetRoleplayTestReportQuery(reportId);
  const [showTranscript, setShowTranscript] = useState(false);

  // A card expanded while PENDING only gets list-poll updates — when the
  // polled status/improveStatus moves (report landed, improve finished),
  // re-pull the full row so the open detail isn't stale.
  const statusKey = `${status ?? ""}:${improveStatus ?? ""}`;
  const previousStatusKey = useRef(statusKey);
  useEffect(() => {
    if (previousStatusKey.current === statusKey) return;
    previousStatusKey.current = statusKey;
    void refetch();
  }, [statusKey, refetch]);

  if (isLoading) {
    return <p className="text-sm text-typography-500">{en.common.loading}</p>;
  }
  if (isError || !data) {
    return <p className="text-sm text-destructive-500">{strings.detailLoadFailed}</p>;
  }

  const isFullSession = data.testCaseSnapshot?.type === "full_session";
  const rubricScores = data.testResult?.rubric_scores ?? [];
  const judgeEntries = Object.entries(data.judgeScores ?? {});
  const transcript = data.transcript ?? [];

  return (
    <div className="flex flex-col gap-4">
      {data.improveStatus === RoleplayReportImproveStatus.FAILED && data.improveMeta?.error && (
        <p className="text-sm text-destructive-500">
          {strings.improveFailed}: {data.improveMeta.error}
        </p>
      )}

      {isFullSession && (data.overallScore != null || rubricScores.length > 0) && (
        <div className="flex flex-col gap-3">
          {data.overallScore != null && (
            <div>
              <span className="text-xs text-typography-500">{strings.overallScore}</span>
              <div className="text-2xl font-medium text-typography-900">
                {Math.round(data.overallScore)}
                <span className="text-sm text-typography-500"> / 100</span>
              </div>
            </div>
          )}
          {rubricScores.length > 0 && (
            <div>
              <h4 className="text-xs uppercase tracking-wide text-typography-500 mb-2">
                {strings.rubricScores}
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3">
                {rubricScores.map((row, index) => (
                  <MetricBar
                    key={`${row.criteria}-${index}`}
                    label={row.criteria}
                    score={row.score}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div>
        <h4 className="text-xs uppercase tracking-wide text-typography-500 mb-2">
          {strings.reportSection}
        </h4>
        {data.reportMarkdown ? (
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={roleplayMarkdownComponents}>
            {data.reportMarkdown}
          </ReactMarkdown>
        ) : (
          <p className="text-sm text-typography-500">{strings.noReportContent}</p>
        )}
      </div>

      {judgeEntries.length > 0 && (
        <div>
          <h4 className="text-xs uppercase tracking-wide text-typography-500 mb-2">
            {strings.sessionQuality}
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3">
            {judgeEntries.map(([name, score]) => (
              <MetricBar key={name} label={name} score={Number(score)} />
            ))}
          </div>
        </div>
      )}

      {data.judgeNotes && (
        <div>
          <h4 className="text-xs uppercase tracking-wide text-typography-500 mb-1">
            {strings.judgeNotes}
          </h4>
          <p className="text-sm text-typography-900 whitespace-pre-wrap">{data.judgeNotes}</p>
        </div>
      )}

      {transcript.length > 0 && (
        <div>
          <button
            type="button"
            onClick={() => setShowTranscript(previous => !previous)}
            className="text-sm text-primary-500 hover:underline"
          >
            {showTranscript ? strings.hideTranscript : strings.showTranscript}
          </button>
          {showTranscript && (
            <div className="mt-2 flex flex-col gap-2 max-h-80 overflow-y-auto custom-scrollbar">
              {transcript.map((turn, index) => (
                <div key={index} className="text-sm text-typography-900">
                  <span className="font-medium">{turn.role ?? turn.speaker ?? "—"}</span>
                  {": "}
                  <span className="whitespace-pre-wrap">{turn.content ?? turn.text ?? ""}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
