import { useEffect, useMemo } from "react";

import { ThemeProvider } from "@mui/material/styles";
import { useSelector } from "react-redux";
import { Toaster } from "sonner";

import RouteLayout from "@routes/RouteLayout";
import { RootState } from "@store";

import { buildTheme } from "./theme";

const App = () => {
  const uiTheme = useSelector((state: RootState) => state.user.uiTheme);
  const muiTheme = useMemo(() => buildTheme(uiTheme), [uiTheme]);

  // Keep the root data-theme attribute (which drives the Tailwind CSS variables)
  // in sync with the selected theme after login / theme changes. The initial
  // value is set pre-hydration by the inline script in index.html.
  useEffect(() => {
    document.documentElement.dataset.theme = uiTheme;
  }, [uiTheme]);

  return (
    <ThemeProvider theme={muiTheme}>
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
      <RouteLayout />
    </ThemeProvider>
  );
};

export default App;
