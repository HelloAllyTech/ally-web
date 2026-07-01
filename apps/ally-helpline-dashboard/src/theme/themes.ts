/**
 * Theme contract — single source of truth shared by the Tailwind CSS variables
 * (see index.css), the MUI theme factory (see theme/index.ts) and the theme
 * picker UI (ProfileSettings).
 *
 * Each theme is a full look-and-feel bundle (colours + fonts + corner radius +,
 * later, spacing/shadow) selected via the `data-theme` attribute on <html>.
 * Each id maps to a `[data-theme="<id>"]` block in index.css.
 *
 * The three themes (current/claude/carbon) are effectively distinct design
 * systems, but the feature is referred to internally as "theme" throughout; the
 * persisted + backend preference key stays `ui_theme`.
 */
export const UI_THEMES = ["current", "claude", "carbon"] as const;

export type UiTheme = (typeof UI_THEMES)[number];

/** Default theme — reproduces the app's original (pre-multi-theme) look exactly. */
export const DEFAULT_UI_THEME: UiTheme = "current";

/** Legacy colour-theme ids that predate the multi-theme model. */
const LEGACY_THEME_IDS = ["daylight", "forest", "sunset"] as const;

/** Runtime guard for values coming back from the (untyped) preferences API. */
export const isUiTheme = (value: unknown): value is UiTheme =>
  typeof value === "string" && (UI_THEMES as readonly string[]).includes(value);

/**
 * Normalise any stored/legacy value to a valid theme. Values persisted before
 * this change (`daylight`/`forest`/`sunset`) collapse to `current` (the
 * zero-regression look); anything unrecognised falls back to the default. Keep
 * this logic mirrored in the inline pre-hydration script in index.html.
 */
export const normalizeUiTheme = (value: unknown): UiTheme => {
  if (isUiTheme(value)) return value;
  if (typeof value === "string" && (LEGACY_THEME_IDS as readonly string[]).includes(value)) {
    return "current";
  }
  return DEFAULT_UI_THEME;
};

/**
 * Picker metadata + preview descriptors, keyed by theme. `labelKey`/
 * `descKey` are i18n keys; `swatch` powers the compact gradient chip; the rest
 * drive the richer preview cards (font sample, palette chips, sample shapes).
 */
export const THEME_META: Record<
  UiTheme,
  {
    labelKey: string;
    descKey: string;
    /** Compact 3-stop gradient swatch [bg, primary, text]. */
    swatch: [string, string, string];
    /** CSS font-family used to render the card's font sample. */
    fontSampleFamily: string;
    /** Human-readable font pairing caption. */
    fontPair: string;
    /** Preview palette chips [primary-900, primary-500, bg-tertiary, bg-DEFAULT]. */
    chips: [string, string, string, string];
    /** Button corner radius used in the preview. */
    buttonRadius: string;
    /** Card corner radius used in the preview. */
    cardRadius: string;
    /** Selected-ring / accent colour. */
    accent: string;
  }
> = {
  current: {
    labelKey: "profile.settings.appearance.current",
    descKey: "profile.settings.appearance.current_desc",
    swatch: ["#FFFFFF", "#0957D0", "#10264C"],
    fontSampleFamily: '"IBM Plex Serif", serif',
    fontPair: "IBM Plex Serif · Replay Pro",
    chips: ["#10264C", "#0957D0", "#F3F4F6", "#FFFFFF"],
    buttonRadius: "100px",
    cardRadius: "20px",
    accent: "#0957D0",
  },
  claude: {
    labelKey: "profile.settings.appearance.claude",
    descKey: "profile.settings.appearance.claude_desc",
    swatch: ["#F5F4EE", "#CC785C", "#4A291F"],
    fontSampleFamily: 'Georgia, "Times New Roman", serif',
    fontPair: "Serif display · clean sans",
    chips: ["#4A291F", "#CC785C", "#EAE7DE", "#F5F4EE"],
    buttonRadius: "10px",
    cardRadius: "16px",
    accent: "#CC785C",
  },
  carbon: {
    labelKey: "profile.settings.appearance.carbon",
    descKey: "profile.settings.appearance.carbon_desc",
    swatch: ["#FFFFFF", "#0f62fe", "#161616"],
    fontSampleFamily: '"IBM Plex Serif", serif',
    fontPair: "IBM Plex Serif · 2px corners",
    chips: ["#161616", "#0f62fe", "#e0e0e0", "#f4f4f4"],
    buttonRadius: "0px",
    cardRadius: "2px",
    accent: "#0f62fe",
  },
};

/**
 * JS mirror of the per-theme tokens that MUI needs at theme-build time (MUI
 * reads JS values, not CSS variables). Keep the hex/radius values in sync with
 * the `[data-theme]` blocks in index.css.
 */
export const THEME_TOKENS: Record<
  UiTheme,
  {
    mode: "light" | "dark";
    primary: string;
    background: { default: string; paper: string };
    fontFamily: string;
    radius: number;
  }
> = {
  current: {
    mode: "light",
    primary: "#0957D0",
    background: { default: "#FFFFFF", paper: "#FFFFFF" },
    fontFamily: ['"IBM Plex Serif"', "serif"].join(","),
    radius: 12,
  },
  claude: {
    mode: "light",
    primary: "#CC785C",
    background: { default: "#F5F4EE", paper: "#FFFFFF" },
    fontFamily: [
      "-apple-system",
      "BlinkMacSystemFont",
      '"Segoe UI"',
      "Roboto",
      '"Helvetica Neue"',
      "Arial",
      "sans-serif",
    ].join(","),
    radius: 10,
  },
  carbon: {
    mode: "light",
    primary: "#0f62fe",
    background: { default: "#FFFFFF", paper: "#FFFFFF" },
    fontFamily: ['"IBM Plex Serif"', "serif"].join(","),
    radius: 2,
  },
};
