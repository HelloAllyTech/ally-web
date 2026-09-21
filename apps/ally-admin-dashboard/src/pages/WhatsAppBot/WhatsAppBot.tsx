import React, { useCallback, useMemo } from "react";

import { useSearchParams } from "react-router-dom";

import { Tabs } from "@ally-ui-mono/ui-shared";
import { useGetWaUnansweredQuery } from "@api";
import { en } from "@constants";
import { WaUnansweredStatus } from "@types";

import { BotSettingsTab } from "./BotSettingsTab";
import { ConversationsTab } from "./ConversationsTab";
import { CorpusTab } from "./CorpusTab";
import { TemplatesTab } from "./TemplatesTab";
import { TestConsoleTab } from "./TestConsoleTab";
import { UnansweredTab } from "./UnansweredTab";
import { UsageTab } from "./UsageTab";

/**
 * WhatsApp Q&A bot admin.
 *
 * Gated in two places, matching every other feature-toggle-gated tab here: the
 * `whatsapp_bot` entry in `buildSidebarItemFeatureKeyMap` (utils/navigation.ts)
 * hides the sidebar entry, and `requiredFeature={FeatureToggleKey.WHATSAPP_BOT}`
 * on the route in RouteLayout blocks direct navigation. There is deliberately
 * no `Permissions` member — Settings, Logs,
 * Tooltips and Badges are all pure role/toggle gates, and adding one would need
 * a backend grant migration for zero extra gating.
 *
 * Known platform inconsistency worth naming: PrivateLayout compares the singular `userData.role`
 * while the repo's own CLAUDE.md says to gate on the `roles` array (the singular is a lossy legacy
 * collapse). This tab follows the existing pattern rather than diverging alone; fixing it is a
 * platform-wide change.
 *
 * All seven sub-tabs are shipped. The Usage tab is a lazy boundary rather than a direct import, so
 * `@carbon/charts` stays out of this route's eager bundle — see UsageTab.tsx.
 */
enum WhatsAppBotTab {
  CORPUS = "corpus",
  TEMPLATES = "templates",
  TEST_CONSOLE = "test-console",
  SETTINGS = "settings",
  CONVERSATIONS = "conversations",
  UNANSWERED = "unanswered",
  USAGE = "usage",
}

const TAB_ITEMS: { id: WhatsAppBotTab; label: string; count?: number }[] = [
  { id: WhatsAppBotTab.CORPUS, label: en.whatsappBot.tabs.corpus },
  { id: WhatsAppBotTab.TEMPLATES, label: en.whatsappBot.tabs.templates },
  { id: WhatsAppBotTab.TEST_CONSOLE, label: en.whatsappBot.tabs.testConsole },
  { id: WhatsAppBotTab.SETTINGS, label: en.whatsappBot.tabs.settings },
  { id: WhatsAppBotTab.CONVERSATIONS, label: en.whatsappBot.tabs.conversations },
  { id: WhatsAppBotTab.UNANSWERED, label: en.whatsappBot.tabs.unanswered },
  { id: WhatsAppBotTab.USAGE, label: en.whatsappBot.tabs.usage },
];

const VALID_TABS = new Set<string>(TAB_ITEMS.map(t => t.id));

export const WhatsAppBot: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  // The open-queue size, shown on the tab itself. This is the one number in the whole feature that
  // an operator needs without opening anything: a corpus gap is work waiting, and a worklist you
  // have to click into to discover is a worklist that grows unnoticed. `limit: 1` because only the
  // count is used — the rows come from the tab's own query.
  const { data: openQueue } = useGetWaUnansweredQuery({
    limit: 1,
    status: WaUnansweredStatus.OPEN,
  });

  /**
   * The open-queue size goes in the LABEL, not into `count` with `showCount`.
   *
   * The shared Tabs renders `showCount ? item.count || "0" : ""` — one flag for the whole strip — so
   * enabling it to badge a single tab puts a literal "0" after all seven labels. Fixing that in
   * ui-shared is the better answer but is a shared-surface change needing all three app suites; this
   * gets the same result with no blast radius.
   *
   * Only rendered when something is actually waiting: "Unanswered (0)" is noise, and a badge that
   * never disappears stops meaning "there is work here".
   */
  const tabItems = useMemo(() => {
    const open = openQueue?.count ?? 0;
    return TAB_ITEMS.map(item =>
      item.id === WhatsAppBotTab.UNANSWERED && open > 0
        ? { ...item, label: `${item.label} (${open})` }
        : item,
    );
  }, [openQueue?.count]);

  const activeTab = useMemo(() => {
    const requested = searchParams.get("tab");
    // An unknown ?tab= falls back to the default rather than rendering nothing, so a stale
    // bookmark or a renamed tab cannot leave the page blank.
    return requested && VALID_TABS.has(requested) ? requested : WhatsAppBotTab.CORPUS;
  }, [searchParams]);

  // Changing tabs drops any row-level deep link, so switching to Conversations from a link that
  // opened one thread does not leave that thread pinned open under a different tab.
  const handleTabChange = useCallback(
    (id: string) => setSearchParams({ tab: id }),
    [setSearchParams],
  );

  const renderTab = () => {
    switch (activeTab) {
      case WhatsAppBotTab.TEMPLATES:
        return <TemplatesTab />;
      case WhatsAppBotTab.TEST_CONSOLE:
        return <TestConsoleTab />;
      case WhatsAppBotTab.SETTINGS:
        return <BotSettingsTab />;
      case WhatsAppBotTab.CONVERSATIONS:
        return <ConversationsTab />;
      case WhatsAppBotTab.UNANSWERED:
        return <UnansweredTab />;
      case WhatsAppBotTab.USAGE:
        return <UsageTab />;
      case WhatsAppBotTab.CORPUS:
      default:
        return <CorpusTab />;
    }
  };

  return (
    <div className="py-[2px] font-primary relative">
      <h1 className="text-2xl text-typography-900 pb-1 font-secondary">{en.whatsappBot.title}</h1>
      <p className="text-sm text-typography-600 pb-6">{en.whatsappBot.subtitle}</p>
      <Tabs items={tabItems} activeId={activeTab} onChange={handleTabChange} showCount={false} />
      {renderTab()}
    </div>
  );
};
