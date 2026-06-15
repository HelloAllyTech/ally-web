import { GlobalTheme } from "@carbon/react";
import { Toaster } from "sonner";

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
    // Carbon "White" theme app-wide: resolves the `--cds-*` design tokens used
    // by every Carbon component to the light surface.
    <GlobalTheme theme="white">
      <RouteLayout />
      {import.meta.env.VITE_SHOW_LOG_TERMINAL === "true" && <LogViewer />}
      <Toaster
        position="bottom-right"
        richColors
        toastOptions={toastOptions}
        style={toastOptions.style}
      />
    </GlobalTheme>
  );
}

export default App;
