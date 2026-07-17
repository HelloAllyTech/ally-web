import { Toaster } from "sonner";

import { AllyThemeProvider } from "@ally-ui-mono/ui-shared";
import { LogViewer } from "@components/log-viewer";
import { RouteLayout } from "@routes/RouteLayout";

export function App() {
  const toastOptions = {
    style: {
      transform: "translateZ(0)",
      willChange: "transform",
    },
  };
  return (
    // Single centralised Carbon "White" design-system boundary (serif), shared
    // by every app via @ally-ui-mono/ui-shared.
    <AllyThemeProvider>
      <RouteLayout />
      {import.meta.env.VITE_SHOW_LOG_TERMINAL === "true" && <LogViewer />}
      <Toaster
        position="bottom-right"
        richColors
        toastOptions={toastOptions}
        style={toastOptions.style}
      />
    </AllyThemeProvider>
  );
}

export default App;
