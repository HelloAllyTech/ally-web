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
import { IosTestflightHistoryEntry } from "@types";
import { formatDateTime } from "@utils";

import { getTestflightStatusDisplay } from "../mobileReleaseStatus";

interface TestflightHistoryTableProps {
  history: IosTestflightHistoryEntry[];
  isLoading: boolean;
  isError: boolean;
  /** buildId of the build shown as "current" elsewhere on this page, if any — highlighted here too. */
  currentBuildId?: string | null;
}

export const TestflightHistoryTable: FC<TestflightHistoryTableProps> = ({
  history,
  isLoading,
  isError,
  currentBuildId,
}) => {
  if (isLoading) return <p className="text-typography-700">Loading…</p>;
  if (isError && history.length === 0) {
    return <p className="text-destructive-500">Failed to load TestFlight submission history.</p>;
  }
  if (history.length === 0) {
    return (
      <EmptyState
        title="No submissions yet"
        subtitle="No iOS build has been uploaded to TestFlight yet — check back after the next automated build."
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
            <TableHeader className="py-3 pr-4 font-medium">Uploaded</TableHeader>
            <TableHeader className="py-3 pr-4 font-medium">Beta review status</TableHeader>
            <TableHeader className="py-3 pr-4 font-medium" />
          </TableRow>
        </TableHead>
        <TableBody>
          {history.map(entry => {
            const statusDisplay = getTestflightStatusDisplay(entry);
            const isCurrent = currentBuildId && entry.buildId === currentBuildId;
            return (
              <TableRow
                key={entry.buildId}
                className={`border-b border-border-light text-sm text-typography-900 align-top ${
                  isCurrent ? "bg-primary-50" : ""
                }`}
              >
                <TableCell className="py-3 pr-4 whitespace-nowrap">{entry.buildVersion}</TableCell>
                <TableCell className="py-3 pr-4 whitespace-nowrap">
                  {formatDateTime(entry.uploadedDate)}
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
      {isError && history.length > 0 && (
        <p className="text-sm text-destructive-500 mt-2">
          Couldn't refresh just now — showing the last known submissions.
        </p>
      )}
    </>
  );
};
