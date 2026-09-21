import React from "react";

import { Tooltip } from "@ally-ui-mono/ui-shared";
import { en } from "@constants";
import { ReportedBugContext } from "@types";

/**
 * The keys the three reporting clients actually send, in the order a reader
 * wants them. Anything else in the blob still renders, below these and under its
 * own raw key — the column is free-form jsonb written by helpline, mobile and
 * web independently and validated by nobody, so a hard-coded list that silently
 * dropped an unknown key would lose exactly the field somebody added last week.
 */
const KNOWN_CONTEXT_LABELS: Record<string, string> = {
  screen: en.bugHunter.reporterContextScreen,
  device: en.bugHunter.reporterContextDevice,
  os: en.bugHunter.reporterContextOs,
  appVersion: en.bugHunter.reporterContextAppVersion,
  clientTimestamp: en.bugHunter.reporterContextClientTimestamp,
};

const renderValue = (value: unknown): string => {
  if (value == null) return "—";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return JSON.stringify(value);
};

/**
 * Who reported this bug, and what their client quietly captured while they did.
 *
 * Rendered only for a human-filed bug. It exists because bugs no longer appear
 * on the roadmap board: the reporter, their tenant and the captured route/device
 * were written to the roadmap row and displayed on that board, so without this
 * they became data nobody could see.
 *
 * The context was captured SILENTLY — the reporter typed one free-text sentence
 * and never saw any of this — which is the reason it is presented as evidence
 * beside their words rather than as part of them.
 */
export const ReportedBugPanel: React.FC<{ report: ReportedBugContext }> = ({ report }) => {
  const context = report.reporterContext ?? {};
  const knownKeys = Object.keys(KNOWN_CONTEXT_LABELS).filter(key => key in context);
  const otherKeys = Object.keys(context).filter(key => !(key in KNOWN_CONTEXT_LABELS));
  const isConsumer = report.reporterSource === "consumer";

  return (
    <div>
      <h3 className="text-xs font-semibold text-typography-700 mb-1">
        {en.bugHunter.reporterSectionTitle}
      </h3>

      <div className="flex flex-wrap items-center gap-2 text-sm text-typography-900">
        <Tooltip
          label={
            isConsumer ? en.bugHunter.reporterConsumerTooltip : en.bugHunter.reporterStaffTooltip
          }
          align="top"
        >
          <span className="inline-flex items-center rounded bg-purple-50 px-1.5 text-[10px] font-semibold text-purple-700 cursor-help">
            {isConsumer ? en.bugHunter.reporterConsumer : en.bugHunter.reporterStaff}
          </span>
        </Tooltip>
        <span>{report.reportedByName ?? en.bugHunter.reporterUnknown}</span>
        <span className="text-xs text-typography-500">
          · {new Date(report.reportedAt).toLocaleString()}
        </span>
        {report.tenantId && (
          <span className="text-xs text-typography-500">
            · {en.bugHunter.reporterTenant}: {report.tenantId}
          </span>
        )}
      </div>

      <p className="text-xs font-semibold text-typography-600 mt-2">
        {en.bugHunter.reporterContextTitle}
      </p>
      {knownKeys.length === 0 && otherKeys.length === 0 ? (
        <p className="text-xs text-typography-500">{en.bugHunter.reporterContextEmpty}</p>
      ) : (
        <dl className="mt-1 grid grid-cols-[auto,1fr] gap-x-3 gap-y-0.5 text-xs">
          {knownKeys.map(key => (
            <React.Fragment key={key}>
              <dt className="text-typography-500">{KNOWN_CONTEXT_LABELS[key]}</dt>
              <dd className="text-typography-800 break-words">{renderValue(context[key])}</dd>
            </React.Fragment>
          ))}
          {otherKeys.map(key => (
            <React.Fragment key={key}>
              <dt className="text-typography-500">{key}</dt>
              <dd className="text-typography-800 break-words">{renderValue(context[key])}</dd>
            </React.Fragment>
          ))}
        </dl>
      )}
    </div>
  );
};
