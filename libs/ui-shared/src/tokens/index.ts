/**
 * JS mirror of the locked Carbon serif design tokens, for the few consumers
 * that need token values in JavaScript (inline styles, canvas/chart configs)
 * rather than via CSS `--cds-*` variables or Tailwind utilities.
 *
 * These values match the `carbon` preset that the apps have standardised on
 * (brand blue interactive colour, 2px corners, IBM Plex Serif). This replaces
 * the former per-theme `THEME_TOKENS` map in the helpline app.
 */
export const carbonTokens = {
  mode: "light" as const,
  /** Brand blue (interactive). Replaces Carbon Blue 60 (#0f62fe). */
  primary: "#264D8E",
  danger: "#da1e28",
  success: "#24a148",
  warning: "#ff832b",
  background: { default: "#ffffff", paper: "#ffffff" },
  /** Carbon corner radius, in px. */
  radius: 2,
  fontFamilySerif: '"IBM Plex Serif", serif',
  fontFamilyMono: "'IBM Plex Mono', system-ui, -apple-system, BlinkMacSystemFont, monospace",
} as const;

export type CarbonTokens = typeof carbonTokens;
