import { createTheme, alpha, type Theme, type PaletteOptions } from "@mui/material/styles";

import { DEFAULT_UI_THEME, UiTheme } from "./themes";

/**
 * Per-theme MUI palette. MUI is only used for a handful of surfaces here
 * (Dialogs, Tooltips, date pickers), so a minimal palette — mode + primary +
 * background — is enough to keep those surfaces coherent with the Tailwind
 * theme. Everything else falls back to MUI defaults.
 */
const buildPalette = (uiTheme: UiTheme): PaletteOptions => {
  switch (uiTheme) {
    case "forest":
      return {
        mode: "light",
        primary: { main: "#2E7D4F" },
        background: { default: "#F4F8F0", paper: "#FFFFFF" },
      };
    case "sunset":
      return {
        mode: "light",
        primary: { main: "#E4572E" },
        background: { default: "#FFF6F0", paper: "#FFFFFF" },
      };
    case "daylight":
    default:
      return {
        mode: "light",
        primary: { main: "#0957D0" },
      };
  }
};

/** Build a MUI theme for the given UI theme id. */
export const buildTheme = (uiTheme: UiTheme): Theme & { alpha: typeof alpha } => {
  const baseTheme = createTheme({
    typography: {
      // Override MUI's default sans-serif (Roboto,Helvetica,Arial) with the brand serif
      fontFamily: ["IBM Plex Serif", "serif"].join(","),
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
