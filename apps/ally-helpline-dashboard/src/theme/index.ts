import { createTheme, alpha, type Theme, type PaletteOptions } from "@mui/material/styles";

import { DEFAULT_UI_THEME, THEME_TOKENS, UiTheme } from "./themes";

/**
 * Per-theme MUI palette. MUI is only used for a handful of surfaces here
 * (Dialogs, Tooltips, date pickers, toasts), so a minimal palette — mode +
 * primary + background — is enough to keep those surfaces coherent with the
 * Tailwind theme. Values come from the shared THEME_TOKENS map so the JS (MUI)
 * and CSS-variable (Tailwind) sides stay in sync.
 */
const buildPalette = (uiTheme: UiTheme): PaletteOptions => {
  const tokens = THEME_TOKENS[uiTheme] ?? THEME_TOKENS[DEFAULT_UI_THEME];
  return {
    mode: tokens.mode,
    primary: { main: tokens.primary },
    background: { default: tokens.background.default, paper: tokens.background.paper },
  };
};

/** Build a MUI theme for the given theme id. */
export const buildTheme = (uiTheme: UiTheme): Theme & { alpha: typeof alpha } => {
  const tokens = THEME_TOKENS[uiTheme] ?? THEME_TOKENS[DEFAULT_UI_THEME];

  const baseTheme = createTheme({
    typography: {
      // Match the active theme's body font family.
      fontFamily: tokens.fontFamily,
    },
    shape: {
      borderRadius: tokens.radius,
    },
    palette: buildPalette(uiTheme),
  });

  // Add alpha function to theme for MUI X Date Pickers compatibility
  return {
    ...baseTheme,
    alpha,
  };
};

// Static default export kept for any non-theme-aware imports.
export const theme = buildTheme(DEFAULT_UI_THEME);
