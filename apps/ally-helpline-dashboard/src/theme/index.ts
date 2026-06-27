import { createTheme, alpha, type Theme } from "@mui/material/styles";

const baseTheme = createTheme({
  typography: {
    // Override MUI's default sans-serif (Roboto,Helvetica,Arial) with the brand serif
    fontFamily: ["IBM Plex Serif", "serif"].join(","),
  },
});

// Add alpha function to theme for MUI X Date Pickers compatibility
export const theme: Theme & { alpha: typeof alpha } = {
  ...baseTheme,
  alpha,
};
