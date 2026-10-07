import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";

import { ALLY_URL } from "@constants";

import i18n from "../../../../i18n";
import { en } from "../../../../i18n/locales";
import { LandingSections } from "../LandingSections";

const CONTACT_KEY = "landing.contact.href";
const shippedContactHref = en.landing.contact.href;

const renderSections = () =>
  render(
    <MemoryRouter>
      <LandingSections />
    </MemoryRouter>,
  );

/*
 * The contact address is copy an admin edits in Translation Management. These
 * set it the way a published edit arrives — a resource layered over the
 * shipped bundle — and check what the page does with it.
 */
describe("LandingSections contact link", () => {
  afterEach(() => {
    i18n.addResource("en", "translation", CONTACT_KEY, shippedContactHref);
  });

  it("links to the address set in the copy", () => {
    i18n.addResource("en", "translation", CONTACT_KEY, "mailto:team@example.org");
    renderSections();

    const link = screen.getByRole("link", { name: /get in touch/i });
    expect(link.getAttribute("href")).toBe("mailto:team@example.org");
    expect(link.getAttribute("target")).toBeNull();
  });

  it("opens a web address in a new tab", () => {
    renderSections();

    const link = screen.getByRole("link", { name: /get in touch/i });
    expect(link.getAttribute("href")).toBe(shippedContactHref);
    expect(link.getAttribute("target")).toBe("_blank");
    expect(link.getAttribute("rel")).toBe("noopener noreferrer");
  });

  it("refuses a script link and falls back to the Ally website", () => {
    i18n.addResource("en", "translation", CONTACT_KEY, "javascript:alert(document.cookie)");
    renderSections();

    expect(screen.getByRole("link", { name: /get in touch/i }).getAttribute("href")).toBe(ALLY_URL);
  });
});

describe("LandingSections privacy promises", () => {
  it("reuses the Scribe carousel's wording, so one edit changes both", () => {
    renderSections();

    expect(screen.getByText(i18n.t("carousel.slides.noRecording"))).not.toBeNull();
    expect(screen.getByText(i18n.t("carousel.slides.encrypted"))).not.toBeNull();
  });
});
