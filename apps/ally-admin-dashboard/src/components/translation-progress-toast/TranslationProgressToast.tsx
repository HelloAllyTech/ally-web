import { FC } from "react";

import { TranslationJob, TranslationLanguageStatus, TranslationProgressToastProps } from "./types";

const statusLabel = (job: TranslationJob): string => {
  if (job.status === "completed") return "Translations ready";
  if (job.status === "failed") return "Translation failed";
  if (job.status === "started") return "Starting translations…";
  return `Translating… ${job.completed}/${job.total}`;
};

const languageGlyph = (status: TranslationLanguageStatus): string => {
  if (status === "translated") return "✓";
  if (status === "translating") return "⏳";
  if (status === "failed") return "✗";
  return "◯";
};

const languageColor = (status: TranslationLanguageStatus): string => {
  if (status === "translated") return "text-green-600";
  if (status === "translating") return "text-blue-600";
  if (status === "failed") return "text-red-600";
  return "text-gray-400";
};

const TranslationProgressJob: FC<{
  job: TranslationJob;
  onDismiss: (jobId: string) => void;
}> = ({ job, onDismiss }) => {
  const percentage =
    job.total > 0 ? Math.min(100, Math.round((job.completed / job.total) * 100)) : 0;

  const barColor =
    job.status === "failed"
      ? "bg-red-500"
      : job.status === "completed"
        ? "bg-green-500"
        : "bg-blue-500";

  return (
    <div className="w-80 rounded-lg border border-[#EFEFEF] bg-white shadow-lg overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#EFEFEF]">
        <div className="flex flex-col min-w-0">
          <span className="text-sm font-medium text-[#1A1A1A] truncate">
            {job.scenarioTitle || "Roleplay"}
          </span>
          <span className="text-xs text-gray-500">{statusLabel(job)}</span>
        </div>
        <button
          type="button"
          onClick={() => onDismiss(job.jobId)}
          className="text-gray-400 hover:text-gray-600 ml-2"
          aria-label="Dismiss"
        >
          {"✕"}
        </button>
      </div>

      <div className="px-3 py-2">
        <div className="h-1.5 w-full rounded-full bg-gray-100 overflow-hidden">
          <div
            className={`h-full ${barColor} transition-all duration-300`}
            style={{ width: `${percentage}%` }}
          />
        </div>

        {job.languages.length > 0 && (
          <ul className="mt-2 grid grid-cols-2 gap-x-2 gap-y-1">
            {job.languages.map(lang => (
              <li
                key={lang.code}
                className={`flex items-center gap-1 text-xs ${languageColor(lang.status)}`}
                title={lang.error || lang.code}
              >
                <span className="inline-block w-3 text-center">{languageGlyph(lang.status)}</span>
                <span className="truncate">{lang.code}</span>
              </li>
            ))}
          </ul>
        )}

        {job.status === "failed" && job.error && (
          <p className="mt-2 text-xs text-red-600 truncate" title={job.error}>
            {job.error}
          </p>
        )}
      </div>
    </div>
  );
};

export const TranslationProgressToast: FC<TranslationProgressToastProps> = ({
  jobs,
  onDismiss,
}) => {
  if (jobs.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2">
      {jobs.map(job => (
        <TranslationProgressJob key={job.jobId} job={job} onDismiss={onDismiss} />
      ))}
    </div>
  );
};
