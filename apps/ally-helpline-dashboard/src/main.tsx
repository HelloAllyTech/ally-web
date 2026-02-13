// File: apps/ally-helpline-dashboard/src/main.tsx
import { StyledEngineProvider } from "@mui/material/styles";
import { LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import { PersistGate } from "redux-persist/integration/react";
import { Suspense } from "react";
import { I18nextProvider } from "react-i18next";

import "./index.css";
import App from "./App.tsx";
import { store, persistor } from "./store";
import i18n from "./i18n";

const GOOGLE_AUTH_CLIENT_ID = import.meta.env.VITE_GOOGLE_AUTH_CLIENT_ID || "";

createRoot(document.getElementById("root")!).render(
  <StyledEngineProvider injectFirst>
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <LocalizationProvider dateAdapter={AdapterDayjs}>
          <GoogleOAuthProvider clientId={GOOGLE_AUTH_CLIENT_ID}>
            <I18nextProvider i18n={i18n}>
              <Suspense fallback={null}>
                <App />
              </Suspense>
            </I18nextProvider>
          </GoogleOAuthProvider>
        </LocalizationProvider>
      </PersistGate>
    </Provider>
  </StyledEngineProvider>,
);
