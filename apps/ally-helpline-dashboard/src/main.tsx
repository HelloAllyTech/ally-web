import { Suspense } from "react";

import { GoogleOAuthProvider } from "@react-oauth/google";
import { createRoot } from "react-dom/client";
import { I18nextProvider } from "react-i18next";
import { Provider } from "react-redux";
import { PersistGate } from "redux-persist/integration/react";

import "./index.css";
// Centralised IBM Carbon serif design system (single source for all apps).
import "@ally-ui-mono/ui-shared/styles/carbon-serif.scss";
// MUST stay after carbon-serif.scss: Carbon declares its --cds-* tokens on the
// theme-zone classes this file also targets, so the retint wins on source order
// at equal specificity. Consumer app only — the admin console has its own entry
// point and never loads it, which is what keeps it on Carbon's own palette.
import "./carbon-claude.css";
import { initAnalytics } from "@utils/analytics";

import { AnalyticsProvider } from "./analytics";
import App from "./App.tsx";
import i18n from "./i18n";
import { store, persistor } from "./store";

const GOOGLE_AUTH_CLIENT_ID = import.meta.env.VITE_GOOGLE_AUTH_CLIENT_ID || "";

// Initialise PostHog once before the React tree mounts
initAnalytics();

createRoot(document.getElementById("root")!).render(
  <Provider store={store}>
    <PersistGate loading={null} persistor={persistor}>
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
    </PersistGate>
  </Provider>,
);
