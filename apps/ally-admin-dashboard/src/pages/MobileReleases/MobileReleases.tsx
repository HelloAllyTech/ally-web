import { FC, useState } from "react";

import { toast } from "sonner";

import {
  Button,
  InlineLoading,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tag,
  Tooltip,
} from "@ally-ui-mono/ui-shared";
import { useTriggerMobileReleaseMutation } from "@api";
import { TooltipIcon } from "@assets";
import { ActionConfirmationPopup, EmptyState } from "@components";
import { formatRunDuration } from "@components/builder/runFormat";
import { en } from "@constants";
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

  const [isConfirmingTrigger, setIsConfirmingTrigger] = useState(false);
  const [triggerRelease, { isLoading: isTriggering }] = useTriggerMobileReleaseMutation();

  const handleTrigger = async () => {
    try {
      await triggerRelease().unwrap();
      toast.success("Release triggered — new run should appear in the history below shortly.");
      setIsConfirmingTrigger(false);
    } catch (error) {
      // Leave the dialog open on failure so the operator sees why (e.g. the
      // GitHub Actions token isn't write-scoped) and can retry, rather than
      // losing that context to a closed popup — same as RaiseBudgetDialog and
      // StartBuildDialog elsewhere in Builder.
      const message =
        (error as { data?: { message?: string } })?.data?.message ??
        "Failed to trigger the release. Please try again.";
      toast.error(message);
    }
  };

  return (
    <div className="h-full font-primary flex flex-col">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl text-typography-900 font-secondary">Mobile Releases</h1>
          <p className="text-sm text-typography-700 mt-1">
            Current live app versions and recent runs of the automated mobile release pipeline.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {isTriggering && <InlineLoading description="Triggering…" />}
          <Button
            kind="primary"
            size="md"
            disabled={isTriggering}
            onClick={() => setIsConfirmingTrigger(true)}
          >
            Trigger release now
          </Button>
        </div>
      </div>

      {/* Current live version, per platform, plus the next automated check. */}
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

        <div className="flex-1 min-w-[240px] flex items-center gap-3 rounded border border-border-light bg-white px-5 py-4">
          <MobileIcon size={24} className="text-typography-600 shrink-0" />
          <div>
            <div className="flex items-center gap-1.5">
              <p className="text-xs uppercase tracking-wide text-typography-600">
                Next automated check
              </p>
              <Tooltip
                label="This is only an estimate of when the automated pipeline could next run — it still depends on there being new commits by then, which can't be known in advance."
                align="top"
              >
                <button type="button" className="cursor-pointer inline-flex items-center">
                  <TooltipIcon />
                </button>
              </Tooltip>
            </div>
            {isVersionsLoading ? (
              <p className="text-typography-700 mt-1">Loading…</p>
            ) : isVersionsError || !versions ? (
              <p className="text-destructive-500 mt-1">Failed to load current version.</p>
            ) : (
              <p className="text-xl text-typography-900 font-secondary mt-1">
                {versions.nextEligibleCheckAt
                  ? formatDateTime(versions.nextEligibleCheckAt)
                  : "Unknown"}
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

      {isConfirmingTrigger && (
        <ActionConfirmationPopup
          isOpen={isConfirmingTrigger}
          onClose={() => setIsConfirmingTrigger(false)}
          title="Trigger mobile release now?"
          description="This immediately kicks off real production builds for **both Android and iOS** — uploading to the Play Store internal track and TestFlight. This is a real production action and can't be undone once it starts."
          primaryButton={{
            label: isTriggering ? "Triggering…" : "Trigger release",
            onClick: () => void handleTrigger(),
            disabled: isTriggering,
          }}
          secondaryButton={{
            label: en.common.cancel,
            onClick: () => setIsConfirmingTrigger(false),
            disabled: isTriggering,
          }}
        />
      )}
    </div>
  );
};
