import { createTheme, alpha, type Theme } from "@mui/material/styles";

const baseTheme = createTheme({
  typography: {
    // TODO: Update after review - can remove if not in use
    // fontFamily: ["IBM Plex Serif", "serif"].join(","),
    // // Configure specific variants if needed
    // h1: {
    //   fontFamily: "IBM Plex Serif, serif",
    // },
    // h2: {
    //   fontFamily: "IBM Plex Serif, serif",
    // },
    // body1: {
    //   fontFamily: "IBM Plex Serif, serif",
    // },
    // body2: {
    //   fontFamily: "IBM Plex Serif, serif",
    // },
    // button: {
    //   fontFamily: "IBM Plex Serif, serif",
    // },
  },
});

// Add alpha function to theme for MUI X Date Pickers compatibility
export const theme: Theme & { alpha: typeof alpha } = {
  ...baseTheme,
  alpha,
};
