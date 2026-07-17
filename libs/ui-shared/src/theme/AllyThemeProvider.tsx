"use client";

import type { ReactNode } from "react";

import { GlobalTheme } from "@carbon/react";

export interface AllyThemeProviderProps {
  children: ReactNode;
}

/**
 * The single design-system theme boundary for every app in the monorepo.
 *
 * Renders Carbon's `<GlobalTheme theme="white">` so all `@carbon/react`
 * components (used through `@ally-ui-mono/ui-shared`) resolve the `--cds-*`
 * design tokens to the light "White" surface. The `"use client"` directive lets
 * this be dropped straight into the Next.js App Router server tree in ally-web
 * (Carbon's GlobalTheme is a context component); it is harmless in the Vite apps.
 *
 * There is intentionally ONE locked theme — the previous per-app theme switcher
 * has been removed in favour of a single Carbon serif design language.
 */
export function AllyThemeProvider({ children }: AllyThemeProviderProps) {
  return <GlobalTheme theme="white">{children}</GlobalTheme>;
}

export default AllyThemeProvider;
