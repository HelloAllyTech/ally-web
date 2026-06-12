import { ThemeProvider } from "@mui/material/styles";
import { Toaster } from "sonner";

import { ErrorBoundary } from "@ally-ui-mono/ui-shared";
import RouteLayout from "@routes/RouteLayout";

import { theme } from "./theme";

const App = () => (
  <ThemeProvider theme={theme}>
    <Toaster
      position="bottom-right"
      closeButton
      toastOptions={{
        classNames: {
          content: "mr-3",
          icon: "hidden",
          warning: "bg-[#FDF8E4] border-[0.5px] border-warning-500 text-typography-900",
          closeButton: "absolute top-[50%] left-[93%] !bg-transparent border-none",
        },
      }}
    />
    <ErrorBoundary>
      <RouteLayout />
    </ErrorBoundary>
  </ThemeProvider>
);

export default App;
