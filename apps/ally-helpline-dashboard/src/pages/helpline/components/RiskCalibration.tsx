import { FC, useState } from "react";

import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { useGetHelplineRiskFlagsQuery } from "@api/helpline";
import { buildHelplineChatRoute } from "@constants/routes";
import type { RiskFlagOutcome, RiskFlagsParams } from "@types";

import { RiskBadge } from "./HelplineBadges";
import { HelpTip } from "./HelpTip";
import {
  EmptyBox,
  LoadFailed,
  PageSection,
  StatTile,
  tableClass,
  tdClass,
  thClass,
  theadClass,
} from "./MonitorParts";

const OUTCOMES: RiskFlagOutcome[] = ["UNREVIEWED", "CONFIRMED", "FALSE_POSITIVE"];
const SOURCES = ["KEYWORD", "CLASSIFIER"] as const;
const WINDOWS: RiskFlagsParams["days"][] = [7, 30];

/** 0.7 → "0.70": the threshold reads the way the admin console sets it. */
const formatConfidence = (value: number) =>
  typeof value === "number" && Number.isFinite(value) ? value.toFixed(2) : "—";

/**
 * Risk calibration: how this org's risk flags turned out, as reviewed by the
 * listeners who acknowledged them. A tuning aid for the org's risk threshold
 * — counts and outcomes, never what the talker wrote: the rows carry live
 * signals (the server audits the read) but this view never renders them.
 * The classifier's outcomes by confidence band sit beside the org's current
 * threshold, which is what a threshold change would move.
 */
