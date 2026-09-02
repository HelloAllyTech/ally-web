import React from "react";

import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

/**
 * The shell's job is TAB ROUTING and, just as importantly, the per-tab
 * description.
 *
 * Before this page had tabs, all four panels shared one subtitle that described
 * only the legal ones — so an operator on the audio library or the timing knobs
 * read a sentence about Terms of Service. A tabbed page that keeps a single
 * page-level description reintroduces exactly that, which is why the
 * description is asserted per tab and not just once.
 */
vi.mock("@constants", () => ({
  en: {
    settings: {
      title: "Settings",
      subtitle: "Platform-wide configuration. Changes apply to every organisation.",
      tabs: {
        legal: "Legal",
        comfortAudio: "Comfort Audio",
        turnDetection: "Turn Detection",
      },
      legalDescription: "Edit the content shown on the public legal pages.",
      turnDetectionDescription: "How long a roleplay agent waits before replying.",
    },
    comfortAudio: {
      description: "Upload ambient audio tracks scenario authors can play under a roleplay.",
    },
  },
}));

/**
 * Mirrors the REAL shared Tabs render — `{label} {showCount ? count || "0" : ""}`
 * — rather than an idealised version, so a mock cannot hide the stray "0" the
 * real strip prints for a countless tab.
 */
vi.mock("@ally-ui-mono/ui-shared", () => ({
  Tabs: ({
    items,
    activeId,
    onChange,
    showCount,
  }: {
    items: { id: string; label: string; count?: number }[];
    activeId: string;
    onChange: (id: string) => void;
    showCount?: boolean;
  }) => (
    <div data-testid="tabs" data-show-count={String(showCount)} data-active={activeId}>
      {items.map(item => (
        <button key={item.id} data-testid={`tab-${item.id}`} onClick={() => onChange(item.id)}>
          {item.label} {showCount ? item.count || "0" : ""}
        </button>
      ))}
    </div>
  ),
}));

vi.mock("../LegalTab", () => ({ LegalTab: () => <div data-testid="legal-panel" /> }));
vi.mock("../ComfortAudioTab", () => ({
  ComfortAudioTab: () => <div data-testid="comfort-audio-panel" />,
}));
vi.mock("../TurnDetectionTab", () => ({
  TurnDetectionTab: () => <div data-testid="turn-detection-panel" />,
}));

const { Settings } = await import("../Settings");

const renderAt = (path = "/settings") =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Settings />
    </MemoryRouter>,
  );

describe("Settings shell", () => {
  describe("tab routing", () => {
    it("defaults to Legal, which is where the old single-scroll page started", () => {
      renderAt();

      expect(screen.getByTestId("legal-panel")).toBeTruthy();
      expect(screen.queryByTestId("comfort-audio-panel")).toBeNull();
      expect(screen.queryByTestId("turn-detection-panel")).toBeNull();
    });

    it("honours ?tab=, so a tab is linkable and survives a reload", () => {
      renderAt("/settings?tab=turn-detection");

      expect(screen.getByTestId("turn-detection-panel")).toBeTruthy();
      expect(screen.queryByTestId("legal-panel")).toBeNull();
    });

    it("falls back to the default rather than rendering nothing for an unknown tab", () => {
      // A stale bookmark or a renamed tab must not leave the page blank.
      renderAt("/settings?tab=nonsense");

      expect(screen.getByTestId("legal-panel")).toBeTruthy();
    });

    it("switches panel and writes ?tab= when a tab is clicked", async () => {
      renderAt();

      // act() around the click: setSearchParams updates the router itself, which
      // React sees as a state update outside the event's own act scope.
      await act(async () => {
        await userEvent.click(screen.getByTestId("tab-comfort-audio"));
      });

      expect(screen.getByTestId("comfort-audio-panel")).toBeTruthy();
      expect(screen.queryByTestId("legal-panel")).toBeNull();
      // Reflected back through the URL, not held in component state, so the
      // strip and the panel can never disagree.
      expect(screen.getByTestId("tabs").dataset.active).toBe("comfort-audio");
    });
  });

  describe("the per-tab description", () => {
    it("describes the legal documents on the Legal tab", () => {
      renderAt();

      expect(screen.getByText("Edit the content shown on the public legal pages.")).toBeTruthy();
    });

    it("describes the audio library on the Comfort Audio tab", () => {
      renderAt("/settings?tab=comfort-audio");

      expect(
        screen.getByText("Upload ambient audio tracks scenario authors can play under a roleplay."),
      ).toBeTruthy();
      // The regression this replaces: the legal copy shown over the audio library.
      expect(screen.queryByText("Edit the content shown on the public legal pages.")).toBeNull();
    });

    it("describes the timing knobs on the Turn Detection tab", () => {
      renderAt("/settings?tab=turn-detection");

      expect(screen.getByText("How long a roleplay agent waits before replying.")).toBeTruthy();
      expect(screen.queryByText("Edit the content shown on the public legal pages.")).toBeNull();
    });
  });

  it("leaves showCount OFF, so no tab renders a stray zero", () => {
    renderAt();

    expect(screen.getByTestId("tabs").dataset.showCount).toBe("false");
    for (const id of ["legal", "comfort-audio", "turn-detection"]) {
      expect(screen.getByTestId(`tab-${id}`).textContent?.trim()).not.toMatch(/\b0$/);
    }
  });
});
