import { Toaster } from "sonner";

import { ScenarioReportsSocketProvider } from "@components/scenario-reports-socket-provider/ScenarioReportsSocketProvider";
import { RouteLayout } from "@routes/RouteLayout";

export function App() {
  const toastOptions = {
    style: {
      transform: "translateZ(0)",
      willChange: "transform",
    },
  };
  return (
    <ScenarioReportsSocketProvider>
      <RouteLayout />
      <Toaster
        position="bottom-right"
        richColors
        toastOptions={toastOptions}
        style={toastOptions.style}
      />
    </ScenarioReportsSocketProvider>
  );
}

export default App;
