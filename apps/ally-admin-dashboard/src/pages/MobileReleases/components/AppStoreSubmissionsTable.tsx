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
import { IosAppStoreReviewSubmissionEntry } from "@types";
import { formatDateTime } from "@utils";

import { getAppStoreReviewSubmissionStatusDisplay } from "../mobileReleaseStatus";

interface AppStoreSubmissionsTableProps {
  submissions: IosAppStoreReviewSubmissionEntry[];
  isLoading: boolean;
  isError: boolean;
  /** versionString of the build shown as "current" elsewhere on this page, if any — highlighted here too. */
  currentVersionString?: string | null;
}

export const AppStoreSubmissionsTable: FC<AppStoreSubmissionsTableProps> = ({
  submissions,
  isLoading,
  isError,
  currentVersionString,
}) => {
  if (isLoading) return <p className="text-typography-700">Loading…</p>;
  if (isError && submissions.length === 0) {
    return (
      <p className="text-destructive-500">Failed to load App Store review submission history.</p>
    );
  }
  if (submissions.length === 0) {
    return (
      <EmptyState
        title="No submissions yet"
        subtitle="No iOS build has been submitted for full App Store review yet."
        hideActionButton
      />
    );
  }

  return (
    <>
      <Table className="w-full text-left border-collapse">
        <TableHead>
          <TableRow className="border-b border-border-light text-sm text-typography-700">
            <TableHeader className="py-3 pr-4 font-medium">Version</TableHeader>
            <TableHeader className="py-3 pr-4 font-medium">Submitted</TableHeader>
            <TableHeader className="py-3 pr-4 font-medium">Status</TableHeader>
            <TableHeader className="py-3 pr-4 font-medium" />
          </TableRow>
        </TableHead>
        <TableBody>
          {submissions.map((entry, index) => {
            const statusDisplay = getAppStoreReviewSubmissionStatusDisplay(entry.state);
            const isCurrent = currentVersionString && entry.versionString === currentVersionString;
            return (
              <TableRow
                // Apple's reviewSubmissions resource has its own id, but the backend
                // doesn't surface it — submittedDate is unique per submission in practice.
                key={`${entry.submittedDate}-${index}`}
                className={`border-b border-border-light text-sm text-typography-900 align-top ${
                  isCurrent ? "bg-primary-50" : ""
                }`}
              >
                <TableCell className="py-3 pr-4 whitespace-nowrap">{entry.versionString}</TableCell>
                <TableCell className="py-3 pr-4 whitespace-nowrap">
                  {formatDateTime(entry.submittedDate)}
                </TableCell>
                <TableCell className="py-3 pr-4 whitespace-nowrap">
                  <Tag type={statusDisplay.type} size="sm">
                    {statusDisplay.label}
                  </Tag>
                </TableCell>
                <TableCell className="py-3 pr-4 whitespace-nowrap">
                  {isCurrent && (
                    <Tag type="blue" size="sm">
                      Current
                    </Tag>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      {isError && submissions.length > 0 && (
        <p className="text-sm text-destructive-500 mt-2">
          Couldn't refresh just now — showing the last known submissions.
        </p>
      )}
    </>
  );
};