export const RiskCalibration: FC = () => {
  const { t, i18n } = useTranslation();
  const [days, setDays] = useState<RiskFlagsParams["days"]>(7);
  const { data, isLoading, isError, refetch } = useGetHelplineRiskFlagsQuery({ days });
  const dateFormat = new Intl.DateTimeFormat(i18n.language || "en", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  return (
    <div className="flex flex-col gap-5" data-testid="risk-calibration">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1">
          <h2 className="font-primary text-lg font-medium text-typography-900">
            {t("helplineWorkspace.calibration.title")}
          </h2>
          <HelpTip
            label={t("helplineWorkspace.calibration.explainer")}
            ariaLabel={t("helplineWorkspace.calibration.explainerLabel")}
          />
        </div>
        <div
          role="radiogroup"
          aria-label={t("helplineWorkspace.calibration.windowLabel")}
          className="inline-flex rounded-full border border-border-medium p-0.5"
        >
          {WINDOWS.map(window => (
            <button
              key={window}
              type="button"
              role="radio"
              aria-checked={days === window}
              onClick={() => setDays(window)}
              className={`min-h-[32px] rounded-full px-3 font-primary text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 ${
                days === window
                  ? "bg-typography-900 text-white"
                  : "text-typography-800 hover:bg-background-secondary"
              }`}
            >
              {t("helplineWorkspace.calibration.window", { count: window })}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <p role="status" className="font-primary text-sm text-typography-700">
          {t("helplineWorkspace.gate.loading")}
        </p>
      ) : isError || !data ? (
        <LoadFailed
          message={t("helplineWorkspace.calibration.loadFailed")}
          onRetry={() => void refetch()}
        />
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            <PageSection
              id="calibration-outcome"
              title={t("helplineWorkspace.calibration.byOutcome")}
            >
              <div className="grid grid-cols-3 gap-2">
                {OUTCOMES.map(outcome => (
                  <StatTile
                    key={outcome}
                    label={t(`helplineWorkspace.calibration.outcome.${outcome}`)}
                    value={data.counts?.[outcome] ?? 0}
                    testId={`calibration-outcome-${outcome}`}
                  />
                ))}
              </div>
            </PageSection>
            <PageSection
              id="calibration-source"
              title={t("helplineWorkspace.calibration.bySource")}
            >
              <div className="grid grid-cols-2 gap-2">
                {SOURCES.map(source => {
                  const counts = data.bySource?.[source];
                  return (
                    <div key={source} className="flex flex-col gap-1">
                      <StatTile
                        label={t(`helplineWorkspace.riskBanner.source.${source}`)}
                        value={counts?.total ?? 0}
                        testId={`calibration-source-${source}`}
                      />
                      <p
                        className="px-1 font-primary text-xs text-typography-700"
                        data-testid={`calibration-source-${source}-outcomes`}
                      >
                        {t("helplineWorkspace.calibration.sourceOutcomes", {
                          confirmed: counts?.CONFIRMED ?? 0,
                          falsePositive: counts?.FALSE_POSITIVE ?? 0,
                          unreviewed: counts?.UNREVIEWED ?? 0,
                        })}
                      </p>
                    </div>
                  );
                })}
              </div>
            </PageSection>
          </div>

          {(data.classifierByConfidence?.length ?? 0) > 0 && (
            <PageSection
              id="calibration-confidence"
              title={t("helplineWorkspace.calibration.byConfidence")}
            >
              <p className="font-primary text-sm text-typography-700">
                {t("helplineWorkspace.calibration.byConfidenceHint", {
                  threshold: formatConfidence(data.riskHighConfidence),
                })}
              </p>
              <div className="overflow-x-auto rounded-xl border border-border-light">
                <table className={`${tableClass} min-w-[520px]`} data-testid="calibration-bands">
                  <thead className={theadClass}>
                    <tr>
                      <th scope="col" className={thClass}>
                        {t("helplineWorkspace.calibration.columns.band")}
                      </th>
                      {OUTCOMES.map(outcome => (
                        <th key={outcome} scope="col" className={thClass}>
                          {t(`helplineWorkspace.calibration.outcome.${outcome}`)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.classifierByConfidence.map(band => {
                      const atThreshold =
                        data.riskHighConfidence >= band.from && data.riskHighConfidence < band.to;
                      return (
                        <tr
                          key={`${band.from}-${band.to}`}
                          className="border-t border-border-light"
                        >
                          <th scope="row" className={`${tdClass} text-left font-normal`}>
                            <span className="tabular-nums text-typography-900">
                              {t("helplineWorkspace.calibration.band", {
                                from: formatConfidence(band.from),
                                to: formatConfidence(band.to),
                              })}
                            </span>
                            {atThreshold && (
                              <span className="ml-2 rounded-full bg-background-secondary px-2 py-0.5 text-xs text-typography-800">
                                {t("helplineWorkspace.calibration.yourThreshold")}
                              </span>
                            )}
                          </th>
                          {OUTCOMES.map(outcome => (
                            <td
                              key={outcome}
                              className={`${tdClass} tabular-nums text-typography-800`}
                            >
                              {band[outcome] ?? 0}
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </PageSection>
          )}

          <PageSection id="calibration-flags" title={t("helplineWorkspace.calibration.listTitle")}>
            {data.items.length === 0 ? (
              <EmptyBox testId="calibration-empty">
                {t("helplineWorkspace.calibration.empty", { count: days })}
              </EmptyBox>
            ) : (
              <div className="ph-no-capture overflow-x-auto rounded-xl border border-border-light">
                <table className={`${tableClass} min-w-[760px]`}>
                  <thead className={theadClass}>
                    <tr>
                      <th scope="col" className={thClass}>
                        {t("helplineWorkspace.calibration.columns.date")}
                      </th>
                      <th scope="col" className={thClass}>
                        {t("helplineWorkspace.calibration.columns.level")}
                      </th>
                      <th scope="col" className={thClass}>
                        {t("helplineWorkspace.calibration.columns.source")}
                      </th>
                      <th scope="col" className={thClass}>
                        {t("helplineWorkspace.calibration.columns.confidence")}
                      </th>
                      <th scope="col" className={thClass}>
                        {t("helplineWorkspace.calibration.columns.hits")}
                      </th>
                      <th scope="col" className={thClass}>
                        {t("helplineWorkspace.calibration.columns.outcome")}
                      </th>
                      <th scope="col" className={thClass}>
                        {t("helplineWorkspace.calibration.columns.note")}
                      </th>
                      <th scope="col" className={thClass}>
                        <span className="sr-only">
                          {t("helplineWorkspace.calibration.columns.chat")}
                        </span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.items.map(flag => (
                      <tr key={flag.id} className="border-t border-border-light">
                        <td className={`${tdClass} whitespace-nowrap text-typography-800`}>
                          {dateFormat.format(new Date(flag.createdAt))}
                        </td>
                        <td className={tdClass}>
                          <RiskBadge level={flag.level} />
                        </td>
                        <td className={`${tdClass} text-typography-800`}>
                          {t(`helplineWorkspace.riskBanner.source.${flag.source}`)}
                        </td>
                        <td className={`${tdClass} tabular-nums text-typography-800`}>
                          {typeof flag.confidence === "number"
                            ? t("helplineWorkspace.calibration.percent", {
                                value: Math.round(flag.confidence * 100),
                              })
                            : "—"}
                        </td>
                        <td
                          className={`${tdClass} tabular-nums text-typography-800`}
                          data-testid="calibration-hits"
                        >
                          {flag.hitCount ?? 1}
                        </td>
                        <td className={`${tdClass} text-typography-800`}>
                          {t(`helplineWorkspace.calibration.outcome.${flag.outcome}`)}
                        </td>
                        <td className={`${tdClass} max-w-[280px] break-words text-typography-800`}>
                          {flag.outcomeNote || "—"}
                        </td>
                        <td className={tdClass}>
                          <Link
                            to={buildHelplineChatRoute(flag.chatId)}
                            className="whitespace-nowrap font-medium text-typography-900 underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                          >
                            {t("helplineWorkspace.calibration.openChat")}
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </PageSection>
        </>
      )}
    </div>
  );
};
