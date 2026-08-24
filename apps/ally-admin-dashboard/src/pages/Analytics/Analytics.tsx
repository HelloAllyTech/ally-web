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
import { en, isSuperDuperAdminRole, UserRole, FeatureToggleKey } from "@constants";
import { RootState } from "@store";
import { AnalyticsRange } from "@types";
import { hasFeature } from "@utils";

import { AnalyticsTabFilters } from "./analyticsFilters";
import { TabControlsSlotProvider } from "./tabControlsSlot";
import { AnalyticsAgentTab } from "./tabs/AnalyticsAgentTab";
import { GlossaryAdherenceTab } from "./tabs/GlossaryAdherenceTab";
import { HighlightsTab } from "./tabs/HighlightsTab";
import { LanguageQualityTab } from "./tabs/LanguageQualityTab";
import { LatencyTab } from "./tabs/LatencyTab";
import { ProductManagementTab } from "./tabs/ProductManagementTab";
import { ScribeTab } from "./tabs/ScribeTab";
import { SuggestionsTab } from "./tabs/suggestions/SuggestionsTab";
import { WeakPerformingMetricsTab } from "./tabs/WeakPerformingMetricsTab";
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
   * Optional extra gate, on top of the route's SUPER_ADMIN_ROLES/analytics
   * feature toggle. Only two tabs need it today (Analytics Agent and
   * Suggestions), and a tab without it stays visible to everyone who can reach
   * the page — which is how every other tab here already behaved.
   *
   * Dual-gated during the role->toggle migration, same OR pattern as
   * PrivateLayout's `requiredRole || requiredFeature`: either the legacy
   * super-duper-admin role or the matching feature toggle unlocks the tab.
   *
   * A hidden tab, not a disabled one: a reader who can never use it is better
   * served by not knowing it exists than by a tab whose every request 403s.
   */
  visibleTo?: (ctx: { role?: UserRole | string | null; features: string[] }) => boolean;
}

const TABS: TabDef[] = [
  // First entry = the default landing tab. Highlights is the whole-platform
  // picture; it absorbed the former separate "Overview" tab, which rendered four
  // of the same charts from the same data, and later the "Testing" staging tab,
  // whose twenty charts were distributed into the Highlights sub-tab that
  // answers the same question as each — so a metric now lives in exactly one
  // place rather than in a reviewed copy and a provisional one.
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
    // The five simulator-quality metrics under active repair, on one filter
    // tuple. Placed directly after Highlights because it is the working view
    // for the current quality push, not a reference tab.
    //
    // It takes BOTH pickers, and unusually the tab adds two more of its own
    // (model, scenario) rather than leaving them to a drill-in: three findings
    // in this data turned out to be composition artefacts rather than
    // regressions, so segmentation here is part of the metric rather than a
    // convenience.
    id: "weak-metrics",
    label: "Weak performing metrics",
    uses: { language: true, range: true },
    render: f => <WeakPerformingMetricsTab {...f} />,
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
    // Deterministic avoid-list adherence — a sibling to the Language tab's
    // judge-based error rates, but no time range: a scan is triggered
    // on-demand per language (Rescan), not read over a rolling window, and
    // glossary_adherence_reports has no occurredAt-per-window field to slice
    // by. Same per-language drill-in pattern as Language: overview table by
    // default, pick a language above for its violated terms.
    id: "glossary",
    label: "Language glossary",
    uses: { language: true, range: false },
    render: f => <GlossaryAdherenceTab {...f} />,
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
    // The only tab here that measures OUR OWN work rather than the product's.
    // Everything above reads tenant-scoped learner and session data; this reads
    // the internal coin-voting roadmap, which carries no tenant. Its own tab
    // rather than a panel on Highlights, so nobody takes "180 coins shipped" for
    // a platform metric.
    //
    // No page-level pickers: the roadmap has no language dimension, and its
    // charts are all-time by construction — a release log is slow enough that a
    // quarter can hold a handful of items, so a range picker would either draw
    // one bar or hide the years before it.
    //
    // Visible to both super-admin tiers, like every tab except the two below:
    // the endpoint it calls is gated on SUPER_ADMIN_ROLES, and reading a delivery
    // chart is not the privilege that filing onto the roadmap is.
    id: "product",
    label: "Product management",
    uses: { language: false, range: false },
    render: () => <ProductManagementTab />,
  },
  {
    // Ask-anything, in English. Gated on the elevated super-duper-admin tier,
    // unlike every tab above it.
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
    visibleTo: ({ role, features }) =>
      isSuperDuperAdminRole(role) || hasFeature(features, FeatureToggleKey.ANALYTICS_AGENT),
  },
  {
    // "What should we build next?", answered from the platform's own numbers and
    // reviewed card by card. Last in the list, and on the elevated tier for a
    // reason the tabs above it do not share: accepting a suggestion WRITES — it
    // files an opportunity onto the product roadmap. Reading a chart and adding to
    // the backlog are different privileges, and only SUPER_DUPER_ADMIN holds
    // edit:admin:product-roadmap, so a plain SUPER_ADMIN seeing this tab would be
    // offered a decision they cannot make.
    //
    // No page-level pickers: the period belongs to a Generate run that already
    // happened and is stamped on every card, so a picker at the top of the page
    // would imply it re-scopes a queue it cannot touch.
    id: "suggestions",
    label: en.analyticsSuggestions.tabLabel,
    uses: { language: false, range: false },
    render: () => <SuggestionsTab />,
    visibleTo: ({ role, features }) =>
      isSuperDuperAdminRole(role) || hasFeature(features, FeatureToggleKey.ANALYTICS_SUGGESTIONS),
  },
];

