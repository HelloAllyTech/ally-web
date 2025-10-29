import { Toaster } from "sonner";

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
      {/* 
        Toaster configuration with hardware acceleration fixes for M1 Mac rendering issues.
        The transform: translateZ(0) forces GPU acceleration and fixes toast stacking problems.
        Additional CSS fixes are in styles.css for [data-sonner-toaster] and [data-sonner-toast].
      */}
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
