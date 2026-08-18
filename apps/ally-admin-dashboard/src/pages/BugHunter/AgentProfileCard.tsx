import { FC, useState } from "react";

import { toast } from "sonner";

import { ContentSwitcher, Switch, Tooltip } from "@ally-ui-mono/ui-shared";
import {
  useGetBugFindingsQuery,
  useGetBugHunterSettingsQuery,
  useGetBugHuntRunsQuery,
  useUpdateBugHunterSettingsMutation,
} from "@api";
import { TooltipIcon } from "@assets";
import { ActionConfirmationPopup } from "@components/action-confirmation-popup";
// Direct path rather than the @components barrel: several suites on this page
// mock that barrel wholesale, and reaching past it keeps the avatar real in
// them — the same treatment ErrorBoundary gets in BugFindingsTable.
import { AgentAvatar } from "@components/agent-avatar";
import { en } from "@constants";
import { BugFinding, BugHunterMode, BugHuntRun, BugHuntRunStatus } from "@types";

import { AgentStatusKind, deriveAgentStatus } from "./agentPersona";
import { AgentWorkloadStrip } from "./AgentWorkloadStrip";

const MODE_ORDER: BugHunterMode[] = [BugHunterMode.OFF, BugHunterMode.MANUAL, BugHunterMode.AI];

const MODE_LABELS: Record<BugHunterMode, string> = {
  [BugHunterMode.OFF]: en.bugHunter.modeOff,
  [BugHunterMode.MANUAL]: en.bugHunter.modeManual,
  [BugHunterMode.AI]: en.bugHunter.modeAi,
};

/**
 * One title per mode rather than one template with the mode's name dropped in.
 * "Switch Bug Hunter to Off duty?" is the sentence a template produces, and it
 * is not how anyone talks about sending someone off duty.
 */
const MODE_CONFIRM_TITLE: Record<BugHunterMode, string> = {
  [BugHunterMode.OFF]: en.bugHunter.modeOffConfirmTitle,
  [BugHunterMode.MANUAL]: en.bugHunter.modeManualConfirmTitle,
  [BugHunterMode.AI]: en.bugHunter.modeAiConfirmTitle,
};

const MODE_CONFIRM_BODY: Record<BugHunterMode, string> = {
  [BugHunterMode.OFF]: en.bugHunter.modeOffConfirmBody,
  [BugHunterMode.MANUAL]: en.bugHunter.modeManualConfirmBody,
  [BugHunterMode.AI]: en.bugHunter.modeAiConfirmBody,
};

const STATUS_PILL_STYLES: Record<AgentStatusKind, string> = {
  off_duty: "bg-neutral-100 text-typography-700 border-border-light",
  waiting_on_you: "bg-orange-50 text-orange-700 border-orange-200",
  problem: "bg-destructive-50 text-destructive-700 border-destructive-200",
  working: "bg-amber-50 text-amber-700 border-amber-200",
  on_shift: "bg-green-50 text-green-700 border-green-200",
};

/**
 * Bug Hunter's card: who it is, what it is doing right now, and how much rope
 * it has — the first thing on the tab, in place of a page heading.
 *
 * The working-style control lives inside the card on purpose. It is not a
 * global page setting; it is a fact about this one colleague, so it belongs
 * where the rest of their details are. It stays a confirm-before-flip control,
 * because the choice decides what happens to every bug the pipeline is about
 * to find, and landing on the wrong one shouldn't be a single misclick.
 */
