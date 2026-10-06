import { FC, ReactNode } from "react";

import { useTranslation } from "react-i18next";

import type { StaffChatDto } from "@types";

import { LanguageChip, RiskBadge } from "./HelplineBadges";
import { useNow } from "../useNow";
import { formatDuration, secondsSince } from "../utils";

export interface TalkerAction {
  key: string;
  label: string;
  onSelect: () => void;
  destructive?: boolean;
}

const Row: FC<{ label: string; children: ReactNode }> = ({ label, children }) => (
  <div className="flex flex-col gap-0.5">
    <dt className="font-primary text-xs text-typography-700">{label}</dt>
    <dd className="font-primary text-sm text-typography-900">{children}</dd>
  </div>
);

/**
 * Who the talker is, as far as the helpline knows, and what can be done.
 * `actions` is a list on purpose: Transfer and Block arrive in a later pass
 * and slot in here without reshaping the panel.
 */
export const TalkerInfoPanel: FC<{ chat: StaffChatDto; actions: TalkerAction[] }> = ({
  chat,
  actions,
}) => {
  const { t } = useTranslation();
  const now = useNow(5000);
  const waitedSeconds = chat.claimedAt
    ? Math.max(0, Math.floor((Date.parse(chat.claimedAt) - Date.parse(chat.waitStartedAt)) / 1000))
    : secondsSince(chat.waitStartedAt, now);

  return (
    <div className="ph-no-capture flex flex-col gap-4 p-3" data-testid="talker-info">
      <h2 className="font-primary text-base font-semibold text-typography-900">
        {t("helplineWorkspace.info.title")}
      </h2>
      <dl className="flex flex-col gap-3">
        <Row label={t("helplineWorkspace.info.name")}>{chat.talker.displayName}</Row>
        <Row label={t("helplineWorkspace.info.language")}>
          <LanguageChip code={chat.talker.language} />
        </Row>
        <Row label={t("helplineWorkspace.info.waited")}>{formatDuration(waitedSeconds, t)}</Row>
        <Row label={t("helplineWorkspace.info.channel")}>
          {t(`helplineWorkspace.info.channels.${chat.channel}`)}
        </Row>
        <Row label={t("helplineWorkspace.info.consent")}>{chat.talker.consentVersion}</Row>
        <Row label={t("helplineWorkspace.info.connection")}>
          <span className="inline-flex items-center gap-1.5">
            <span
              aria-hidden="true"
              className={`h-2 w-2 rounded-full ${chat.talker.connected ? "bg-status-sageDot" : "bg-typography-400"}`}
            />
            {chat.talker.connected
              ? t("helplineWorkspace.info.connected")
              : t("helplineWorkspace.info.disconnected")}
          </span>
        </Row>
        <Row label={t("helplineWorkspace.info.risk")}>
          {chat.riskLevel === "NONE" ? (
            t("helplineWorkspace.risk.NONE")
          ) : (
            <RiskBadge level={chat.riskLevel} />
          )}
        </Row>
        {chat.listener && (
          <Row label={t("helplineWorkspace.info.listener")}>{chat.listener.displayName}</Row>
        )}
      </dl>

      {actions.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="font-primary text-xs font-medium uppercase tracking-wide text-typography-700">
            {t("helplineWorkspace.info.actions")}
          </h3>
          {actions.map(action => (
            <button
              key={action.key}
              type="button"
              onClick={action.onSelect}
              className={`min-h-[40px] rounded-full border px-4 font-primary text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 ${
                action.destructive
                  ? "border-destructive-300 text-destructive-700 hover:bg-destructive-50"
                  : "border-border-medium text-typography-900 hover:bg-background-secondary"
              }`}
            >
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
