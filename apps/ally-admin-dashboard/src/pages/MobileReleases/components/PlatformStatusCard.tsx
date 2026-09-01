import { FC, ReactNode } from "react";

import { Tag } from "@ally-ui-mono/ui-shared";
import { formatDateTime } from "@utils";

import { MobileReleaseStatusDisplay } from "../mobileReleaseStatus";

interface PlatformStatusCardProps {
  platform: "Android" | "iOS";
  isLoading: boolean;
  isError: boolean;
  /** The version this page treats as "live" — see the card's own footnote for what that means. */
  liveVersion: string | null;
  /** e.g. an Android version code shown alongside the version name. */
  liveVersionSuffix?: string | null;
  lastReleaseDate?: string | null;
  statusTag?: MobileReleaseStatusDisplay | null;
  /** Short label above the status tag, e.g. "TestFlight". */
  statusLabel?: string;
  /** Extra context under the status tag, e.g. "Build 1.23.15". */
  statusContext?: string | null;
  footnote?: ReactNode;
}

/**
 * One platform's "what's live, what's the latest, is anything happening"
 * summary — the top-of-page answer to three of the five questions this page
 * exists to answer in a few seconds. Android and iOS render the same shape
 * but never share a card, since conflating two platforms' state into one
 * generic tile is exactly what made the previous layout hard to scan.
 */
export const PlatformStatusCard: FC<PlatformStatusCardProps> = ({
  platform,
  isLoading,
  isError,
  liveVersion,
  liveVersionSuffix,
  lastReleaseDate,
  statusTag,
  statusLabel,
  statusContext,
  footnote,
}) => {
  return (
    <div className="flex-1 min-w-[280px] rounded border border-border-light bg-white px-5 py-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-typography-900">{platform}</p>
        {statusTag && (
          <Tag type={statusTag.type} size="sm">
            {statusTag.label}
          </Tag>
        )}
      </div>

      {isLoading ? (
        <p className="text-typography-700 mt-3">Loading…</p>
      ) : isError || liveVersion === null ? (
        <p className="text-destructive-500 mt-3">Failed to load current version.</p>
      ) : (
        <>
          <p className="mt-3">
            <span className="text-2xl text-typography-900 font-secondary">{liveVersion}</span>
            {liveVersionSuffix && (
              <span className="text-sm text-typography-600 ml-1.5">{liveVersionSuffix}</span>
            )}
          </p>
          <p className="text-xs uppercase tracking-wide text-typography-600 mt-0.5">Live version</p>
        </>
      )}

      {(statusLabel || lastReleaseDate) && (
        <div className="mt-4 pt-3 border-t border-border-light flex items-center justify-between gap-4">
          <div>
            {statusLabel && <p className="text-xs text-typography-600">{statusLabel}</p>}
            {statusContext && <p className="text-sm text-typography-900 mt-0.5">{statusContext}</p>}
          </div>
          {lastReleaseDate && (
            <div className="text-right">
              <p className="text-xs text-typography-600">Last release</p>
              <p className="text-sm text-typography-900 mt-0.5 whitespace-nowrap">
                {formatDateTime(lastReleaseDate)}
              </p>
            </div>
          )}
        </div>
      )}

      {footnote && <p className="text-xs text-typography-600 mt-3">{footnote}</p>}
    </div>
  );
};
