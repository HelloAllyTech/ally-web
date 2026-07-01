/**
 * UI theme contract — single source of truth shared by the Tailwind CSS
 * variables (see index.css), the MUI theme factory (see theme/index.ts) and
 * the theme picker UI (ProfileSettings).
 *
 * Each theme id maps to a `[data-theme="<id>"]` block in index.css that
 * overrides the `--color-*` CSS variables consumed by the Tailwind palette.
 *
 * Only LIGHT themes are offered. The app's surfaces overwhelmingly hardcode
 * `bg-white` (~100 sites) while text uses the theme-aware `text-typography-*`
 * tokens, so a dark background palette renders white-on-white. Dark themes
 * (Midnight, Ocean) were removed until those surfaces are migrated to semantic
 * tokens (`bg-background`, `border-border`).
 */
export const UI_THEMES = ["daylight", "forest", "sunset"] as const;

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
  forest: {
    labelKey: "profile.settings.appearance.forest",
    swatch: ["#F4F8F0", "#2E7D4F", "#1B3A2B"],
  },
  sunset: {
    labelKey: "profile.settings.appearance.sunset",
    swatch: ["#FFF6F0", "#E4572E", "#7A2E1E"],
  },
};

/** Runtime guard for values coming back from the (untyped) preferences API. */
export const isUiTheme = (value: unknown): value is UiTheme =>
  typeof value === "string" && (UI_THEMES as readonly string[]).includes(value);
