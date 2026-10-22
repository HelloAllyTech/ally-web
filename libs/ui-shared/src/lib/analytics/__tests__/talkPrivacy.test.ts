import { afterEach, describe, expect, it, vi } from "vitest";

import { buildGtmHeadSnippet, isTalkPath } from "../gtmSnippet";
import { isGtmLoaded, talkDocumentNeedsReload } from "../talkPrivacy";

/** Runs the snippet the way index.html does, against a fake window at `pathname`. */
const runSnippet = (pathname: string) => {
  const inserted: { src: string }[] = [];
  const firstScript = { parentNode: { insertBefore: (el: { src: string }) => inserted.push(el) } };
  const fakeDocument = {
    getElementsByTagName: () => [firstScript],
    createElement: () => ({ src: "", async: false }),
  };
  const fakeWindow: Record<string, unknown> = { location: { pathname } };
  // eslint-disable-next-line @typescript-eslint/no-implied-eval
  new Function("window", "document", buildGtmHeadSnippet("GTM-ABC123"))(fakeWindow, fakeDocument);
  return { inserted, dataLayer: fakeWindow.dataLayer as unknown[] | undefined };
};

const memoryStorage = () => {
  const values = new Map<string, string>();
  return {
    getItem: vi.fn((key: string) => values.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => void values.set(key, value)),
    removeItem: vi.fn((key: string) => void values.delete(key)),
  };
};

describe("talker page privacy — GTM", () => {
  afterEach(() => {
    document.head.innerHTML = "";
  });

  it("matches /talk and everything under it, nothing else", () => {
    expect(isTalkPath("/talk")).toBe(true);
    expect(isTalkPath("/talk/acme")).toBe(true);
    expect(isTalkPath("/talking-points")).toBe(false);
    expect(isTalkPath("/learn")).toBe(false);
    expect(isTalkPath(undefined)).toBe(false);
  });

  it("the index.html snippet loads GTM on app pages", () => {
    const { inserted, dataLayer } = runSnippet("/learn");
    expect(inserted).toHaveLength(1);
    expect(inserted[0].src).toContain("googletagmanager.com/gtm.js?id=GTM-ABC123");
    expect(dataLayer).toHaveLength(1);
  });

  it("the index.html snippet loads nothing and creates no dataLayer on /talk", () => {
    for (const path of ["/talk", "/talk/acme"]) {
      const { inserted, dataLayer } = runSnippet(path);
      expect(inserted).toHaveLength(0);
      expect(dataLayer).toBeUndefined();
    }
  });

  it("detects a GTM loader already in the document", () => {
    expect(isGtmLoaded()).toBe(false);
    const script = document.createElement("script");
    script.src = "https://www.googletagmanager.com/gtm.js?id=GTM-ABC123";
    document.head.appendChild(script);
    expect(isGtmLoaded()).toBe(true);
  });
});

describe("talker page privacy — reload after in-app navigation", () => {
  afterEach(() => {
    document.head.innerHTML = "";
  });

  it("a clean full load of /talk needs no reload", () => {
    expect(
      talkDocumentNeedsReload({
        pathname: "/talk/acme",
        posthogPersistent: false,
        storage: memoryStorage(),
      }),
    ).toBe(false);
  });

  it("reloads once when a persistent PostHog or GTM came along from another page", () => {
    const storage = memoryStorage();
    expect(
      talkDocumentNeedsReload({ pathname: "/talk/acme", posthogPersistent: true, storage }),
    ).toBe(true);
    // The reload didn't clean up (say, an extension) — never ask again for this path.
    expect(
      talkDocumentNeedsReload({ pathname: "/talk/acme", posthogPersistent: true, storage }),
    ).toBe(false);
  });

  it("a clean load clears the marker, so a later in-app visit reloads again", () => {
    const storage = memoryStorage();
    const script = document.createElement("script");
    script.src = "https://www.googletagmanager.com/gtm.js?id=GTM-ABC123";
    document.head.appendChild(script);
    expect(
      talkDocumentNeedsReload({ pathname: "/talk/acme", posthogPersistent: false, storage }),
    ).toBe(true);
    document.head.innerHTML = "";
    expect(
      talkDocumentNeedsReload({ pathname: "/talk/acme", posthogPersistent: false, storage }),
    ).toBe(false);
    expect(storage.removeItem).toHaveBeenCalled();
  });

  it("without storage, leaves a document that is already a reload alone", () => {
    expect(
      talkDocumentNeedsReload({
        pathname: "/talk/acme",
        posthogPersistent: true,
        storage: null,
        navigationType: "navigate",
      }),
    ).toBe(true);
    expect(
      talkDocumentNeedsReload({
        pathname: "/talk/acme",
        posthogPersistent: true,
        storage: null,
        navigationType: "reload",
      }),
    ).toBe(false);
  });

  it("never reloads app pages", () => {
    expect(
      talkDocumentNeedsReload({
        pathname: "/learn",
        posthogPersistent: true,
        storage: memoryStorage(),
      }),
    ).toBe(false);
  });
});
