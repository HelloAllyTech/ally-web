import React from "react";

import { LabRunStatus } from "@types";

const STYLES: Record<LabRunStatus, string> = {
  PENDING: "bg-neutral-100 text-typography-600 border-border-light",
  RUNNING: "bg-amber-50 text-amber-700 border-amber-200",
  COMPLETED: "bg-green-50 text-green-700 border-green-200",
  FAILED: "bg-destructive-50 text-destructive-700 border-destructive-200",
};

const LABELS: Record<LabRunStatus, string> = {
  PENDING: "Queued",
  RUNNING: "Running",
  COMPLETED: "Completed",
  FAILED: "Failed",
};

export const RunStatusBadge: React.FC<{ status: LabRunStatus }> = ({ status }) => (
  <span
    className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full border ${STYLES[status]}`}
  >
    {LABELS[status]}
  </span>
);
