import { FC, useMemo, useState } from "react";

import { useSelector } from "react-redux";
import { Navigate, useSearchParams } from "react-router-dom";

import { Tabs } from "@ally-ui-mono/ui-shared";
import { useGetBugFindingsQuery, useGetBugHunterSettingsQuery } from "@api";
import { en, FeatureToggleKey, ROUTES } from "@constants";
import { RootState } from "@store";
import { BugFinding, BugHunterMode } from "@types";
import { hasFeature } from "@utils";

import { AboutAgent } from "./AboutAgent";
import { AgentProfileCard } from "./AgentProfileCard";
import { BugFindingsTable } from "./BugFindingsTable";
import { useBugHunterUrlState } from "./bugHunterUrlState";
import { KeyboardShortcutSheet } from "./KeyboardShortcutSheet";
import { LiveWorkBoard } from "./LiveWorkBoard";
import { NotebookPanel } from "./NotebookPanel";
import { UxSignalsPanel } from "./UxSignalsPanel";
import { ANALYTICS_BUG_AGENT_TAB_ID, ANALYTICS_TAB_PARAM } from "../Analytics/Analytics";

/**
 * Bug Hunter's tab: a colleague's card, and under it the work — with the two
 * sections that answer a different question moved off the default view.
 *
 * ## Why this is tabbed now, when it was one scroll before
 *
 * The previous layout stacked eight full-width sections in a single column and
 * argued, correctly, that they were ordered by whose move it is. What it did
 * not fix is that they were all *present* at once: on a real install the page
 * ran past three screens, and the two longest things on it — the scorecard with
 * its four tiles and fourteen-day sparkbars, and the shift log — sat directly
 * underneath the bugs table a triager was working, followed by eleven FAQ
 * accordions.
 *
 * That layout's own module doc already contained the answer:
 *
 * > Everything above the scorecard serves a *reviewer* working a queue; the
 * > scorecard and the shift log serve a *governor* asking whether this thing
 * > should still be merging its own code […] That question is asked
 * > deliberately and roughly monthly.
 *
 * Two readers, two questions, one asked daily and one monthly — and both
 * rendered on every visit. Tabs are what that observation was describing.
 * Stacks' *Progressive Disclosure and Contextual Relevance in Agent Interfaces*
 * is the general form: show the core surface first, group the rest, and reveal
 * it when the workflow stage calls for it.
 *
 * ## What stays outside the tabs
 *
 * `AgentProfileCard`, always. It is the page's heading, it carries the status
 * line, and it holds the kill switch — the one control that has to be reachable
 * from wherever you are without remembering which tab you left it on.
 *
 * ## The sections, and what each is for
 *
 * **Work** (default) — the reviewer's surface:
 *
 * - `LiveWorkBoard` — what it is doing this minute, and what finished in the
 *   last few seconds. Absent when nothing is moving, so on a quiet night the
 *   table is the first thing under the card.
 * - `UxSignalsPanel` — one line and a button; absent without its toggle.
 * - `BugFindingsTable` — every bug it knows about: filterable, sortable,
 *   searchable, selectable, and workable from the keyboard. Its "Needs you"
 *   bucket, the drawer and the bulk bar are where decisions happen.
 *
 * Two sections came off this tab on 2026-10-01 at the product head's request:
 * the "What I need from you" queue, whose cards duplicated the table's Needs-you
 * bucket and the drawer, and the "Messages from Bug Hunter" inbox, whose
 * action-needed items were the same bugs again. The sidebar badge still counts
 * unread notifications, and run-level messages remain readable in the shift log.
 *
 * **Performance** — gone (OPP-0749, 2026-10-05). The governor's surface —
 * `AgentScorecard`, `AccuracyPanel`, `RunHistoryTable` — lives on Analytics →
 * Bug Agent beside the operations charts, so one place answers "how is Bug
 * Hunter doing" and this page is for work. `?section=performance` redirects
 * there, so an old link still lands on the numbers.
 *
 * **About** — reference material, and the default tab on the one occasion
 * nothing else has any content: before anyone has put it on duty. That replaces
 * a conditional that rendered `AboutAgent` at the *top* of the page while off
 * duty and at the *bottom* while on duty — the same component in two places,
 * which is a layout rule that has to be re-derived every time it is read.
 *
 * ## State
 *
 * The section lives in `?section=`, alongside the table's own filters, so
 * "look at the shift log" is a link. It is read here with `useSearchParams`
 * rather than added to `useBugHunterUrlState`, for two reasons: it is the
 * page's business and not the table's, and the table is also mounted by the
 * roadmap's Bugs tab, which has its own `?tab=`/`?view=` params — this must not
 * become a third thing that hook writes on a screen that has no sections.
 *
 * The shortcut sheet's open flag is the one genuinely page-level piece of
 * `useState` left: `?` raises it from anywhere on the page. The button that
 * used to open it came off the table's toolbar with the row-height toggle;
 * the key is the only way in now, on purpose.
 */

/** The three sections, and the `?section=` values that address them. */
const SECTION = {
  work: "work",
  notebook: "notebook",
  about: "about",
} as const;

type Section = (typeof SECTION)[keyof typeof SECTION];

const SECTIONS: Section[] = [SECTION.work, SECTION.notebook, SECTION.about];

