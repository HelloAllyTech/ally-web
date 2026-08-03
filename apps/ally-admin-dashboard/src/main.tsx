import { StrictMode } from "react";

import { GoogleOAuthProvider } from "@react-oauth/google";
import * as ReactDOM from "react-dom/client";
import { Provider } from "react-redux";

import App from "./App";
import { store } from "./store";
import { adoptConsumerSession } from "./utils/consumerSession";
// Tailwind + global serif base rules first, then the Carbon design-language
// layer (tokens + component styles) so it cascades on top of Tailwind's reset.
import "./styles.css";
import "@ally-ui-mono/ui-shared/styles/carbon-serif.scss";

// Before the first render: when path-mounted on the consumer origin, carry an
// existing consumer session across so arriving from the app does not mean
// signing in twice. Must run ahead of React — PrivateLayout reads the auth flag
// synchronously on mount. No-op on the standalone dashboard.
adoptConsumerSession();

const root = ReactDOM.createRoot(document.getElementById("root") as HTMLElement);

const GOOGLE_AUTH_CLIENT_ID = import.meta.env.VITE_GOOGLE_AUTH_CLIENT_ID || "";

const AppWithProviders = GOOGLE_AUTH_CLIENT_ID ? (
  <GoogleOAuthProvider clientId={GOOGLE_AUTH_CLIENT_ID}>
    <App />
  </GoogleOAuthProvider>
) : (
  <App />
);

root.render(
  <StrictMode>
    <Provider store={store}>{AppWithProviders}</Provider>
  </StrictMode>,
);
