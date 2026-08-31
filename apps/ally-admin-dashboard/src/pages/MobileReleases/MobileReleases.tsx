import { FC } from "react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tag,
} from "@ally-ui-mono/ui-shared";
import { EmptyState } from "@components";
import { formatRunDuration } from "@components/builder/runFormat";
import { Link as LinkIcon, Mobile as MobileIcon } from "@icons";
import { MobileReleaseRun } from "@types";
import { formatDateTime, openLinkInNewTab } from "@utils";

import { getMobileReleaseRunStatusDisplay } from "./mobileReleaseStatus";
import { useMobileReleases } from "./useMobileReleases";

/** First 7 chars of a commit SHA — the length GitHub's own UI uses for a short SHA. */
const shortSha = (sha: string) => sha.slice(0, 7);

const runDisplayDuration = (run: MobileReleaseRun): string => {
  if (run.status !== "completed") return "In progress";
  if (!run.runStartedAt) return "—";
  return formatRunDuration(run.runStartedAt, run.updatedAt) ?? "—";
};

export const MobileReleases: FC = () => {
  const {
    runs,
    isRunsLoading,
    isRunsFetching,
    isRunsError,
    versions,
    isVersionsLoading,
    isVersionsError,
  } = useMobileReleases();

  return (
    <div className="h-full font-primary flex flex-col">
      <div>
        <h1 className="text-2xl text-typography-900 font-secondary">Mobile Releases</h1>
        <p className="text-sm text-typography-700 mt-1">
          Current live app versions and recent runs of the automated mobile release pipeline.
        </p>
      </div>

      {/* Current live version, per platform. */}
      <div className="flex flex-wrap gap-4 mt-6 shrink-0">
        <div className="flex-1 min-w-[240px] flex items-center gap-3 rounded border border-border-light bg-white px-5 py-4">
          <MobileIcon size={24} className="text-typography-600 shrink-0" />
          <div>
            <p className="text-xs uppercase tracking-wide text-typography-600">
              Android — live version
            </p>
            {isVersionsLoading ? (
              <p className="text-typography-700 mt-1">Loading…</p>
            ) : isVersionsError || !versions ? (
              <p className="text-destructive-500 mt-1">Failed to load current version.</p>
            ) : (
              <p className="text-xl text-typography-900 font-secondary mt-1">
                {versions.android.versionName}{" "}
                <span className="text-sm text-typography-600">
                  ({versions.android.versionCode})
                </span>
              </p>
            )}
          </div>
        </div>

        <div className="flex-1 min-w-[240px] flex items-center gap-3 rounded border border-border-light bg-white px-5 py-4">
          <MobileIcon size={24} className="text-typography-600 shrink-0" />
          <div>
            <p className="text-xs uppercase tracking-wide text-typography-600">
              iOS — live version
            </p>
            {isVersionsLoading ? (
              <p className="text-typography-700 mt-1">Loading…</p>
            ) : isVersionsError || !versions ? (
              <p className="text-destructive-500 mt-1">Failed to load current version.</p>
            ) : (
              <p className="text-xl text-typography-900 font-secondary mt-1">
                {versions.ios.marketingVersion}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Run history. */}
      <div className="flex-1 overflow-y-auto custom-scrollbar mt-6">
        {isRunsLoading ? (
          <p className="text-typography-700">Loading…</p>
        ) : isRunsError ? (
          <p className="text-destructive-500">Failed to load run history.</p>
        ) : runs.length === 0 ? (
          <EmptyState
            title="No runs yet"
            subtitle="The release pipeline hasn't run yet — check back after its next scheduled pass."
            hideActionButton
          />
        ) : (
          <Table className="w-full text-left border-collapse">
            <TableHead>
              <TableRow className="border-b border-border-light text-sm text-typography-700">
                <TableHeader className="py-3 pr-4 font-medium">Workflow</TableHeader>
                <TableHeader className="py-3 pr-4 font-medium">Status</TableHeader>
                <TableHeader className="py-3 pr-4 font-medium">Triggered by</TableHeader>
                <TableHeader className="py-3 pr-4 font-medium">Commit</TableHeader>
                <TableHeader className="py-3 pr-4 font-medium">Started</TableHeader>
                <TableHeader className="py-3 pr-4 font-medium">Duration</TableHeader>
                <TableHeader className="py-3 pr-4 font-medium" />
              </TableRow>
            </TableHead>
            <TableBody>
              {runs.map(run => {
                const statusDisplay = getMobileReleaseRunStatusDisplay(run.status, run.conclusion);
                return (
                  <TableRow
                    key={run.id}
                    className="border-b border-border-light text-sm text-typography-900 align-top"
                  >
                    <TableCell className="py-3 pr-4 whitespace-nowrap">
                      {run.workflowName}
                    </TableCell>
                    <TableCell className="py-3 pr-4 whitespace-nowrap">
                      <Tag type={statusDisplay.type} size="sm">
                        {statusDisplay.label}
                      </Tag>
                    </TableCell>
                    <TableCell className="py-3 pr-4 whitespace-nowrap">{run.actor}</TableCell>
                    <TableCell className="py-3 pr-4 max-w-[320px]">
                      <span
                        title={run.headCommitMessage ?? undefined}
                        className="font-mono text-xs truncate block"
                      >
                        {shortSha(run.headSha)} — {run.headCommitMessage}
                      </span>
                    </TableCell>
                    <TableCell className="py-3 pr-4 whitespace-nowrap">
                      {run.runStartedAt ? formatDateTime(run.runStartedAt) : "Queued"}
                    </TableCell>
                    <TableCell className="py-3 pr-4 whitespace-nowrap">
                      {runDisplayDuration(run)}
                    </TableCell>
                    <TableCell className="py-3 pr-4 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => openLinkInNewTab(run.htmlUrl)}
                        title="View on GitHub"
                        aria-label="View run on GitHub"
                        className="text-typography-600 hover:text-typography-900"
                      >
                        <LinkIcon size={16} />
                      </button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      {runs.length > 0 && (
        <div className="flex items-center justify-end shrink-0 border-t border-border-light pt-3 mt-2">
          <span className="text-sm text-typography-700">{isRunsFetching ? "Updating…" : ""}</span>
        </div>
      )}
    </div>
  );
};
