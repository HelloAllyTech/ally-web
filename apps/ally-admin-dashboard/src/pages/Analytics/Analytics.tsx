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
import { useGetScenarioLanguagesQuery } from "@api";
import { AnalyticsRange } from "@types";

import { HighlightsTab } from "./tabs/HighlightsTab";
import { LanguageQualityTab } from "./tabs/LanguageQualityTab";
import { LatencyTab } from "./tabs/LatencyTab";
import { OverviewTab } from "./tabs/OverviewTab";
import { ScribeTab } from "./tabs/ScribeTab";
import { TokenConsumption } from "./TokenConsumption";
import { ConversationDrift } from "../ConversationDrift/ConversationDrift";

const RANGE_ITEMS: { id: AnalyticsRange; label: string }[] = [
  { id: "30d", label: "Last 30 days" },
  { id: "90d", label: "Last 90 days" },
  { id: "12m", label: "Last 12 months" },
];

/** Shared, page-level filter values passed into every tab. */
interface TabFilters {
  range: AnalyticsRange;
  language: string;
  /** Lets a tab drive the page-level language picker (e.g. drill-in from a
   *  per-language overview row). */
  onSelectLanguage: (language: string) => void;
}

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
  render: (f: TabFilters) => ReactNode;
}

const TABS: TabDef[] = [
  // First entry = the default landing tab (tabIndex starts at 0) — Highlights
  // is the leadership summary, so it leads.
  {
    id: "highlights",
    label: "Highlights",
    uses: { language: false },
    render: f => <HighlightsTab range={f.range} />,
  },
  {
    id: "overview",
    label: "Overview",
    uses: { language: false },
    render: f => <OverviewTab range={f.range} />,
  },
  {
    id: "latency",
    label: "Latency & reliability",
    uses: { language: true },
    render: f => <LatencyTab range={f.range} language={f.language} />,
  },
  {
    id: "drift",
    label: "Drift",
    uses: { language: true },
    render: f => <ConversationDrift range={f.range} language={f.language} />,
  },
  {
    id: "language",
    label: "Language",
    uses: { language: true },
    render: f => (
      <LanguageQualityTab
        range={f.range}
        language={f.language}
        onSelectLanguage={f.onSelectLanguage}
      />
    ),
  },
  {
    id: "tokens",
    label: "Tokens",
    uses: { language: false },
    render: f => <TokenConsumption range={f.range} />,
  },
  {
    id: "scribe",
    label: "Scribe",
    uses: { language: false },
    render: f => <ScribeTab range={f.range} />,
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
  const filters: TabFilters = { range, language, onSelectLanguage: setLanguage };

  return (
    <div className="font-primary pr-1">
      <Theme theme="white">
        <Section>
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <Heading className="text-2xl">Analytics</Heading>
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
              {TABS.map(t => (
                <TabPanel key={t.id}>{t.render(filters)}</TabPanel>
              ))}
            </TabPanels>
          </Tabs>
        </Section>
      </Theme>
    </div>
  );
};
