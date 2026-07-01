/**
 * UI theme contract — single source of truth shared by the Tailwind CSS
 * variables (see index.css), the MUI theme factory (see theme/index.ts) and
 * the theme picker UI (ProfileSettings).
 *
 * Each theme id maps to a `[data-theme="<id>"]` block in index.css that
 * overrides the `--color-*` CSS variables consumed by the Tailwind palette.
 */
export const UI_THEMES = ["daylight", "midnight", "forest", "sunset", "ocean"] as const;

export type UiTheme = (typeof UI_THEMES)[number];

/** Default theme — reproduces the app's original (pre-theming) look exactly. */
export const DEFAULT_UI_THEME: UiTheme = "daylight";

/**
 * Picker metadata: i18n label key + three preview colours used to render the
 * swatch. Colours are illustrative only; the real palette lives in index.css.
 */
export const THEME_META: Record<UiTheme, { labelKey: string; swatch: [string, string, string] }> = {
  daylight: {
    labelKey: "profile.settings.appearance.daylight",
    swatch: ["#FFFFFF", "#0957D0", "#10264C"],
  },
  midnight: {
    labelKey: "profile.settings.appearance.midnight",
    swatch: ["#12121B", "#7AA2F7", "#E7EDFF"],
  },
  forest: {
    labelKey: "profile.settings.appearance.forest",
    swatch: ["#F4F8F0", "#2E7D4F", "#1B3A2B"],
  },
  sunset: {
    labelKey: "profile.settings.appearance.sunset",
    swatch: ["#FFF6F0", "#E4572E", "#7A2E1E"],
  },
  ocean: {
    labelKey: "profile.settings.appearance.ocean",
    swatch: ["#0E1F2B", "#2EC4C6", "#D6F0F2"],
  },
};

/** Runtime guard for values coming back from the (untyped) preferences API. */
export const isUiTheme = (value: unknown): value is UiTheme =>
  typeof value === "string" && (UI_THEMES as readonly string[]).includes(value);
