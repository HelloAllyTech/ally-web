import { FC, useState } from "react";

import { Button } from "@ally-ui-mono/ui-shared";
import { AgentAvatar } from "@components/agent-avatar";
import { en } from "@constants";
import { BugFinding } from "@types";

import { actionableFindings, bucketOfStatus } from "./lifecycleBucket";
import { NeedsYouCard } from "./NeedsYouCard";

/** How many cards show before the list collapses behind a "show all". */
const COLLAPSED_LIMIT = 3;

export interface NeedsYouQueueProps {
  /** The same window the card and the bugs table read — one shared cache entry, no extra request. */
  findings: BugFinding[];
  onOpen: (id: string) => void;
}

/**
 * The one section on this page that represents *your* unfinished work, and the
 * first thing under the agent's header when it exists.
 *
 * ## Renders nothing at all when there is nothing to decide
 *
 * This is the point. The tab's job is to be quiet on a good night and loud when
 * it is blocked, and a section headed "What I need from you" sitting there
 * saying "nothing" is a section that trains a reader to skip the region of the
 * page where the urgent thing will later appear. So when the queue is empty it
 * has no header, no empty state and no border — the status line on the agent's
 * header already says "Nothing on my desk", which is the same fact stated once
 * instead of twice.
 *
 * That also makes this the only coloured region on the page whenever it is
 * present: orange (or red, per card) against an otherwise white-and-grey tab,
 * with the bugs table's own colour limited to status pills. A reader's eye lands
 * here first because nothing else is competing, not because it is at the top.
 *
 * ## Why it collapses at three
 *
 * A backlog of fifteen blocked bugs is a real state, and fifteen cards would
 * push the bugs table two screens down and turn a decision queue back into a
 * list to scroll. Three is what fits above the fold next to the header; the
 * rest are one click away, and the heading always states the true total so the
 * collapse never hides the size of the problem.
 */
export const NeedsYouQueue: FC<NeedsYouQueueProps> = ({ findings, onOpen }) => {
  const [expanded, setExpanded] = useState(false);

  const actionable = actionableFindings(findings);
  if (actionable.length === 0) return null;

  const visible = expanded ? actionable : actionable.slice(0, COLLAPSED_LIMIT);
  const hiddenCount = actionable.length - visible.length;

  const waiting = actionable.filter(f => bucketOfStatus(f.status) === "needs_you").length;
  const problems = actionable.length - waiting;
  const parts = [
    waiting > 0 ? en.bugHunter.queuePartWaiting.replace("{count}", String(waiting)) : null,
    problems > 0 ? en.bugHunter.queuePartProblem.replace("{count}", String(problems)) : null,
  ].filter(Boolean);
  const tail = actionable.length === 1 ? en.bugHunter.queueTailOne : en.bugHunter.queueTail;
  const summary = `${parts.join(", ")}. ${tail}`;

  return (
    <section aria-labelledby="needs-you-heading">
      <div className="flex items-center gap-3 mb-3">
        <AgentAvatar size="sm" presence="waiting_on_you" label={en.bugHunter.agentName} />
        <div className="min-w-0">
          <h2 id="needs-you-heading" className="text-sm font-semibold text-typography-900">
            {en.bugHunter.queueTitle}
          </h2>
          {/* Counted per kind, not as one total. The card directly above says
              "N bugs are waiting on your call" from `agentPersona`, which counts
              only PENDING_APPROVAL and NEEDS_INPUT — this queue also holds the
              red jobs, so a single total here printed a different number for the
              same page and read as a defect rather than as a distinction. */}
          <p className="text-xs text-typography-600">{summary}</p>
        </div>
      </div>

      <ul className="flex flex-col gap-3">
        {visible.map(finding => (
          <NeedsYouCard key={finding.id} finding={finding} onOpen={onOpen} />
        ))}
      </ul>

      {(hiddenCount > 0 || expanded) && (
        <div className="mt-2">
          <Button size="sm" kind="ghost" onClick={() => setExpanded(value => !value)}>
            {expanded
              ? en.bugHunter.queueShowFewer
              : en.bugHunter.queueShowAll.replace("{count}", String(hiddenCount))}
          </Button>
        </div>
      )}
    </section>
  );
};
