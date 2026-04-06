import { Suspense } from "react";

import { StyledEngineProvider } from "@mui/material/styles";
import { LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { createRoot } from "react-dom/client";
import { I18nextProvider } from "react-i18next";
import { Provider } from "react-redux";
import { PersistGate } from "redux-persist/integration/react";

import "./index.css";
import { initAnalytics } from "@utils/analytics";

import { AnalyticsProvider } from "./analytics";
import App from "./App.tsx";
import i18n from "./i18n";
import { store, persistor } from "./store";

const GOOGLE_AUTH_CLIENT_ID = import.meta.env.VITE_GOOGLE_AUTH_CLIENT_ID || "";

// Initialise PostHog once before the React tree mounts
initAnalytics();

createRoot(document.getElementById("root")!).render(
  <StyledEngineProvider injectFirst>
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <LocalizationProvider dateAdapter={AdapterDayjs}>
          <GoogleOAuthProvider clientId={GOOGLE_AUTH_CLIENT_ID}>
            <I18nextProvider i18n={i18n}>
              {/* AnalyticsProvider must be inside <Provider> to read Redux auth state */}
              <AnalyticsProvider>
                <Suspense fallback={null}>
                  <App />
                </Suspense>
              </AnalyticsProvider>
            </I18nextProvider>
          </GoogleOAuthProvider>
        </LocalizationProvider>
      </PersistGate>
    </Provider>
  </StyledEngineProvider>,
);
