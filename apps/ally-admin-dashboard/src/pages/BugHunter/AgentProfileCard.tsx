import { FC, useState } from "react";

import { toast } from "sonner";

import { Button, ContentSwitcher, Switch, Tooltip } from "@ally-ui-mono/ui-shared";
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
import { LiveClock } from "./LiveClock";
import { SweepPanel } from "./SweepPanel";

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
 * ## What changed, and why the card got shorter
 *
 * This card used to be about 450px tall, which put the first actual bug below
 * the fold on a 1000×600 viewport: an admin arriving to act on "4 bugs are
 * waiting on your call" had to scroll past the sentence telling them so. Four
 * things were competing for that space and only one of them was load-bearing.
 *
 * - **The status line is promoted** above the role/team line. It is the single
 *   most informative sentence on the tab, and it was sitting third. Stacks'
 *   *Visual Hierarchy: Controlling Perception Order* is the argument: relative
 *   visibility should track importance, and ordering by "identity first" put
 *   the least actionable text at the top.
 * - **The working style stays open.** It is a state, not an action — whether
 *   Bug Hunter may merge its own fixes tonight is not worth a click to read.
 * - **The sweep controls fold** into `SweepPanel`. They are an action taken
 *   rarely, and they carried two paragraphs of explanation that only matter
 *   while you are using them.
 * - **The workload numbers left the card entirely.** They are a filter now, so
 *   they live next to the table they filter, as `LifecycleBucketChips`.
 * - **The self-introduction shows only while off duty.** Nobody who has used
 *   the feature needs re-introducing, and `AboutAgent` carries the same text at
 *   more length for anyone who does.
 *
 * The working-style control stays a confirm-before-flip control, because the
 * choice decides what happens to every bug the pipeline is about to find, and
 * landing on the wrong one shouldn't be a single misclick.
 */
export const AgentProfileCard: FC = () => {
  const { data: settings, isLoading, isError, fulfilledTimeStamp } = useGetBugHunterSettingsQuery();
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
  const [sweepOpen, setSweepOpen] = useState(false);

  const findings: BugFinding[] = findingsData?.items ?? [];
  const runs: BugHuntRun[] = runsData?.items ?? [];
  const liveRun = runs.find(run => run.status === BugHuntRunStatus.RUNNING) ?? null;
  const status = deriveAgentStatus({ mode: settings?.mode, findings, liveRun });
  const isOffDuty = settings?.mode === BugHunterMode.OFF;

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
            {!isLoading && !isError && fulfilledTimeStamp != null && (
              <LiveClock since={fulfilledTimeStamp} />
            )}
          </div>

          {/* What it is doing, in its own voice — the line this whole card
              exists to carry, and now the line directly under its name.
              Suppressed while settings are still loading rather than guessing
              at a status from a half-loaded page. */}
          {!isLoading && !isError && (
            <p className="text-sm text-typography-900 font-medium mt-1.5">{status.detail}</p>
          )}
          {isError && (
            <p className="text-sm text-destructive-600 mt-1.5">{en.bugHunter.updateFailed}</p>
          )}

          <p className="text-xs text-typography-600 mt-1">
            {en.bugHunter.agentRole} · {en.bugHunter.agentTeam}
          </p>

          {/* Only while nobody has put it on duty. At that moment there is
              nothing else on the page and an introduction is the most useful
              thing on it; once it is working, this is text you have read. */}
          {isOffDuty && (
            <p className="text-xs text-typography-600 mt-2 max-w-2xl">{en.bugHunter.agentIntro}</p>
          )}
        </div>

        {!isLoading && !isError && (
          <div className="shrink-0">
            <Button
              size="sm"
              kind="ghost"
              onClick={() => setSweepOpen(open => !open)}
              aria-expanded={sweepOpen}
              aria-controls="bug-hunter-sweep-panel"
            >
              {sweepOpen ? en.bugHunter.sweepPanelHide : en.bugHunter.sweepPanelShow}
            </Button>
          </div>
        )}
      </div>

      {sweepOpen && !isLoading && !isError && (
        <div id="bug-hunter-sweep-panel" className="mt-4">
          <SweepPanel mode={settings?.mode} />
        </div>
      )}

      {/* ── Working style: the kill switch, as a fact about this colleague ── */}
      {!isLoading && !isError && (
        <div className="mt-4 pt-4 border-t border-border-light flex flex-wrap items-center gap-3">
          <span className="text-sm text-typography-700">{en.bugHunter.modeLabel}</span>
          {/* Was a hard `w-[320px]`, which divided into three switches of about
              106px and clipped the middle label to "Checks w…" — so the tab
              could not tell you which working style you were on. Carbon splits
              a ContentSwitcher's width evenly across its switches, so the
              container has to fit the longest label, not the average one. */}
          <div className="w-full max-w-[28rem]">
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
      )}

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
