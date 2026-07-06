import { Toaster } from "sonner";

import { AllyThemeProvider } from "@ally-ui-mono/ui-shared";
import RouteLayout from "@routes/RouteLayout";

const App = () => {
  return (
    // Single centralised Carbon "White" design-system boundary (serif), shared
    // by every app via @ally-ui-mono/ui-shared. The previous per-user theme
    // switcher (current/claude/carbon) has been removed in favour of one theme.
    <AllyThemeProvider>
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
    </AllyThemeProvider>
  );
};

export default App;
