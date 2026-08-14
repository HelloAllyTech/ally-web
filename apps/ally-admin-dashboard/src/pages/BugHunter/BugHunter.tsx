import { FC, useState } from "react";

import { toast } from "sonner";

import {
  Accordion,
  AccordionItem,
  ContentSwitcher,
  Switch,
  Tooltip,
} from "@ally-ui-mono/ui-shared";
import { useGetBugHunterSettingsQuery, useUpdateBugHunterSettingsMutation } from "@api";
import { TooltipIcon } from "@assets";
import { ActionConfirmationPopup } from "@components/action-confirmation-popup";
import { en } from "@constants";
import { BugHunterMode } from "@types";

import { BugFindingsTable } from "./BugFindingsTable";
import { RunHistoryTable } from "./RunHistoryTable";

const MODE_ORDER: BugHunterMode[] = [BugHunterMode.OFF, BugHunterMode.MANUAL, BugHunterMode.AI];

const MODE_LABELS: Record<BugHunterMode, string> = {
  [BugHunterMode.OFF]: en.bugHunter.modeOff,
  [BugHunterMode.MANUAL]: en.bugHunter.modeManual,
  [BugHunterMode.AI]: en.bugHunter.modeAi,
};

const MODE_CONFIRM_BODY: Record<BugHunterMode, string> = {
  [BugHunterMode.OFF]: en.bugHunter.modeOffConfirmBody,
  [BugHunterMode.MANUAL]: en.bugHunter.modeManualConfirmBody,
  [BugHunterMode.AI]: en.bugHunter.modeAiConfirmBody,
};

/**
 * A confirm-before-flip switcher, not a bare control: mode changes what
 * happens to every bug the pipeline is about to find, so accidentally
 * landing on the wrong one shouldn't be one misclick away.
 */
export const BugHunter: FC = () => {
  const { data: settings, isLoading, isError } = useGetBugHunterSettingsQuery();
  const [updateSettings, { isLoading: isUpdating }] = useUpdateBugHunterSettingsMutation();
  const [pendingMode, setPendingMode] = useState<BugHunterMode | null>(null);
  // Carbon's ContentSwitcher only reads `selectedIndex` on mount, not on every
  // re-render — clicking a tab and then cancelling would otherwise leave it
  // visually on the un-confirmed tab even though `settings.mode` never
  // changed. Bumping this on every cancel (and it changes anyway when a
  // confirmed mode change lands and `settings.mode` updates) forces a remount
  // so the switcher always redraws from the real, current mode.
  const [resetToken, setResetToken] = useState(0);

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
    <div className="h-full font-primary flex flex-col overflow-y-auto custom-scrollbar">
      <div>
        <h1 className="text-2xl text-typography-900 font-secondary">{en.bugHunter.heading}</h1>
        <p className="text-sm text-typography-700 mt-1">{en.bugHunter.subtitle}</p>
      </div>

      {/* ── Kill switch: three-way mode ─────────────────────────────────────── */}
      <div className="flex items-center gap-2 mt-6 shrink-0">
        {isLoading ? (
          <p className="text-sm text-typography-600">…</p>
        ) : isError ? (
          <p className="text-sm text-destructive-600">{en.bugHunter.updateFailed}</p>
        ) : (
          <>
            <span className="text-sm text-typography-700">{en.bugHunter.modeLabel}</span>
            <div className="w-[220px]">
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
          </>
        )}
      </div>

      {/* ── FAQ ─────────────────────────────────────────────────────────── */}
      <div className="mt-6 shrink-0 max-w-3xl">
        <h2 className="text-sm font-semibold text-typography-900 mb-2">{en.bugHunter.faqTitle}</h2>
        <Accordion size="sm">
          <AccordionItem title={en.bugHunter.faqWhatTitle}>
            <p className="text-sm text-typography-700">{en.bugHunter.faqWhatBody}</p>
          </AccordionItem>
          <AccordionItem title={en.bugHunter.faqModesTitle}>
            <p className="text-sm text-typography-700">{en.bugHunter.faqModesBody}</p>
          </AccordionItem>
          <AccordionItem title={en.bugHunter.faqTrivialTitle}>
            <p className="text-sm text-typography-700">{en.bugHunter.faqTrivialBody}</p>
          </AccordionItem>
          <AccordionItem title={en.bugHunter.faqReviewTitle}>
            <p className="text-sm text-typography-700">{en.bugHunter.faqReviewBody}</p>
          </AccordionItem>
          <AccordionItem title={en.bugHunter.faqEscalationTitle}>
            <p className="text-sm text-typography-700">{en.bugHunter.faqEscalationBody}</p>
          </AccordionItem>
          <AccordionItem title={en.bugHunter.faqReposTitle}>
            <p className="text-sm text-typography-700">{en.bugHunter.faqReposBody}</p>
          </AccordionItem>
          <AccordionItem title={en.bugHunter.faqCostTitle}>
            <p className="text-sm text-typography-700">{en.bugHunter.faqCostBody}</p>
          </AccordionItem>
          <AccordionItem title={en.bugHunter.faqOffTitle}>
            <p className="text-sm text-typography-700">{en.bugHunter.faqOffBody}</p>
          </AccordionItem>
        </Accordion>
      </div>

      {/* ── The comprehensive bug table ─────────────────────────────────────── */}
      <div className="mt-8 shrink-0">
        <BugFindingsTable />
      </div>

      {/* ── Run history + live run ──────────────────────────────────────── */}
      <div className="mt-8 flex-1">
        <RunHistoryTable />
      </div>

      {pendingMode !== null && (
        <ActionConfirmationPopup
          isOpen
          onClose={closePending}
          title={en.bugHunter.modeConfirmTitle.replace("{mode}", MODE_LABELS[pendingMode])}
          description={MODE_CONFIRM_BODY[pendingMode]}
          primaryButton={{ label: en.bugHunter.modeConfirm, onClick: handleConfirm }}
          secondaryButton={{ label: en.bugHunter.cancel, onClick: closePending }}
        />
      )}
    </div>
  );
};
