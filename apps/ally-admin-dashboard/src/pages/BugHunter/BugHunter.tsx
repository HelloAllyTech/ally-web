import { FC, useState } from "react";

import { toast } from "sonner";

import { Accordion, AccordionItem, CarbonToggle as Toggle, Tooltip } from "@ally-ui-mono/ui-shared";
import { useGetBugHunterSettingsQuery, useUpdateBugHunterSettingsMutation } from "@api";
import { TooltipIcon } from "@assets";
import { ActionConfirmationPopup } from "@components/action-confirmation-popup";
import { en, ROUTES } from "@constants";

import { RunHistoryTable } from "./RunHistoryTable";

/**
 * A confirm-before-flip toggle, not a bare switch: the plan calls this a true
 * kill switch (off blocks every trigger, nightly and on-demand alike), and
 * accidentally leaving it off — or on — shouldn't be one misclick away.
 */
export const BugHunter: FC = () => {
  const { data: settings, isLoading, isError } = useGetBugHunterSettingsQuery();
  const [updateSettings, { isLoading: isUpdating }] = useUpdateBugHunterSettingsMutation();
  const [pendingValue, setPendingValue] = useState<boolean | null>(null);

  const handleConfirm = async () => {
    if (pendingValue === null) return;
    try {
      await updateSettings({ enabled: pendingValue }).unwrap();
    } catch {
      toast.error(en.bugHunter.updateFailed);
    } finally {
      setPendingValue(null);
    }
  };

  return (
    <div className="h-full font-primary flex flex-col overflow-y-auto custom-scrollbar">
      <div>
        <h1 className="text-2xl text-typography-900 font-secondary">{en.bugHunter.heading}</h1>
        <p className="text-sm text-typography-700 mt-1">{en.bugHunter.subtitle}</p>
      </div>

      {/* ── Kill switch ─────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 mt-6 shrink-0">
        {isLoading ? (
          <p className="text-sm text-typography-600">…</p>
        ) : isError ? (
          <p className="text-sm text-destructive-600">{en.bugHunter.updateFailed}</p>
        ) : (
          <>
            <Toggle
              id="bug-hunter-enabled"
              size="md"
              labelText=""
              labelA={en.bugHunter.toggleLabelOff}
              labelB={en.bugHunter.toggleLabelOn}
              toggled={settings?.enabled ?? false}
              disabled={isUpdating}
              onToggle={() => setPendingValue(!(settings?.enabled ?? false))}
            />
            <Tooltip label={en.bugHunter.toggleTooltip} align="right">
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
          <AccordionItem title={en.bugHunter.faqTrivialTitle}>
            <p className="text-sm text-typography-700">{en.bugHunter.faqTrivialBody}</p>
          </AccordionItem>
          <AccordionItem title={en.bugHunter.faqReviewTitle}>
            <p className="text-sm text-typography-700">
              {en.bugHunter.faqReviewBody.replace(
                "{suggestionsTabLink}",
                "Analytics → Suggestions",
              )}{" "}
              <a href={ROUTES.ANALYTICS} className="text-primary-600 underline">
                Open Suggestions
              </a>
            </p>
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

      {/* ── Run history + live run ──────────────────────────────────────── */}
      <div className="mt-8 flex-1">
        <RunHistoryTable />
      </div>

      {pendingValue !== null && (
        <ActionConfirmationPopup
          isOpen
          onClose={() => setPendingValue(null)}
          title={
            pendingValue ? en.bugHunter.toggleOnConfirmTitle : en.bugHunter.toggleOffConfirmTitle
          }
          description={
            pendingValue ? en.bugHunter.toggleOnConfirmBody : en.bugHunter.toggleOffConfirmBody
          }
          primaryButton={{
            label: pendingValue ? en.bugHunter.toggleOnConfirm : en.bugHunter.toggleOffConfirm,
            onClick: handleConfirm,
          }}
          secondaryButton={{ label: en.bugHunter.cancel, onClick: () => setPendingValue(null) }}
        />
      )}
    </div>
  );
};
