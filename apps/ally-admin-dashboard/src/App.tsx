import { Toaster } from "sonner";

import { RouteLayout } from "@routes/RouteLayout";

export function App() {
  return (
    <>
      <RouteLayout />
      <Toaster position="bottom-right" richColors />
    </>
  );
}

export default App;