/** The section that moved to Analytics; its old address is honoured with a redirect. */
const RETIRED_PERFORMANCE_SECTION = "performance";
const PERFORMANCE_REDIRECT = `${ROUTES.ANALYTICS}?${ANALYTICS_TAB_PARAM}=${ANALYTICS_BUG_AGENT_TAB_ID}`;

export const BugHunter: FC = () => {
  // Already in flight from the profile card with identical args, so both of
  // these read the same RTK Query cache entries rather than adding requests.
  // Kept here because the layout decision below depends on the mode, and the
  // live board needs the findings.
  const { data: settings } = useGetBugHunterSettingsQuery();
  const { data: findingsData } = useGetBugFindingsQuery(
    { status: "all", limit: 100 },
    { pollingInterval: 15_000 },
  );

  const { setBug } = useBugHunterUrlState();
  const [searchParams, setSearchParams] = useSearchParams();
  const [showShortcuts, setShowShortcuts] = useState(false);

  const features = useSelector((state: RootState) => state.user.features);

  /**
   * Whether this reader may ACT on bugs, or only read them.
   *
   * Mirrors the backend's own gate (`@RequireFeatureToggle(BUG_HUNTER)`).
   * Resolved once here and threaded down, rather than re-derived in each
   * component: two copies of an authorisation rule is one copy too many.
   */
  const canTriage = hasFeature(features, FeatureToggleKey.BUG_HUNTER);

  const findings: BugFinding[] = findingsData?.items ?? [];

  // Nobody has put Bug Hunter on duty yet, so the Work tab has nothing in it —
  // that is the one moment "About me" is the most useful thing on the page, and
  // it becomes the tab you land on.
  const isOffDuty = settings?.mode === BugHunterMode.OFF;

  /**
   * The open section.
   *
   * An unrecognised `?section=` falls back to the default rather than erroring,
   * the same way the table treats a mistyped facet — a hand-edited link is not
   * something to complain about on screen.
   *
   * The fallback is computed rather than fixed, so it can follow the off-duty
   * rule. Note this deliberately reads `settings` and so lands on Work for one
   * render while the mode is still loading: the alternative is holding the
   * whole page blank on a request that usually resolves from cache, and Work is
   * the right answer in every case except the very first visit.
   */
  const fallbackSection: Section = isOffDuty ? SECTION.about : SECTION.work;
  const rawSection = searchParams.get("section");
  const section: Section = SECTIONS.includes(rawSection as Section)
    ? (rawSection as Section)
    : fallbackSection;

  const setSection = (next: string) =>
    setSearchParams(
      current => {
        const params = new URLSearchParams(current);
        // The default section is the absent one, so the tab's own address stays
        // `/bug-hunter` — same rule `bugHunterUrlState.write` follows.
        if (next === fallbackSection) params.delete("section");
        else params.set("section", next);
        return params;
      },
      { replace: true },
    );

  const tabItems = useMemo(
    () => [
      { id: SECTION.work, label: en.bugHunter.sectionWork },
      // What the agent wrote down for its future self, and what admins added.
      // Its own tab: it is neither today's work nor a metric, and a reader who
      // wants to teach the agent something should not have to hunt for where.
      { id: SECTION.notebook, label: en.bugHunter.sectionNotebook },
      { id: SECTION.about, label: en.bugHunter.sectionAbout },
    ],
    [],
  );

  if (rawSection === RETIRED_PERFORMANCE_SECTION) {
    return <Navigate to={PERFORMANCE_REDIRECT} replace />;
  }

  return (
    <div className="h-full font-primary flex flex-col overflow-y-auto custom-scrollbar">
      <AgentProfileCard />

      <div className="mt-6 shrink-0">
        {/* `showCount={false}`: the shared strip renders a literal "0" beside
            any tab without a count, and none of these is a countable
            collection. What needs a human is already loud on the card above and
            in the table's Needs-you bucket below. */}
        <Tabs items={tabItems} activeId={section} onChange={setSection} showCount={false} />
      </div>

      {section === SECTION.work && (
        <>
          {/* Present tense, and the agent's own move rather than yours. Renders
              null when nothing is in flight, so this is a no-op margin on a
              quiet night and the table sits directly under the card. */}
          <div className="mt-6 shrink-0 empty:mt-0">
            <LiveWorkBoard findings={findings} onOpen={setBug} />
          </div>

          {/* Directly above the table its bug-shaped output lands in, which is
              where a reader would look for the control that produced those rows.
              Renders null without the UX_SIGNALS toggle. */}
          <div className="mt-6 shrink-0 empty:mt-0">
            <UxSignalsPanel />
          </div>

          <div className="mt-6 shrink-0">
            <BugFindingsTable
              onShowShortcuts={() => setShowShortcuts(true)}
              canTriage={canTriage}
            />
          </div>
        </>
      )}

      {section === SECTION.notebook && (
        <div className="mt-6 flex-1">
          <NotebookPanel canTriage={canTriage} />
        </div>
      )}

      {section === SECTION.about && (
        <div className="mt-6 flex-1">
          <AboutAgent />
        </div>
      )}

      {showShortcuts && <KeyboardShortcutSheet onClose={() => setShowShortcuts(false)} />}
    </div>
  );
};
