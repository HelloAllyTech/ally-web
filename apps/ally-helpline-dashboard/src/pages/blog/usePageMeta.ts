import { useEffect } from "react";

/**
 * Sets the document title and the sharing/meta tags for a public blog page.
 *
 * IMPORTANT — what this does and does not buy us. These tags are written by
 * JavaScript after the bundle boots. Search crawlers that render JS (Googlebot)
 * will see them; the social scrapers behind link previews (WhatsApp, Slack,
 * LinkedIn, Facebook, X) do NOT run JS — they read the raw HTML response — so
 * they still see the defaults baked into index.html. Fixing link previews needs
 * the tags present in the HTML that leaves the server; see the note in
 * BlogPost.tsx.
 *
 * Every tag is reverted on unmount so a client-side navigation from a post back
 * to the index doesn't leave that post's title and image behind.
 */

export interface PageMeta {
  title: string;
  description?: string;
  /** Absolute URL. Relative values are resolved against the current origin. */
  image?: string | null;
  /** Absolute canonical URL for this page. */
  url?: string;
  type?: "website" | "article";
  /** ISO timestamp, emitted as article:published_time for `type: "article"`. */
  publishedTime?: string | null;
}

type Revert = () => void;

const upsertMeta = (attr: "name" | "property", key: string, content: string): Revert => {
  const existing = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  const element = existing ?? document.createElement("meta");

  if (!existing) {
    element.setAttribute(attr, key);
    document.head.appendChild(element);
  }

  const previous = existing?.getAttribute("content") ?? null;
  element.setAttribute("content", content);

  return () => {
    if (!existing) element.remove();
    else if (previous === null) element.removeAttribute("content");
    else element.setAttribute("content", previous);
  };
};

const upsertCanonical = (href: string): Revert => {
  const existing = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  const element = existing ?? document.createElement("link");

  if (!existing) {
    element.setAttribute("rel", "canonical");
    document.head.appendChild(element);
  }

  const previous = existing?.getAttribute("href") ?? null;
  element.setAttribute("href", href);

  return () => {
    if (!existing) element.remove();
    else if (previous === null) element.removeAttribute("href");
    else element.setAttribute("href", previous);
  };
};

const toAbsolute = (value: string) => {
  try {
    return new URL(value, window.location.origin).href;
  } catch {
    return value;
  }
};

export const usePageMeta = ({
  title,
  description,
  image,
  url,
  type = "website",
  publishedTime,
}: PageMeta) => {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = title;

    const reverts: Revert[] = [
      upsertMeta("property", "og:title", title),
      upsertMeta("property", "og:type", type),
      upsertMeta("property", "og:site_name", "Ally"),
      upsertMeta("name", "twitter:title", title),
    ];

    if (description) {
      reverts.push(
        upsertMeta("name", "description", description),
        upsertMeta("property", "og:description", description),
        upsertMeta("name", "twitter:description", description),
      );
    }

    if (image) {
      const absolute = toAbsolute(image);
      reverts.push(
        upsertMeta("property", "og:image", absolute),
        upsertMeta("name", "twitter:image", absolute),
        // A post with artwork deserves the large preview; without one, the
        // summary card avoids stretching a placeholder across the preview.
        upsertMeta("name", "twitter:card", "summary_large_image"),
      );
    } else {
      reverts.push(upsertMeta("name", "twitter:card", "summary"));
    }

    if (url) {
      const absolute = toAbsolute(url);
      reverts.push(upsertMeta("property", "og:url", absolute), upsertCanonical(absolute));
    }

    if (type === "article" && publishedTime) {
      reverts.push(upsertMeta("property", "article:published_time", publishedTime));
    }

    return () => {
      document.title = previousTitle;
      // Revert in reverse so a tag touched more than once lands back on the
      // value it held before this effect ran.
      reverts.reverse().forEach(revert => revert());
    };
  }, [title, description, image, url, type, publishedTime]);
};
