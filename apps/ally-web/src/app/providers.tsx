"use client";

import type { ReactNode } from "react";

import { AllyThemeProvider } from "@ally-ui-mono/ui-shared";

/**
 * Client boundary for the app-wide providers. Carbon's theme context
 * (via AllyThemeProvider) is a client component, so it cannot render directly
 * in the server-rendered root layout — this thin wrapper supplies the
 * `"use client"` boundary the App Router needs.
 */
export function Providers({ children }: { children: ReactNode }) {
  return <AllyThemeProvider>{children}</AllyThemeProvider>;
}

export default Providers;
