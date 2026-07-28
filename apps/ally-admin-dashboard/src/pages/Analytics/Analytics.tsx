import { ReactNode, useMemo, useState } from "react";

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
import { AnalyticsRange } from "@types";

import { AnalyticsTabFilters } from "./analyticsFilters";
import { HighlightsTab } from "./tabs/HighlightsTab";
import { LanguageQualityTab } from "./tabs/LanguageQualityTab";
import { LatencyTab } from "./tabs/LatencyTab";
import { ScribeTab } from "./tabs/ScribeTab";
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
 */
interface TabDef {
  id: string;
  label: string;
  uses: { language: boolean };
  render: (f: AnalyticsTabFilters) => ReactNode;
}

const TABS: TabDef[] = [
  // First entry = the default landing tab. Highlights is the whole-platform
  // picture; it absorbed the former separate "Overview" tab, which rendered four
  // of the same charts from the same data.
  {
    id: "highlights",
    label: "Highlights",
    uses: { language: false },
    render: f => <HighlightsTab {...f} />,
  },
  {
    id: "latency",
    label: "Latency & reliability",
    uses: { language: true },
    render: f => <LatencyTab {...f} />,
  },
  {
    id: "drift",
    label: "Drift",
    uses: { language: true },
    render: f => <ConversationDrift {...f} />,
  },
  {
    id: "language",
    label: "Language",
    uses: { language: true },
    render: f => <LanguageQualityTab {...f} />,
  },
  {
    // Labelled for what it measures. It was "Tokens" while its heading said "AI
    // cost" and its axis was USD.
    id: "cost",
    label: "AI cost",
    uses: { language: false },
    render: f => <TokenConsumption {...f} />,
  },
  {
    id: "scribe",
    label: "Scribe",
    uses: { language: false },
    render: f => <ScribeTab {...f} />,
  },
];

export const Analytics = () => {
  const [range, setRange] = useState<AnalyticsRange>("30d");
  // Page-level filters, shared across tabs (language id "" = all). Each tab
  // opts in via TabDef.uses; the picker only renders for tabs that use it.
  const [language, setLanguage] = useState<string>("");
  const [tabIndex, setTabIndex] = useState(0);

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
  const activeTab = TABS[tabIndex] ?? TABS[0];

  const query: AnalyticsWindowQuery = useMemo(() => ({ range }), [range]);
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
            </div>
          </div>

          <Tabs
            selectedIndex={tabIndex}
            onChange={({ selectedIndex }) => setTabIndex(selectedIndex)}
          >
            <TabList aria-label="Analytics sections">
              {TABS.map(t => (
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
              {TABS.map((t, i) => (
                <TabPanel key={t.id}>{i === tabIndex ? t.render(filters) : null}</TabPanel>
              ))}
            </TabPanels>
          </Tabs>
        </Section>
      </Theme>
    </div>
  );
};
