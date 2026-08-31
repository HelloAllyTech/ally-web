import { renderHook } from "@testing-library/react";
import { describe, it, expect, beforeEach } from "vitest";

import { usePageMeta } from "../usePageMeta";

const content = (selector: string) =>
  document.head.querySelector<HTMLMetaElement>(selector)?.getAttribute("content") ?? null;

const canonical = () =>
  document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.getAttribute("href") ??
  null;

describe("usePageMeta", () => {
  beforeEach(() => {
    document.head.innerHTML = "";
    document.title = "Ally";
  });

  it("sets the title and the core sharing tags", () => {
    renderHook(() =>
      usePageMeta({
        title: "A post | Ally Blog",
        description: "What the post is about.",
        url: "/blog/a-post",
        type: "article",
      }),
    );

    expect(document.title).toBe("A post | Ally Blog");
    expect(content('meta[property="og:title"]')).toBe("A post | Ally Blog");
    expect(content('meta[property="og:type"]')).toBe("article");
    expect(content('meta[property="og:site_name"]')).toBe("Ally");
    expect(content('meta[name="description"]')).toBe("What the post is about.");
    expect(content('meta[property="og:description"]')).toBe("What the post is about.");
    expect(content('meta[name="twitter:description"]')).toBe("What the post is about.");
  });

  it("resolves a relative url to an absolute og:url and canonical", () => {
    renderHook(() => usePageMeta({ title: "A post", url: "/blog/a-post" }));

    expect(content('meta[property="og:url"]')).toBe(`${window.location.origin}/blog/a-post`);
    expect(canonical()).toBe(`${window.location.origin}/blog/a-post`);
  });

  it("keeps an already-absolute image url intact and asks for a large card", () => {
    renderHook(() =>
      usePageMeta({ title: "A post", image: "https://assets.example.com/blog/cover.png" }),
    );

    expect(content('meta[property="og:image"]')).toBe("https://assets.example.com/blog/cover.png");
    expect(content('meta[name="twitter:card"]')).toBe("summary_large_image");
  });

  it("falls back to a small card when the post has no image", () => {
    renderHook(() => usePageMeta({ title: "A post", image: null }));

    expect(content('meta[property="og:image"]')).toBeNull();
    expect(content('meta[name="twitter:card"]')).toBe("summary");
  });

  it("emits article:published_time only for articles", () => {
    const { unmount } = renderHook(() =>
      usePageMeta({ title: "A post", type: "article", publishedTime: "2026-08-21T10:00:00.000Z" }),
    );
    expect(content('meta[property="article:published_time"]')).toBe("2026-08-21T10:00:00.000Z");
    unmount();

    renderHook(() =>
      usePageMeta({ title: "Index", type: "website", publishedTime: "2026-08-21T10:00:00.000Z" }),
    );
    expect(content('meta[property="article:published_time"]')).toBeNull();
  });

  it("removes the tags it created when the page unmounts", () => {
    const { unmount } = renderHook(() =>
      usePageMeta({ title: "A post", description: "Desc", image: "/cover.png", url: "/blog/x" }),
    );

    unmount();

    expect(document.title).toBe("Ally");
    expect(content('meta[property="og:title"]')).toBeNull();
    expect(content('meta[property="og:image"]')).toBeNull();
    expect(canonical()).toBeNull();
  });

  it("restores pre-existing index.html defaults instead of deleting them", () => {
    document.head.innerHTML =
      '<meta name="description" content="Ally — training and support tools for helplines." />';

    const { unmount } = renderHook(() =>
      usePageMeta({ title: "A post", description: "Post specific." }),
    );
    expect(content('meta[name="description"]')).toBe("Post specific.");

    unmount();
    expect(content('meta[name="description"]')).toBe(
      "Ally — training and support tools for helplines.",
    );
  });

  it("does not leave one post's image behind when navigating to a post without one", () => {
    const { unmount } = renderHook(() =>
      usePageMeta({ title: "With image", image: "https://assets.example.com/a.png" }),
    );
    unmount();

    renderHook(() => usePageMeta({ title: "Without image", image: null }));

    expect(content('meta[property="og:image"]')).toBeNull();
    expect(content('meta[name="twitter:card"]')).toBe("summary");
  });
});
