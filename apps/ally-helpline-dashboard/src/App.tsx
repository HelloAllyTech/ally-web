import RouteLayout from "@/routes/RouteLayout";
import { Toaster, Sonner, TooltipProvider } from "@/components";

const App = () => (
  <TooltipProvider>
    <Toaster />
    <Sonner />
    <RouteLayout />
  </TooltipProvider>
);

export default App;
