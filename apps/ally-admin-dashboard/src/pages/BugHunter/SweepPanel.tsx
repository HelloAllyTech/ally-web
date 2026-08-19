import { FC, useState } from "react";

import { toast } from "sonner";

import { Button, Select, SelectItem, Tooltip } from "@ally-ui-mono/ui-shared";
import { useTriggerBugHuntSweepMutation } from "@api";
import { TooltipIcon } from "@assets";
import { ActionConfirmationPopup } from "@components/action-confirmation-popup";
import { en } from "@constants";
import { BugHunterMode } from "@types";

/**
 * Repos an admin can sweep on demand. Mirrors ally-be's `BUG_HUNT_REPOS`, which
 * remains the authority — it rejects anything not in its own map, so a drift
 * here surfaces as a clear 400 rather than a silent misfire. Held as a literal
 * rather than fetched because it changes about once a year, and a control that
 * cannot be used until a round-trip lands is worse than one that occasionally
 * needs a line added.
 */
export const SWEEPABLE_REPOS = [
  "ally-be",
  "ally-web",
  "ally-ai",
  "ally-ai-learn",
  "ally-mobile",
] as const;

export interface SweepPanelProps {
  /** Undefined while settings are in flight; the panel's own caller gates on that. */
  mode?: BugHunterMode;
}

/**
 * Asking for a sweep now, rather than waiting for tonight.
 *
 * ## Why this is behind a disclosure and the working style is not
 *
 * Both used to sit permanently open on the profile card, and between them they
 * cost four controls, two help icons and three explanatory paragraphs of
 * vertical space — enough that the first actual bug on the page fell below the
 * fold. Something had to fold, and these two are not equally important.
 *
 * The working style is a *state* an admin needs to read at a glance: whether
 * Bug Hunter is allowed to merge its own fixes tonight is not a fact worth
 * hiding behind a click, so its switcher stays open on the card.
 *
 * A sweep is an *action*, taken rarely — after a release, or when someone has
 * reported something worth chasing now. Its controls carry no state worth
 * reading when you are not using them, so they collapse. This is the
 * "show core capabilities first, reveal advanced features progressively" split
 * from Stacks' *Progressive Disclosure and Contextual Relevance in Agent
 * Interfaces*, applied to a two-control card.
 */
export const SweepPanel: FC<SweepPanelProps> = ({ mode }) => {
  const [triggerSweep, { isLoading: isSweeping }] = useTriggerBugHuntSweepMutation();
  const [sweepRepo, setSweepRepo] = useState<string>(SWEEPABLE_REPOS[0]);
  const [sweepDeep, setSweepDeep] = useState(false);
  const [sweepPending, setSweepPending] = useState(false);

  const handleSweep = async () => {
    try {
      const result = await triggerSweep({ repo: sweepRepo, deep: sweepDeep }).unwrap();
      // Off duty is a recorded skip, not a failure — the backend writes a
      // skipped_disabled run. Saying "couldn't start" for a switch the admin set
      // themselves would read as a bug in the tab.
      if (result && "skipped" in result) toast.info(en.bugHunter.sweepSkipped);
      else toast.success(en.bugHunter.sweepStarted.replace("{repo}", sweepRepo));
    } catch {
      toast.error(en.bugHunter.sweepFailed);
    } finally {
      setSweepPending(false);
    }
  };

  return (
    <div className="rounded-lg border border-border-light bg-neutral-50 p-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="w-[180px]">
          <Select
            id="bug-hunter-sweep-repo"
            labelText={en.bugHunter.sweepLabel}
            value={sweepRepo}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSweepRepo(e.target.value)}
          >
            {SWEEPABLE_REPOS.map(repo => (
              <SelectItem key={repo} value={repo} text={repo} />
            ))}
          </Select>
        </div>

        <Button
          size="md"
          kind="secondary"
          disabled={isSweeping || mode === BugHunterMode.OFF}
          onClick={() => setSweepPending(true)}
        >
          {isSweeping ? en.bugHunter.sweepButtonBusy : en.bugHunter.sweepButton}
        </Button>

        <label className="inline-flex items-center gap-2 text-sm text-typography-700 cursor-pointer pb-1.5">
          <input
            type="checkbox"
            checked={sweepDeep}
            onChange={e => setSweepDeep(e.target.checked)}
            className="cursor-pointer"
          />
          {en.bugHunter.sweepDeepLabel}
          <Tooltip label={en.bugHunter.sweepDeepTooltip} align="top">
            <button type="button" className="cursor-pointer inline-flex items-center">
              <TooltipIcon />
            </button>
          </Tooltip>
        </label>
      </div>

      {/* Both explanatory lines live in here now rather than on the card. They
          are worth reading exactly once, while deciding whether to press the
          button — which is precisely when this panel is open. */}
      <p className="text-xs text-typography-600 mt-3">{en.bugHunter.sweepTooltip}</p>
      <p className="text-xs text-typography-500 mt-1">{en.bugHunter.agentHours}</p>

      {sweepPending && (
        <ActionConfirmationPopup
          isOpen
          onClose={() => setSweepPending(false)}
          title={en.bugHunter.sweepConfirmTitle.replace("{repo}", sweepRepo)}
          description={en.bugHunter.sweepConfirmBody}
          primaryButton={{ label: en.bugHunter.sweepConfirm, onClick: handleSweep }}
          secondaryButton={{ label: en.bugHunter.cancel, onClick: () => setSweepPending(false) }}
        />
      )}
    </div>
  );
};
