import { FC } from "react";

import { useTranslation } from "react-i18next";

import { ARTIFACT_VERDICT_TOKENS } from "@ally-ui-mono/ui-shared";
import { AnnotationAttemptResult } from "@types";

interface AnnotationResultPanelProps {
  result: AnnotationAttemptResult;
}

/**
 * Score header for a graded attempt. The tally deliberately shows "missed"
 * only once the key is revealed — found + missed is the number of marks in the
 * key, and handing that over mid-run turns the next attempt into a counting
 * exercise instead of a reading one.
 */
export const AnnotationResultPanel: FC<AnnotationResultPanelProps> = ({ result }) => {
  const { t } = useTranslation();
  const passed = result.passed;

  return (
    <div className="rounded-2xl border border-border-light bg-white p-5 shadow-sm">
      <div className="mb-2 flex flex-wrap items-baseline gap-3">
        <span className="text-2xl font-semibold text-typography-900 tabular-nums">
          {result.scorePct}%
        </span>
        <span
          className="text-sm font-medium"
          style={{
            color: passed
              ? ARTIFACT_VERDICT_TOKENS.found.text
              : ARTIFACT_VERDICT_TOKENS.missed.text,
          }}
        >
          {passed
            ? t("tracks2.annotation.passed", { passScore: result.passScore })
            : t("tracks2.annotation.notYet", { passScore: result.passScore })}
        </span>
      </div>

      <div className="relative mb-4 h-2 overflow-hidden rounded-full bg-neutral-100">
        <div
          className="h-full rounded-full transition-[width]"
          style={{
            width: `${Math.min(100, result.scorePct)}%`,
            background: passed
              ? ARTIFACT_VERDICT_TOKENS.found.border
              : ARTIFACT_VERDICT_TOKENS.missed.border,
          }}
        />
      </div>

      <p className="m-0 text-sm text-typography-600">
        {t("tracks2.annotation.tally.found", { count: result.found })}
        {result.revealed && result.missed !== undefined && (
          <> · {t("tracks2.annotation.tally.missed", { count: result.missed })}</>
        )}
        {result.notHere > 0 && (
          <> · {t("tracks2.annotation.tally.notHere", { count: result.notHere })}</>
        )}
      </p>

      {!result.revealed && (
        <p className="m-0 mt-2 text-xs text-typography-500">{t("tracks2.annotation.keyHidden")}</p>
      )}
    </div>
  );
};
