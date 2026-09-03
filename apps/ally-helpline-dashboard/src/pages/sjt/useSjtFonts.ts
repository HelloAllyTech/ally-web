import { useEffect } from "react";

/**
 * Two serif families and nothing else — the page uses no sans and no monospace.
 * Source Serif 4 stands in for Claude's Copernicus (headings, controls, the
 * letterspaced labels); Newsreader stands in for Tiempos Text (running prose).
 * Both are variable, so one request covers every weight the page asks for.
 */
const FONTS_HREF =
  "https://fonts.googleapis.com/css2?family=Source+Serif+4:opsz,wght@8..60,400..700" +
  "&family=Newsreader:ital,opsz,wght@0,6..72,300..500;1,6..72,300..400" +
  "&display=swap";

/**
 * Loads the two serif faces this page's look depends on.
 *
 * They live here rather than in index.html because no other route uses them —
 * baking them into the document head would make every screen in the app fetch
 * families it never renders. Both fall back to Georgia in `sjt.css`, so the
 * page is legible in the right key before (or without) this resolving.
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
