import { createTheme } from "@mui/material/styles";

export const theme = createTheme({
  typography: {
    fontFamily: ["IBM Plex Serif", "serif"].join(","),
    // Configure specific variants if needed
    h1: {
      fontFamily: "IBM Plex Serif, serif",
    },
    h2: {
      fontFamily: "IBM Plex Serif, serif",
    },
    body1: {
      fontFamily: "IBM Plex Serif, serif",
    },
    body2: {
      fontFamily: "IBM Plex Serif, serif",
    },
    button: {
      fontFamily: "IBM Plex Serif, serif",
    },
  },
}); 