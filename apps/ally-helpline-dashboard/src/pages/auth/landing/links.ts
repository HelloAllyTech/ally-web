/**
 * The contact button's address is copy, edited in the admin console's
 * Translation Management like every other word on the sign-in page. That makes
 * it untrusted input to an href: a `javascript:` value would run script on the
 * one page every user visits signed out. Only web and mail links get through;
 * anything else (including the bare key i18next returns when the value is
 * missing) falls back to the given address.
 */
const SAFE_LINK = /^(https?:\/\/|mailto:)\S+$/i;

export const safeLink = (value: string | undefined, fallback: string): string => {
  const trimmed = value?.trim() ?? "";
  return SAFE_LINK.test(trimmed) ? trimmed : fallback;
};

/** Ids of the sign-in page's sections, for its in-page links. */
export const SECTION_IDS = {
  top: "top",
  inside: "inside",
  privacy: "privacy",
} as const;

/** In-page anchors scroll inside the page's own scroll container. */
export const scrollToSection = (id: string) => {
  const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;
  document
    .getElementById(id)
    ?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
};
