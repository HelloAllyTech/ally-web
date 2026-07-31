import { ReactNode, useMemo, useState } from "react";

import { useSelector } from "react-redux";

import "@carbon/charts/styles.css";
import "./analytics-carbon.scss";

import {
  CarbonDropdown as Dropdown,
  Heading,
  Section,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  CarbonTabs as Tabs,
  Theme,
} from "@ally-ui-mono/ui-shared";
import { AnalyticsWindowQuery, useGetScenarioLanguagesQuery } from "@api";
import { isSuperDuperAdminRole, UserRole } from "@constants";
import { RootState } from "@store";
import { AnalyticsRange } from "@types";

import { AnalyticsTabFilters } from "./analyticsFilters";
import { AnalyticsAgentTab } from "./tabs/AnalyticsAgentTab";
import { HighlightsTab } from "./tabs/HighlightsTab";
import { LanguageQualityTab } from "./tabs/LanguageQualityTab";
import { LatencyTab } from "./tabs/LatencyTab";
import { ScribeTab } from "./tabs/ScribeTab";
import { TestingTab } from "./tabs/TestingTab";
import { TokenConsumption } from "./TokenConsumption";
import { ConversationDrift } from "../ConversationDrift/ConversationDrift";

const RANGE_ITEMS: { id: AnalyticsRange; label: string }[] = [
  { id: "30d", label: "Last 30 days" },
  { id: "90d", label: "Last 90 days" },
  { id: "12m", label: "Last 12 months" },
];

/**
 * Tab registry — the single place to add/reorder analytics tabs. Each entry
 * declares which page-level pickers it consumes (`uses`) and renders its own
 * component with the shared filter values. Adding a tab = one entry + a
 * component under ./tabs; tab-local pickers live inside that component.
 *
 * `uses.range: false` means the tab reads ALL-TIME data and the time-range
 * picker is hidden for it. That is one switch, not two: the picker's visibility
 * and the window actually queried are both derived from this flag, so a tab
 * cannot end up showing a picker that changes nothing — or worse, hiding one
 * that still silently constrains its charts.
 */
interface TabDef {
  id: string;
  label: string;
  uses: { language: boolean; range: boolean };
  render: (f: AnalyticsTabFilters) => ReactNode;
  /**
   * Optional extra gate, on top of the route's SUPER_ADMIN_ROLES. Only one tab
   * needs it today (see the Analytics Agent entry), and a tab without it stays
   * visible to everyone who can reach the page — which is how every other tab
   * here already behaved.
   *
   * A hidden tab, not a disabled one: a reader who can never use it is better
   * served by not knowing it exists than by a tab whose every request 403s.
   */
  visibleTo?: (role?: UserRole | string | null) => boolean;
}

const TABS: TabDef[] = [
  // First entry = the default landing tab. Highlights is the whole-platform
  // picture; it absorbed the former separate "Overview" tab, which rendered four
  // of the same charts from the same data.
  //
  // It takes no time range: a leadership view of "how is the platform doing" is
  // a question about the whole history, and the reader who wants a narrower read
  // gets it per chart via the grouping control rather than by re-scoping every
  // panel on the page at once.
  {
    id: "highlights",
    label: "Highlights",
    uses: { language: false, range: false },
    render: f => <HighlightsTab {...f} />,
  },
  {
    id: "latency",
    label: "Latency & reliability",
    uses: { language: true, range: true },
    render: f => <LatencyTab {...f} />,
  },
  {
    id: "drift",
    label: "Drift",
    uses: { language: true, range: true },
    render: f => <ConversationDrift {...f} />,
  },
  {
    id: "language",
    label: "Language",
    uses: { language: true, range: true },
    render: f => <LanguageQualityTab {...f} />,
  },
  {
    // Labelled for what it measures. It was "Tokens" while its heading said "AI
    // cost" and its axis was USD.
    id: "cost",
    label: "AI cost",
    uses: { language: false, range: true },
    render: f => <TokenConsumption {...f} />,
  },
  {
    id: "scribe",
    label: "Scribe",
    uses: { language: false, range: true },
    render: f => <ScribeTab {...f} />,
  },
  {
    // The staging surface for charts that are candidates for the tabs above.
    // Last in the list because everything on it is provisional, and a panel
    // still being judged should not be the first thing a reader meets. Visible
    // to both super-admin tiers, like the rest of this page — the route already
    // gates on SUPER_ADMIN_ROLES and every endpoint it calls does the same, so a
    // narrower tab-level gate would only hide charts a reader is allowed to
    // fetch. Like Highlights it is all-time with per-chart grouping, so a chart
    // that earns its place can move without rework.
    id: "testing",
    label: "Testing",
    uses: { language: false, range: false },
    render: f => <TestingTab {...f} />,
  },
  {
    // Ask-anything, in English. Last in the list and gated on the elevated
    // super-duper-admin tier, unlike every tab above it.
    //
    // The narrower gate is the point: the other tabs answer fixed, reviewed
    // questions, while this one writes its own query across every readable
    // table at platform scope. ally-be gates the endpoints on the same tier, so
    // hiding the tab for a plain SUPER_ADMIN keeps the UI honest about what it
    // could actually fetch rather than offering a control that 403s.
    //
    // No page-level pickers: the reader states the period and the grouping in
    // the question itself, and a range picker that silently re-scoped a typed
    // question would be a filter nobody could see being applied.
    id: "agent",
    label: "Analytics Agent",
    uses: { language: false, range: false },
    render: () => <AnalyticsAgentTab />,
    visibleTo: isSuperDuperAdminRole,
  },
];