export const Analytics = () => {
  // 90 days, not 30. The judge backfill now reaches months back, and a
  // 30-day window truncated every trend on this page to about four
  // buckets — enough to draw a line, not enough to read one. The wider
  // default costs a slower first paint on tabs that run many aggregates.
  const [range, setRange] = useState<AnalyticsRange>("90d");
  // Page-level filters, shared across tabs (language id "" = all). Each tab
  // opts in via TabDef.uses; the picker only renders for tabs that use it.
  const [language, setLanguage] = useState<string>("");
  const [tabIndex, setTabIndex] = useState(0);

  // Most tabs are visible to everyone who can reach this page (the route gates
  // on SUPER_ADMIN_ROLES / the analytics feature toggle); a tab may declare a
  // narrower gate of its own.
  const role = useSelector((state: RootState) => state.user.user?.role);
  const features = useSelector((state: RootState) => state.user.features);
  const tabs = useMemo(
    () => TABS.filter(t => !t.visibleTo || t.visibleTo({ role, features })),
    [role, features],
  );

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

  // Callback ref into state, not a plain ref: a portal needs a re-render once
  // its target node exists, and a ref mutation does not trigger one.
  const [controlsSlot, setControlsSlot] = useState<HTMLDivElement | null>(null);

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
          {/* Heading, then filters on their own full-width line. They used to
              sit beside the heading, which fits four controls and breaks at
              six: a tab that adds its own slice dimensions pushed the row into
              two ragged lines split across the middle of the filter set. */}
          <div className="flex flex-col gap-4 mb-6">
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
            {/* Wraps rather than overflows: with a tab's own pickers portalled
                in, the group is wider than a 1000px viewport, and an unwrapped
                flex row puts the last control off-screen with no scrollbar to
                reach it. Wrapped, it stays one contiguous block of filters. */}
            <div className="flex flex-wrap items-end gap-3">
              {activeTab.uses.language && (
                <div className="w-44">
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
                <div className="w-48">
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
              {/* Tabs with slice dimensions of their own portal them here, so
                  the whole filter bar stays one row above the content it
                  scopes. Page-wide filters first, then the tab's own. Empty for
                  tabs that add nothing. */}
              <div ref={setControlsSlot} className="flex flex-wrap items-end gap-3" />
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
                <TabPanel key={t.id}>
                  {i === tabIndex ? (
                    <TabControlsSlotProvider value={controlsSlot}>
                      {t.render(filters)}
                    </TabControlsSlotProvider>
                  ) : null}
                </TabPanel>
              ))}
            </TabPanels>
          </Tabs>
        </Section>
      </Theme>
    </div>
  );
};
