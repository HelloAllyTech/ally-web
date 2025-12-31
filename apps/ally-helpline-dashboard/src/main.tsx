import { StyledEngineProvider } from "@mui/material/styles";
import { LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import { PersistGate } from "redux-persist/integration/react";

import "./index.css";
import App from "./App.tsx";
import { store, persistor } from "./store";

createRoot(document.getElementById("root")!).render(
  <StyledEngineProvider injectFirst>
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <LocalizationProvider dateAdapter={AdapterDayjs}>
          <GoogleOAuthProvider clientId="418445548587-tc8jcusrsglolrurqbvbgji30avmvgph.apps.googleusercontent.com">
            <App />
          </GoogleOAuthProvider>
        </LocalizationProvider>
      </PersistGate>
    </Provider>
  </StyledEngineProvider>,
);
