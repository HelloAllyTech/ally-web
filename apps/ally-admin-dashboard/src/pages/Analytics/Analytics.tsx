import { ReactNode, useMemo, useState } from "react";

import {
  ContentSwitcher,
  Dropdown,
  Heading,
  Section,
  Switch,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Theme,
} from "@carbon/react";
import { useSearchParams } from "react-router-dom";

import "@carbon/charts/styles.css";
import "./analytics-carbon.scss";

import { useGetScenarioLanguagesQuery } from "@api";
import { AnalyticsRange } from "@types";

import { LatencyTab } from "./tabs/LatencyTab";
import { OverviewTab } from "./tabs/OverviewTab";
import { ScribeOverviewTab } from "./tabs/ScribeOverviewTab";
import { ScribeSummaryFailureTab } from "./tabs/ScribeSummaryFailureTab";
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

/**
 * Two session types, each with its own tab set. AI/simulation analytics derive
 * from `scenario_sessions`; scribe analytics derive from `chats` (real
 * counselor sessions). The ContentSwitcher picks the active registry.
 */
type SessionType = "ai" | "scribe";

const AI_TABS: TabDef[] = [
  {
    id: "overview",
    label: "Overview",
    uses: { language: false },
    render: f => <OverviewTab range={f.range} />,
  },
  {
    id: "latency",
    label: "Latency",
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
    id: "tokens",
    label: "Tokens",
    uses: { language: false },
    render: f => <TokenConsumption range={f.range} />,
  },
];

const SCRIBE_TABS: TabDef[] = [
  {
    id: "scribe-overview",
    label: "Overview",
    uses: { language: false },
    render: f => <ScribeOverviewTab range={f.range} />,
  },
  {
    id: "scribe-summary-failure",
    label: "Summary failure",
    uses: { language: false },
    render: f => <ScribeSummaryFailureTab range={f.range} />,
  },
];

const TAB_SETS: Record<SessionType, TabDef[]> = {
  ai: AI_TABS,
  scribe: SCRIBE_TABS,
};

const SESSION_TYPES: SessionType[] = ["ai", "scribe"];

export const Analytics = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const sessionType: SessionType = searchParams.get("sessions") === "scribe" ? "scribe" : "ai";
  const tabs = TAB_SETS[sessionType];

  const [range, setRange] = useState<AnalyticsRange>("30d");
  // Page-level filters, shared across tabs (language id "" = all). Each tab
  // opts in via TabDef.uses; the picker only renders for tabs that use it.
  const [language, setLanguage] = useState<string>("");
  const [tabIndex, setTabIndex] = useState(0);

  const handleSessionTypeChange = (next: SessionType) => {
    if (next === sessionType) return;
    setTabIndex(0); // tab sets differ; reset to the first tab
    setSearchParams(
      prev => {
        const params = new URLSearchParams(prev);
        if (next === "ai") params.delete("sessions");
        else params.set("sessions", next);
        return params;
      },
      { replace: true },
    );
  };

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
  const filters: TabFilters = { range, language };

  return (
    <div className="font-primary pr-1">
      <Theme theme="white">
        <Section>
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <div className="flex flex-wrap items-center gap-4">
              <Heading className="text-2xl">Analytics</Heading>
              <div className="w-72">
                <ContentSwitcher
                  size="md"
                  selectedIndex={SESSION_TYPES.indexOf(sessionType)}
                  onChange={({ index }) => handleSessionTypeChange(SESSION_TYPES[index ?? 0])}
                >
                  <Switch name="ai" text="AI Sessions" />
                  <Switch name="scribe" text="Scribe Sessions" />
                </ContentSwitcher>
              </div>
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
              {tabs.map(t => (
                <Tab key={t.id}>{t.label}</Tab>
              ))}
            </TabList>
            <TabPanels>
              {tabs.map(t => (
                <TabPanel key={t.id}>{t.render(filters)}</TabPanel>
              ))}
            </TabPanels>
          </Tabs>
        </Section>
      </Theme>
    </div>
  );
};
