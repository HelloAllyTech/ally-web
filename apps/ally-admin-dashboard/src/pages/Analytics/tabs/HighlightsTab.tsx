import { ReactNode, useState } from "react";

import { Tab, TabList, TabPanel, TabPanels, CarbonTabs as Tabs } from "@ally-ui-mono/ui-shared";

import { AnalyticsTabFilters } from "../analyticsFilters";
import { OrgEngagementSubTab } from "./OrgEngagementSubTab";
import { PlatformSubTab } from "./PlatformSubTab";
import { QualitySentimentSubTab } from "./QualitySentimentSubTab";
import { SkillGrowthSubTab } from "./SkillGrowthSubTab";
import { UnitEconomicsSubTab } from "./UnitEconomicsSubTab";
import { UsageLevelsSubTab } from "./UsageLevelsSubTab";

/**
 * Sub-tab registry — the single place to add or reorder a Highlights sub-tab.
 *
 * `label` is the tab; `blurb` is the one line under the tab strip that says what
 * question the panel answers, so a reader who lands on an unfamiliar sub-tab is
 * not left inferring it from five chart titles.
 */
interface SubTabDef {
  id: string;
  label: string;
  blurb: string;
  render: (filters: AnalyticsTabFilters) => ReactNode;
}

const SUB_TABS: SubTabDef[] = [
  {
    // First entry = the landing panel. This is the former Highlights tab in
    // full, unchanged: certification hero, KPI strip, growth, engagement,
    // outcomes, adoption and the existing unit-economics charts.
    id: "platform",
    label: "Platform",
    blurb: "The whole-platform picture: certification, growth, engagement, outcomes and adoption.",
    render: f => <PlatformSubTab {...f} />,
  },
  {
    id: "levels",
    label: "Usage levels",
    blurb: "How deep learners get (the L1–L5 lifetime-minutes ladder) and whether they come back.",
    render: f => <UsageLevelsSubTab {...f} />,
  },
  {
    // Third, directly after the two usage panels: "are they practising" is the
    // question a reader has to answer before "are they getting better" means
    // anything.
    id: "skills",
    label: "Skill growth",
    blurb:
      "Does practice make people better? The learning curve, how many individuals improved against their own baseline, and any one learner's history.",
    render: f => <SkillGrowthSubTab {...f} />,
  },
  {
    id: "orgs",
    label: "Orgs",
    blurb: "How far each account has climbed, and how many are still active. Always platform-wide.",
    render: () => <OrgEngagementSubTab />,
  },
  {
    id: "quality",
    label: "Quality & sentiment",
    blurb:
      "Does the LLM judge agree with the learner? Two measures of the same sessions, compared.",
    render: f => <QualitySentimentSubTab {...f} />,
  },
  {
    id: "cost",
    label: "Unit economics",
    blurb:
      "What ten minutes of roleplay costs in AI, split by area and service. Estimates, in USD.",
    render: () => <UnitEconomicsSubTab />,
  },
];

/**
 * Highlights — the leadership view, organised into sub-tabs.
 *
 * ## Why sub-tabs rather than one long page
 *
 * The tab reached twenty-three charts. Beyond a screen or two, a dashboard stops
 * being read and starts being scrolled past, and the reader loses the ability to
 * hold a section in their head — which is the whole point of grouping charts by
 * the question they answer rather than by the endpoint that serves them.
 *
 * There is a second, mechanical reason: only the visible panel's hooks mount, so
 * a reader opening Highlights pays for the Platform panel's requests and not for
 * five sub-tabs' worth of aggregation across a dozen endpoints. Mounting
 * everything and hiding it with CSS would have made the first paint slower for
 * every reader in order to save a click for some of them.
 *
 * ## Window and grain
 *
 * The tab takes NO page-level date range — declared by `TabDef.uses.range` in
 * Analytics.tsx, which drives both the picker and the window queried, so the two
 * cannot disagree. What replaces it is per-chart controls: each time series
 * carries its own period and grain, and those choices are SAVED PER USER (see
 * ./chartControls), so an analyst who always reads quality over 90 days does not
 * re-pick it every morning.
 *
 * A page-level range would have been the smaller change and the wrong one: the
 * charts here are not slices of one question. Certification and the usage ladder
 * are lifetime totals that a window would redefine rather than narrow; the org
 * counts are as-of-now; the cost ratio wants months. One picker over all of them
 * would either lie about what it scoped or force every panel to the least useful
 * common period.
 *
 * ## What deliberately has no picker
 *
 * Any card whose quantity is a lifetime or all-time measure says "all time" on
 * its face and offers no control, rather than carrying one that cannot honestly
 * do anything. A control that appears to narrow a metric while actually changing
 * its definition is worse than no control.
 */
export const HighlightsTab = (filters: AnalyticsTabFilters) => {
  const [selected, setSelected] = useState(0);
  const active = SUB_TABS[selected] ?? SUB_TABS[0];

  return (
    <div className="flex flex-col gap-2">
      <Tabs
        selectedIndex={selected}
        onChange={({ selectedIndex }: { selectedIndex: number }) => setSelected(selectedIndex)}
      >
        <TabList aria-label="Highlights sections" contained>
          {SUB_TABS.map(tab => (
            <Tab key={tab.id}>{tab.label}</Tab>
          ))}
        </TabList>

        <p className="mt-3 max-w-3xl text-xs leading-relaxed text-typography-500">{active.blurb}</p>

        <TabPanels>
          {SUB_TABS.map((tab, i) => (
            <TabPanel key={tab.id}>
              {/* Rendered only while selected. Carbon keeps every TabPanel in
                  the tree, so without this guard all five panels' hooks would
                  mount on first paint and fire their requests — the cost this
                  structure exists to avoid. */}
              {i === selected ? tab.render(filters) : null}
            </TabPanel>
          ))}
        </TabPanels>
      </Tabs>
    </div>
  );
};
