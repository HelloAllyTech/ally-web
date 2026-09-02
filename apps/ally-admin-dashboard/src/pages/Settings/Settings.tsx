import React, { useCallback, useMemo } from "react";

import { useSearchParams } from "react-router-dom";

import { Tabs } from "@ally-ui-mono/ui-shared";
import { en } from "@constants";

import { ComfortAudioTab } from "./ComfortAudioTab";
import { LegalTab } from "./LegalTab";
import { TurnDetectionTab } from "./TurnDetectionTab";

/**
 * Platform-wide admin settings, one concern per tab.
 *
 * This was a single scroll holding four unrelated panels — two legal documents,
 * an audio library and a pair of timing knobs — under one subtitle that only
 * described the legal half. Tabs are what the page needed rather than more
 * headings: nothing here is read top-to-bottom, an operator arrives knowing
 * which of the four they came for, and the audio list grows without bound so
 * the timing fields were drifting further off-screen with every upload.
 *
 * Tab state lives in `?tab=` like every other tabbed admin page (WhatsApp Bot,
 * AI Lab, Bug Hunter), so a tab is linkable and survives a reload. Legal stays
 * the default because it was the top of the old page — a bookmarked /settings
 * opens on what it used to open on.
 */
enum SettingsTab {
  LEGAL = "legal",
  COMFORT_AUDIO = "comfort-audio",
  TURN_DETECTION = "turn-detection",
}

/**
 * One description per tab rather than one for the page. The old page-level
 * subtitle ("Edit the content shown on the public Terms of Service and Privacy
 * Policy pages") was simply untrue of three of the four panels below it.
 */
const TAB_ITEMS: { id: SettingsTab; label: string; description: string }[] = [
  {
    id: SettingsTab.LEGAL,
    label: en.settings.tabs.legal,
    description: en.settings.legalDescription,
  },
  {
    id: SettingsTab.COMFORT_AUDIO,
    label: en.settings.tabs.comfortAudio,
    description: en.comfortAudio.description,
  },
  {
    id: SettingsTab.TURN_DETECTION,
    label: en.settings.tabs.turnDetection,
    description: en.settings.turnDetectionDescription,
  },
];

const TABS_BY_ID = new Map(TAB_ITEMS.map(item => [item.id as string, item]));

export const Settings: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const activeTab = useMemo(() => {
    const requested = searchParams.get("tab");
    // An unknown ?tab= falls back to the default rather than rendering nothing,
    // so a stale bookmark or a renamed tab cannot leave the page blank.
    return requested && TABS_BY_ID.has(requested) ? requested : SettingsTab.LEGAL;
  }, [searchParams]);

  const handleTabChange = useCallback(
    (id: string) => setSearchParams({ tab: id }),
    [setSearchParams],
  );

  const renderTab = () => {
    switch (activeTab) {
      case SettingsTab.COMFORT_AUDIO:
        return <ComfortAudioTab />;
      case SettingsTab.TURN_DETECTION:
        return <TurnDetectionTab />;
      case SettingsTab.LEGAL:
      default:
        return <LegalTab />;
    }
  };

  return (
    <div className="py-[2px] font-primary h-full flex flex-col">
      <h1 className="text-2xl text-typography-900 pb-1 font-secondary">{en.settings.title}</h1>
      <p className="text-sm text-typography-600 pb-6">{en.settings.subtitle}</p>

      {/* `showCount={false}`: the shared strip renders a literal "0" beside any
          tab without a count, and none of these three is a countable collection. */}
      <div className="shrink-0">
        <Tabs items={TAB_ITEMS} activeId={activeTab} onChange={handleTabChange} showCount={false} />
      </div>

      {/* The page lives inside a fixed-height layout, and the panels (rich-text
          editors, an unbounded track list) grow with their content, so they need
          their own scroll area. min-h-0 lets this flex child shrink below its
          content height so overflow-y-auto can kick in. */}
      <div className="flex-1 min-h-0 overflow-y-auto pr-1">
        <div className="pt-6 pb-6">
          <p className="text-sm text-typography-600 pb-6 max-w-3xl">
            {TABS_BY_ID.get(activeTab)?.description}
          </p>
          {renderTab()}
        </div>
      </div>
    </div>
  );
};
