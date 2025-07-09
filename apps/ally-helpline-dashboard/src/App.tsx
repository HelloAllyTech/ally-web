import { ThemeProvider } from "@mui/material/styles";
import { Toaster } from "sonner";

import RouteLayout from "@/routes/RouteLayout";

import { theme } from "./theme";

const App = () => (
  <ThemeProvider theme={theme}>
    <Toaster position="bottom-right" />
    <RouteLayout />
  </ThemeProvider>
);

export default App;
