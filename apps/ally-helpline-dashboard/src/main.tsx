import { Provider } from "react-redux";
import { createRoot } from "react-dom/client";
import { StyledEngineProvider } from "@mui/material/styles";

import "./index.css";
import App from "./App.tsx";
import { store } from "./store";

createRoot(document.getElementById("root")!).render(
  <StyledEngineProvider injectFirst>
    <Provider store={store}>
      <App />
    </Provider>
  </StyledEngineProvider>,
);
