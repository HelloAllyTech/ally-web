import { ThemeProvider } from "@mui/material/styles";
import { Toaster } from "sonner";

import RouteLayout from "@routes/RouteLayout";

import { theme } from "./theme";

const App = () => (
  <ThemeProvider theme={theme}>
    <Toaster
      position="bottom-right"
      closeButton
      // TODO: Refactor Toast styles after design is finalized
      toastOptions={{
        classNames: {
          content: "mr-3",
          icon: "hidden",
          warning: "bg-[#FDF8E4] border-[0.5px] border-[#EC930F] text-[#0D0D0D]",
          closeButton: "absolute top-[50%] left-[93%] !bg-transparent border-none",
        },
      }}
    />
    <RouteLayout />
  </ThemeProvider>
);

export default App;
