import { StrictMode } from "react";

import { ThemeProvider, createTheme } from "@mui/material/styles";
import { GoogleOAuthProvider } from "@react-oauth/google";
import * as ReactDOM from "react-dom/client";
import { Provider } from "react-redux";

import App from "./App";
import { store } from "./store";
// Tailwind + global serif base rules first, then the Carbon design-language
// layer (tokens + component styles) so it cascades on top of Tailwind's reset.
import "./styles.css";
import "./carbon-global.scss";

const root = ReactDOM.createRoot(document.getElementById("root") as HTMLElement);

const GOOGLE_AUTH_CLIENT_ID = import.meta.env.VITE_GOOGLE_AUTH_CLIENT_ID || "";

// MUI components (~20 files) have no central theme. Align them to the Carbon
// design language in one place: IBM Plex Serif typography, Carbon interactive
// colors, and square corners. No CssBaseline — Tailwind preflight owns the reset.
const muiTheme = createTheme({
  typography: { fontFamily: '"IBM Plex Serif", serif' },
  palette: {
    primary: { main: "#0f62fe" },
    error: { main: "#da1e28" },
    success: { main: "#24a148" },
    warning: { main: "#ff832b" },
  },
  shape: { borderRadius: 0 },
});

const AppWithProviders = GOOGLE_AUTH_CLIENT_ID ? (
  <GoogleOAuthProvider clientId={GOOGLE_AUTH_CLIENT_ID}>
    <App />
  </GoogleOAuthProvider>
) : (
  <App />
);

root.render(
  <StrictMode>
    <Provider store={store}>
      <ThemeProvider theme={muiTheme}>{AppWithProviders}</ThemeProvider>
    </Provider>
  </StrictMode>,
);
