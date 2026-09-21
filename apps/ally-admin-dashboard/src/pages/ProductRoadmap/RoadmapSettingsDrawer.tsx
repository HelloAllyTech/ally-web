import React, { useState } from "react";

import { Tabs } from "@ally-ui-mono/ui-shared";
import { Button } from "@components";
import { ButtonVariant } from "@components/types";
import { RoadmapTaxonomyItem } from "@types";

import { MergeOpportunitiesPanel } from "./MergeOpportunitiesPanel";
import { ProductGoalsManager } from "./ProductGoalsManager";
import { SplitOpportunitiesPanel } from "./SplitOpportunitiesPanel";
import { StrategyRankingManager } from "./StrategyRankingManager";

/**
 * The drawer's panels.
 *
 * LOCAL STATE, NOT `?tab=`. The top-level strip deep-links because people share links to a view
 * of the board; nobody shares a link to a settings form, and putting these in the URL would mean
 * a shared board link could reopen someone else's admin panel on arrival.
 */
enum SettingsTab {
  GOALS = "goals",
  STRATEGY = "strategy",
  MERGE = "merge",
  SPLIT = "split",
}

interface RoadmapSettingsDrawerProps {
  goals: RoadmapTaxonomyItem[];
  areGoalsLoading?: boolean;
  onClose: () => void;
  /** Opens the merged opportunity's own drawer — see MergeOpportunitiesPanel. */
  onMerged: (primaryId: string) => void;
  /** Opens the surviving original's own drawer — see SplitOpportunitiesPanel. */
  onSplit: (originalId: string) => void;
}

/**
 * The roadmap's admin jobs, behind one gear by the page title.
 *
 * ## Why one entry point
 *
 * Three of these were separate glyphs in the header — a flag, a scales icon and a merge icon —
 * each opening its own modal or drawer, and the fourth was a permanent Split column on the
 * opportunities table. Unlabelled icons and a always-present column, for jobs a manager does
 * every few weeks, on a board people visit to read a 159-row queue. Consolidating them trades a
 * little discoverability for a header and a table that are about the board rather than about
 * administering it, which is the right trade for once-in-a-while work; the gear is a convention
 * people already know to open when they want to change how a thing is set up.
 *
 * ## Why TABS and not one long form
 *
 * Stacks, "Consolidate Similar Nodes Without Over-Generalizing": cluster genuinely equivalent
 * items, but do not generalise so far that important distinctions vanish. These four are NOT
 * equivalent — product goals are the filing category, strategy goals are the outcomes the board
 * is ranked against, and merge and split are data operations on opportunities. One scrolling form
 * holding them all is exactly how the first two get confused, which the previous separation was
 * deliberately guarding against. Tabs keep each one its own labelled surface; only the way in is
 * shared. Merge and split sit last and adjacent because they are the pair that rewrites rows.
 *
 * ## Gating
 *
 * Rendered only when `canManageRoadmap` (EDIT_PRODUCT_ROADMAP plus the manage feature toggle) is
 * true — the same gate all four controls carried, so nothing gained or lost an audience. The gate
 * lives at the call site so the drawer never mounts for a read-only voter.
 */
export const RoadmapSettingsDrawer: React.FC<RoadmapSettingsDrawerProps> = ({
  goals,
  areGoalsLoading,
  onClose,
  onMerged,
  onSplit,
}) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>(SettingsTab.GOALS);

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/30"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Roadmap settings"
    >
      {/* Wider than the 34rem the merge drawer used on its own: the tab strip has to hold four
          labels before it starts scrolling horizontally, and the ranking weights inside the
          strategy panel were laid out for a size="md" modal rather than a narrow rail.

          "Merge" and "Split" rather than "Merge/Split opportunities": the full phrases push the
          strip past even this width, and inside a drawer titled Roadmap settings, sitting beside
          two panels that are plainly about opportunities, the bare verbs are not ambiguous. Each
          panel opens by saying what it does, so the shortened label costs no explanation. */}
      <aside
        className="bg-white relative flex h-full w-[48rem] max-w-full flex-col"
        onClick={event => event.stopPropagation()}
      >
        <header className="border-border-light flex items-center justify-between border-b p-4">
          <h2 className="text-typography-primary text-lg">Roadmap settings</h2>
          <Button variant={ButtonVariant.TEXT} onClick={onClose}>
            Close
          </Button>
        </header>

        {/* showCount={false} — the shared strip prints "0" for a missing count, and these are
            panels rather than collections of anything countable. */}
        <Tabs
          items={[
            { id: SettingsTab.GOALS, label: "Product goals" },
            { id: SettingsTab.STRATEGY, label: "Strategy & ranking" },
            { id: SettingsTab.MERGE, label: "Merge" },
            { id: SettingsTab.SPLIT, label: "Split" },
          ]}
          activeId={activeTab}
          onChange={id => setActiveTab(id as SettingsTab)}
          showCount={false}
          className="px-4"
        />

        {/* The BODY scrolls, not the whole panel — the strip has to stay reachable while reading
            a long list of strategy goals, otherwise switching panels means scrolling back up. */}
        <div className="flex-1 overflow-y-auto p-4">
          {activeTab === SettingsTab.GOALS && (
            <ProductGoalsManager goals={goals} isLoading={areGoalsLoading} />
          )}
          {activeTab === SettingsTab.STRATEGY && <StrategyRankingManager />}
          {activeTab === SettingsTab.MERGE && <MergeOpportunitiesPanel onMerged={onMerged} />}
          {activeTab === SettingsTab.SPLIT && <SplitOpportunitiesPanel onSplit={onSplit} />}
        </div>
      </aside>
    </div>
  );
};
