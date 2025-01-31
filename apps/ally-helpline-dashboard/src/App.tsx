import React, { RecoilRoot } from "recoil";

import RouteLayout from "@/routes/RouteLayout";
import { Toaster, Sonner, TooltipProvider } from "@/components";

const App = () => (
  <RecoilRoot>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <RouteLayout />
    </TooltipProvider>
  </RecoilRoot>
);

export default App;
