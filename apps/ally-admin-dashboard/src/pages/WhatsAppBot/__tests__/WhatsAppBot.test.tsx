import React from "react";

import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The shell's job beyond routing is the QUEUE BADGE.
 *
 * The unanswered queue is the only tab holding work that arrives on its own. A count an operator has
 * to click into to discover is a count that grows unnoticed, so it belongs on the tab itself — and it
 * must be the OPEN count, not the total, or a queue that has been fully triaged would still read as
 * a pile of outstanding work.
 */
vi.mock("@constants", () => ({
  en: {
    whatsappBot: {
      title: "WhatsApp Bot",
      subtitle: "Answer workers' questions from vetted material.",
      tabs: {
        corpus: "Corpus",
        templates: "Templates",
        testConsole: "Test Console",
        settings: "Settings",
        conversations: "Conversations",
        unanswered: "Unanswered",
        usage: "Usage",
      },
    },
  },
}));

const unansweredQuerySpy = vi.fn();

vi.mock("@api", () => ({
  useGetWaUnansweredQuery: (params: unknown) => {
    unansweredQuerySpy(params);
    return { data: mockQueue };
  },
}));

vi.mock("@ally-ui-mono/ui-shared", () => ({
  Tabs: ({
    items,
    showCount,
  }: {
    items: { id: string; label: string; count?: number }[];
    showCount?: boolean;
  }) => (
    <div data-testid="tabs" data-show-count={String(showCount)}>
      {items.map(item => (
        <span key={item.id} data-testid={`tab-${item.id}`} data-count={item.count ?? ""}>
          {item.label}
        </span>
      ))}
    </div>
  ),
}));

vi.mock("../CorpusTab", () => ({ CorpusTab: () => <div data-testid="corpus" /> }));
vi.mock("../TemplatesTab", () => ({ TemplatesTab: () => <div /> }));
vi.mock("../TestConsoleTab", () => ({ TestConsoleTab: () => <div /> }));
vi.mock("../BotSettingsTab", () => ({ BotSettingsTab: () => <div /> }));
vi.mock("../ConversationsTab", () => ({
  ConversationsTab: () => <div data-testid="conversations" />,
}));
vi.mock("../UnansweredTab", () => ({ UnansweredTab: () => <div data-testid="unanswered" /> }));
vi.mock("../UsageTab", () => ({ UsageTab: () => <div data-testid="usage" /> }));

let mockQueue: { count: number } | undefined;

const { WhatsAppBot } = await import("../WhatsAppBot");

const renderAt = (path = "/whatsapp-bot") =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <WhatsAppBot />
    </MemoryRouter>,
  );

describe("WhatsAppBot shell", () => {
  beforeEach(() => {
    unansweredQuerySpy.mockClear();
    mockQueue = { count: 12 };
  });

  describe("the queue badge", () => {
    it("puts the open-question count on the Unanswered tab", () => {
      renderAt();

      expect(screen.getByTestId("tab-unanswered").dataset.count).toBe("12");
      expect(screen.getByTestId("tabs").dataset.showCount).toBe("true");
    });

    it("counts only OPEN questions", () => {
      renderAt();

      // A badge counting triaged and dismissed items too would never fall, so it would stop meaning
      // "there is work here" within a week of going live.
      const params = unansweredQuerySpy.mock.calls[0]?.[0] as { status?: string; limit?: number };
      expect(params.status).toBe("open");
      // Only the count is read; the rows come from the tab's own query.
      expect(params.limit).toBe(1);
    });

    it("carries no count on the other tabs, so none of them render a zero", () => {
      renderAt();

      for (const id of ["corpus", "templates", "settings", "conversations", "usage"]) {
        expect(screen.getByTestId(`tab-${id}`).dataset.count).toBe("");
      }
    });

    it("survives the count being unavailable", () => {
      mockQueue = undefined;

      renderAt();

      expect(screen.getByTestId("tab-unanswered").dataset.count).toBe("0");
    });
  });

  describe("tab routing", () => {
    it("defaults to the corpus", () => {
      renderAt();
      expect(screen.getByTestId("corpus")).toBeTruthy();
    });

    it("honours ?tab=", () => {
      renderAt("/whatsapp-bot?tab=unanswered");
      expect(screen.getByTestId("unanswered")).toBeTruthy();
    });

    it("falls back to the default rather than rendering nothing for an unknown tab", () => {
      // A stale bookmark or a renamed tab must not leave the page blank.
      renderAt("/whatsapp-bot?tab=nonsense");
      expect(screen.getByTestId("corpus")).toBeTruthy();
    });

    it("opens the conversations tab when a thread is deep-linked", () => {
      renderAt("/whatsapp-bot?tab=conversations&conversation=conv-1");
      expect(screen.getByTestId("conversations")).toBeTruthy();
    });
  });
});
