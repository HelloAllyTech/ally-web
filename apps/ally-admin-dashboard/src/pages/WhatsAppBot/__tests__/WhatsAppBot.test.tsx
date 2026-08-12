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

/**
 * Mirrors the REAL shared Tabs render — `{label} {showCount ? count || "0" : ""}` — rather than an
 * idealised version of it. An earlier mock rendered `item.count ?? ""`, which let a test pass while
 * the live strip showed a literal "0" after all seven labels. A mock that flatters the code under
 * test is worse than no mock.
 */
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
        <span key={item.id} data-testid={`tab-${item.id}`}>
          {item.label} {showCount ? item.count || "0" : ""}
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
    it("puts the open-question count in the Unanswered label", () => {
      renderAt();

      expect(screen.getByTestId("tab-unanswered").textContent).toContain("Unanswered (12)");
    });

    it("leaves showCount OFF, so no other tab renders a stray zero", () => {
      renderAt();

      // The shared Tabs applies showCount to the WHOLE strip: turning it on to badge one tab puts a
      // literal "0" after every label. This is the regression that shipped and had to be caught in a
      // browser.
      expect(screen.getByTestId("tabs").dataset.showCount).toBe("false");
      for (const id of ["corpus", "templates", "settings", "conversations", "usage"]) {
        expect(screen.getByTestId(`tab-${id}`).textContent?.trim()).not.toMatch(/\b0$/);
      }
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

    it("shows no badge at all when the queue is empty", () => {
      // "Unanswered (0)" is noise, and a badge that never disappears stops meaning "work is waiting".
      mockQueue = { count: 0 };

      renderAt();

      expect(screen.getByTestId("tab-unanswered").textContent).toContain("Unanswered");
      expect(screen.getByTestId("tab-unanswered").textContent).not.toContain("(");
    });

    it("survives the count being unavailable", () => {
      mockQueue = undefined;

      renderAt();

      expect(screen.getByTestId("tab-unanswered").textContent).not.toContain("(");
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
