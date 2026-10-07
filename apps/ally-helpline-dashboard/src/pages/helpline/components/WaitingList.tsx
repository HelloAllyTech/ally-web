import { FC } from "react";

import { useTranslation } from "react-i18next";

import type { HelplineMeDto, LobbyEntryDto } from "@types";

import { LanguageChip, RiskBadge } from "./HelplineBadges";
import { WithTooltip } from "./HelpTip";
import { useNow } from "../useNow";
import { claimBlockReason, formatDuration, secondsSince, sortWaiting } from "../utils";

interface WaitingListProps {
  entries: LobbyEntryDto[];
  me: HelplineMeDto;
  canClaim: boolean;
  claimingId: string | null;
  onClaim: (entry: LobbyEntryDto) => void;
}

const WaitingRow: FC<{
  entry: LobbyEntryDto;
  me: HelplineMeDto;
  canClaim: boolean;
  claiming: boolean;
  now: number;
  onClaim: (entry: LobbyEntryDto) => void;
}> = ({ entry, me, canClaim, claiming, now, onClaim }) => {
  const { t } = useTranslation();
  const block = claimBlockReason(entry, me, canClaim);
  const blockText =
    block === "away"
      ? t("helplineWorkspace.lobby.claimDisabledAway")
      : block === "capacity"
        ? t("helplineWorkspace.lobby.claimDisabledCapacity", {
            max: Math.min(me.profile.maxConcurrentChats, me.orgMaxConcurrentPerListener),
          })
        : block === "permission"
          ? t("helplineWorkspace.lobby.claimDisabledPermission")
          : block === "targeted"
            ? t("helplineWorkspace.lobby.claimDisabledTargeted")
            : null;
  const disabled = Boolean(block) || claiming;

  return (
    <li
      className={`flex flex-col gap-2 rounded-xl border bg-white p-3 sm:flex-row sm:items-center sm:justify-between ${
        entry.riskLevel === "HIGH" ? "border-status-alarmDot" : "border-border-light"
      }`}
      data-testid={`waiting-${entry.chatId}`}
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="min-w-0 max-w-full truncate font-primary text-base font-medium text-typography-900">
            {entry.displayName}
          </span>
          <LanguageChip code={entry.language} />
          <RiskBadge level={entry.riskLevel} />
          {entry.kind === "TRANSFER" && (
            <span className="inline-flex items-center rounded-full bg-status-mauveBg px-2 py-0.5 font-primary text-xs text-status-mauveFg">
              {t("helplineWorkspace.lobby.transfer")}
              {entry.transferFromName
                ? ` · ${t("helplineWorkspace.lobby.transferFrom", { name: entry.transferFromName })}`
                : ""}
            </span>
          )}
          {entry.targetListenerId !== null && entry.targetListenerId === me.userId && (
            <span className="inline-flex items-center rounded-full bg-status-sageBg px-2 py-0.5 font-primary text-xs text-status-sageFg">
              {t("helplineWorkspace.lobby.passedToYou")}
            </span>
          )}
        </div>
        <p className="mt-0.5 font-primary text-sm text-typography-700">
          {t("helplineWorkspace.lobby.waitingFor", {
            time: formatDuration(secondsSince(entry.waitStartedAt, now), t),
          })}
        </p>
        <p className="mt-1 line-clamp-2 break-words font-primary text-sm text-typography-800">
          {entry.preview || (
            <span className="italic text-typography-600">
              {t("helplineWorkspace.lobby.noPreview")}
            </span>
          )}
        </p>
      </div>
      <WithTooltip label={blockText}>
        <button
          type="button"
          aria-disabled={disabled}
          onClick={() => {
            if (!disabled) onClaim(entry);
          }}
          className={`inline-flex min-h-[40px] flex-shrink-0 items-center justify-center rounded-full px-5 font-primary text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 ${
            disabled
              ? "cursor-default bg-primary-500/40 text-white"
              : "bg-primary-500 text-white hover:bg-primary-600"
          }`}
        >
          {claiming ? t("helplineWorkspace.lobby.claiming") : t("helplineWorkspace.lobby.claim")}
        </button>
      </WithTooltip>
    </li>
  );
};

/** Who is waiting, most urgent first: priority (HIGH risk), then longest wait. */
export const WaitingList: FC<WaitingListProps> = ({
  entries,
  me,
  canClaim,
  claimingId,
  onClaim,
}) => {
  const now = useNow(1000);
  return (
    <ul className="ph-no-capture flex flex-col gap-2" data-testid="waiting-list">
      {sortWaiting(entries).map(entry => (
        <WaitingRow
          key={entry.chatId}
          entry={entry}
          me={me}
          canClaim={canClaim}
          claiming={claimingId === entry.chatId}
          now={now}
          onClaim={onClaim}
        />
      ))}
    </ul>
  );
};