export const AgentProfileCard: FC = () => {
  const { data: settings, isLoading, isError } = useGetBugHunterSettingsQuery();
  const [updateSettings, { isLoading: isUpdating }] = useUpdateBugHunterSettingsMutation();

  // Identical query args to BugFindingsTable's initial state and to
  // RunHistoryTable's, so these share one RTK Query cache entry each rather
  // than opening a second request per surface.
  const { data: findingsData } = useGetBugFindingsQuery(
    { status: "all", limit: 100 },
    { pollingInterval: 15_000 },
  );
  const { data: runsData } = useGetBugHuntRunsQuery(undefined, { pollingInterval: 10_000 });

  const [pendingMode, setPendingMode] = useState<BugHunterMode | null>(null);
  // Carbon's ContentSwitcher only reads `selectedIndex` on mount, not on every
  // re-render — clicking a tab and then cancelling would otherwise leave it
  // visually on the un-confirmed tab even though `settings.mode` never
  // changed. Bumping this on every cancel (and it changes anyway when a
  // confirmed mode change lands and `settings.mode` updates) forces a remount
  // so the switcher always redraws from the real, current mode.
  const [resetToken, setResetToken] = useState(0);

  const findings: BugFinding[] = findingsData?.items ?? [];
  const runs: BugHuntRun[] = runsData?.items ?? [];
  const liveRun = runs.find(run => run.status === BugHuntRunStatus.RUNNING) ?? null;
  const status = deriveAgentStatus({ mode: settings?.mode, findings, liveRun });

  const closePending = () => {
    setPendingMode(null);
    setResetToken(token => token + 1);
  };

  const handleConfirm = async () => {
    if (pendingMode === null) return;
    try {
      await updateSettings({ mode: pendingMode }).unwrap();
    } catch {
      toast.error(en.bugHunter.updateFailed);
    } finally {
      closePending();
    }
  };

  const currentIndex = settings ? MODE_ORDER.indexOf(settings.mode) : 0;

  return (
    <section className="border border-border-light rounded-lg bg-white p-5">
      <div className="flex items-start gap-4">
        <AgentAvatar
          size="lg"
          presence={status.kind}
          animate
          label={`${en.bugHunter.agentName}, ${en.bugHunter.agentRole}`}
        />

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl text-typography-900 font-secondary">
              {en.bugHunter.agentName}
            </h1>
            <span
              className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full border ${
                STATUS_PILL_STYLES[status.kind]
              }`}
            >
              {status.label}
            </span>
          </div>

          <p className="text-sm text-typography-700">
            {en.bugHunter.agentRole} · {en.bugHunter.agentTeam}
          </p>

          {/* What it is doing, in its own voice — the line this whole card
              exists to carry. Suppressed while settings are still loading
              rather than guessing at a status from a half-loaded page. */}
          {!isLoading && !isError && (
            <p className="text-sm text-typography-900 mt-3">{status.detail}</p>
          )}
          {isError && (
            <p className="text-sm text-destructive-600 mt-3">{en.bugHunter.updateFailed}</p>
          )}

          <p className="text-xs text-typography-600 mt-1">{en.bugHunter.agentIntro}</p>
        </div>
      </div>

      {/* ── Working style: the kill switch, as a fact about this colleague ── */}
      {!isLoading && !isError && (
        <div className="mt-5 pt-4 border-t border-border-light">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm text-typography-700">{en.bugHunter.modeLabel}</span>
            <div className="w-[320px]">
              <ContentSwitcher
                key={`${settings?.mode}-${resetToken}`}
                selectedIndex={currentIndex}
                onChange={({ index }: { index?: number }) => {
                  if (index === undefined) return;
                  const mode = MODE_ORDER[index];
                  if (mode !== settings?.mode) setPendingMode(mode);
                }}
                size="sm"
              >
                {MODE_ORDER.map(mode => (
                  <Switch key={mode} text={MODE_LABELS[mode]} disabled={isUpdating} />
                ))}
              </ContentSwitcher>
            </div>
            <Tooltip label={en.bugHunter.modeTooltip} align="right">
              <button type="button" className="cursor-pointer inline-flex items-center">
                <TooltipIcon />
              </button>
            </Tooltip>
            {settings?.updatedBy != null && (
              <span className="text-xs text-typography-500">
                {en.bugHunter.lastChangedBy.replace("{userId}", String(settings.updatedBy))}
              </span>
            )}
          </div>
          <p className="text-xs text-typography-600 mt-2">{en.bugHunter.agentHours}</p>
        </div>
      )}

      <div className="mt-5">
        <AgentWorkloadStrip findings={findings} />
      </div>

      {pendingMode !== null && (
        <ActionConfirmationPopup
          isOpen
          onClose={closePending}
          title={MODE_CONFIRM_TITLE[pendingMode]}
          description={MODE_CONFIRM_BODY[pendingMode]}
          primaryButton={{ label: en.bugHunter.modeConfirm, onClick: handleConfirm }}
          secondaryButton={{ label: en.bugHunter.cancel, onClick: closePending }}
        />
      )}
    </section>
  );
};
