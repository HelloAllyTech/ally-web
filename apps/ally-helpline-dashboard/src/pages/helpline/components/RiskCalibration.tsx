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

/**
 * Risk calibration: how this org's risk flags turned out, as reviewed by the
 * listeners who acknowledged them. A tuning aid for the org's risk threshold
 * — counts and outcomes, never what the talker wrote (no `signal` here).
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
                {SOURCES.map(source => (
                  <StatTile
                    key={source}
                    label={t(`helplineWorkspace.riskBanner.source.${source}`)}
                    value={data.bySource?.[source] ?? 0}
                    testId={`calibration-source-${source}`}
                  />
                ))}
              </div>
            </PageSection>
          </div>

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