export const Analytics = () => {
  const [range, setRange] = useState<AnalyticsRange>("30d");
  // Page-level filters, shared across tabs (language id "" = all). Each tab
  // opts in via TabDef.uses; the picker only renders for tabs that use it.
  const [language, setLanguage] = useState<string>("");
  const [tabIndex, setTabIndex] = useState(0);

  // Most tabs are visible to everyone who can reach this page (the route gates
  // on SUPER_ADMIN_ROLES); a tab may declare a narrower gate of its own.
  const role = useSelector((state: RootState) => state.user.user?.role);
  const tabs = useMemo(() => TABS.filter(t => !t.visibleTo || t.visibleTo(role)), [role]);

  const { data: scenarioLanguages } = useGetScenarioLanguagesQuery({ active: true });
  const languageItems = useMemo(
    () => [
      { id: "", label: "All languages" },
      ...(scenarioLanguages ?? []).map(l => ({ id: l.value, label: l.label })),
    ],
    [scenarioLanguages],
  );

  const selectedRange = RANGE_ITEMS.find(i => i.id === range) ?? RANGE_ITEMS[0];
  const selectedLanguage = languageItems.find(i => i.id === language) ?? languageItems[0];
  const activeTab = tabs[tabIndex] ?? tabs[0];

  // A tab with no range picker reads all-time data. Derived from the same flag
  // that hides the picker, so the two cannot disagree.
  const query: AnalyticsWindowQuery = useMemo(
    () => ({ range: activeTab.uses.range ? range : "all" }),
    [range, activeTab],
  );
  const filters: AnalyticsTabFilters = useMemo(
    () => ({ query, language, onSelectLanguage: setLanguage }),
    [query, language],
  );

  return (
    <div className="font-primary pr-1">
      <Theme theme="white">
        <Section>
          <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
            <div>
              <Heading className="text-2xl">Analytics</Heading>
              <p className="text-sm text-typography-500 mt-1">
                Platform-wide metrics, excluding internal and test organisations. Each panel states
                what it is derived from and how many observations back it.
                {/* Says where the window went, for a tab that has no picker. A
                    missing control reads as an omission unless it is explained. */}
                {!activeTab.uses.range &&
                  " This tab covers all of the platform's history; each chart carries its own day/week/month/year grouping."}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {activeTab.uses.language && (
                <div className="w-48">
                  <Dropdown
                    id="analytics-language"
                    size="md"
                    titleText="Language"
                    hideLabel
                    label="Language"
                    items={languageItems}
                    selectedItem={selectedLanguage}
                    itemToString={item => item?.label ?? ""}
                    onChange={({ selectedItem }) => {
                      if (selectedItem) setLanguage(selectedItem.id);
                    }}
                  />
                </div>
              )}
              {activeTab.uses.range && (
                <div className="w-56">
                  <Dropdown
                    id="analytics-range"
                    size="md"
                    titleText="Time range"
                    hideLabel
                    label="Time range"
                    items={RANGE_ITEMS}
                    selectedItem={selectedRange}
                    itemToString={item => item?.label ?? ""}
                    onChange={({ selectedItem }) => {
                      if (selectedItem) setRange(selectedItem.id);
                    }}
                  />
                </div>
              )}
            </div>
          </div>

          <Tabs
            selectedIndex={tabIndex}
            onChange={({ selectedIndex }) => setTabIndex(selectedIndex)}
          >
            <TabList aria-label="Analytics sections">
              {tabs.map(t => (
                <Tab key={t.id}>{t.label}</Tab>
              ))}
            </TabList>
            <TabPanels>
              {/*
                Only the ACTIVE panel's component is mounted. Carbon's TabPanel
                merely sets `hidden`, so rendering every tab's children fired one
                query per chart across all tabs on first paint — most of them for
                panels nobody was looking at. Depth stays available on demand; it
                just is not all fetched up front.
              */}
              {tabs.map((t, i) => (
                <TabPanel key={t.id}>{i === tabIndex ? t.render(filters) : null}</TabPanel>
              ))}
            </TabPanels>
          </Tabs>
        </Section>
      </Theme>
    </div>
  );
};
