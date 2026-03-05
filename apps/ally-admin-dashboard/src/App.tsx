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
    <>
      <RouteLayout />
      {import.meta.env.VITE_SHOW_LOG_TERMINAL === "true" && <LogViewer />}
      <Toaster
        position="bottom-right"
        richColors
        toastOptions={toastOptions}
        style={toastOptions.style}
      />
    </>
  );
}

export default App;
