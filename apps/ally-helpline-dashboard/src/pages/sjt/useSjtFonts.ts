import { useEffect } from "react";

const FONTS_HREF =
  "https://fonts.googleapis.com/css2?family=Familjen+Grotesk:wght@400;500;600;700" +
  "&family=Newsreader:ital,opsz,wght@0,6..72,300..500;1,6..72,300..400" +
  "&family=IBM+Plex+Mono:wght@400;500&display=swap";

/**
 * Loads the three display/body/mono faces this page's editorial look depends on.
 *
 * They live here rather than in index.html because no other route uses them —
 * baking them into the document head would make every screen in the app fetch
 * three font families it never renders. Every family in `sjt.css` has a real
 * system fallback, so the page is legible before (or without) this resolving.
 */
export const useSjtFonts = () => {
  useEffect(() => {
    // A concurrent mount (or a fast back/forward) must not append a second copy.
    const existing = document.head.querySelector<HTMLLinkElement>(`link[href="${FONTS_HREF}"]`);
    if (existing) return undefined;

    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = FONTS_HREF;
    document.head.appendChild(link);

    return () => link.remove();
  }, []);
};
