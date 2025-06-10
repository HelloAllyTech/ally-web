import { ThemeProvider } from "@mui/material/styles";

import RouteLayout from "@/routes/RouteLayout";
import { Toaster, Sonner, TooltipProvider } from "@/components";

import { theme } from "./theme";

const App = () => (
  <ThemeProvider theme={theme}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <RouteLayout />
    </TooltipProvider>
  </ThemeProvider>
);

export default App;
