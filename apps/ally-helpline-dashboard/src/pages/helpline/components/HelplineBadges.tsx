import { FC } from "react";

import { useTranslation } from "react-i18next";

import { HelplineSocketStatus } from "@hooks/useHelplineSocket";
import type { HelplineRiskLevel } from "@types";

import { languageName } from "../../helpline-talk/components/ConsentScreen";

const RISK_CLASSES: Record<Exclude<HelplineRiskLevel, "NONE">, string> = {
  HIGH: "bg-status-alarmBg text-status-alarmFg border-status-alarmDot",
  ELEVATED: "bg-status-ochreBg text-status-ochreFg border-status-ochreDot",
};

/** HIGH / ELEVATED risk; nothing at all for NONE. */
export const RiskBadge: FC<{ level: HelplineRiskLevel; className?: string }> = ({
  level,
  className = "",
}) => {
  const { t } = useTranslation();
  if (level === "NONE") return null;
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 font-primary text-xs font-medium ${RISK_CLASSES[level]} ${className}`}
      data-testid={`risk-badge-${level}`}
    >
      {t(`helplineWorkspace.risk.${level}`)}
    </span>
  );
};

export const LanguageChip: FC<{ code: string }> = ({ code }) => (
  <span
    lang={code}
    className="inline-flex items-center rounded-full bg-background-secondary px-2 py-0.5 font-primary text-xs text-typography-800"
  >
    {languageName(code)}
  </span>
);

/** "Live" / "Reconnecting…" — the listener should know when updates have paused. */
export const ConnectionPill: FC<{ status: HelplineSocketStatus }> = ({ status }) => {
  const { t } = useTranslation();
  const live = status === HelplineSocketStatus.CONNECTED;
  const label = live
    ? t("helplineWorkspace.connection.connected")
    : status === HelplineSocketStatus.CONNECTING || status === HelplineSocketStatus.IDLE
      ? t("helplineWorkspace.connection.connecting")
      : t("helplineWorkspace.connection.reconnecting");
  return (
    <span
      role="status"
      title={live ? undefined : t("helplineWorkspace.connection.hint")}
      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 font-primary text-xs ${
        live ? "bg-status-sageBg text-status-sageFg" : "bg-status-ochreBg text-status-ochreFg"
      }`}
      data-testid="helpline-connection"
    >
      <span
        aria-hidden="true"
        className={`h-1.5 w-1.5 rounded-full ${live ? "bg-status-sageDot" : "bg-status-ochreDot"}`}
      />
      {label}
    </span>
  );
};
