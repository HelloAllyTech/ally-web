import { ThemeProvider } from "@mui/material/styles";

import RouteLayout from "@/routes/RouteLayout";

import { theme } from "./theme";

const App = () => (
  <ThemeProvider theme={theme}>
    <RouteLayout />
  </ThemeProvider>
);

export default App;
