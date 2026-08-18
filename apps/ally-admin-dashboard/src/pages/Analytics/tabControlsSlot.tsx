import { ReactNode, createContext, useContext } from "react";

import { createPortal } from "react-dom";

/**
 * A slot in the page-level filter row that a tab can render its own controls
 * into.
 *
 * Why this exists: filters belong in ONE row above the content they scope, so
 * every number on the page is read against the same slice. The page owns
 * language and time range (shared by all tabs), but a tab may have slice
 * dimensions of its own — Weak performing metrics adds model, scenario and
 * granularity. Rendering those inside the tab panel put half the filter bar
 * above the tab strip and half below it, which reads as two unrelated controls
 * groups and invites the reader to think one set scopes less than it does.
 *
 * A portal rather than lifted state: the control's state stays in the tab that
 * understands it, while its markup lands in the shared row. Lifting it would
 * make the Analytics page carry per-tab filter state it has no use for.
 *
 * Inert for every tab that does not use it — the slot simply renders empty.
 */
const TabControlsSlotContext = createContext<HTMLElement | null>(null);

export const TabControlsSlotProvider = TabControlsSlotContext.Provider;

/**
 * Render `children` into the page-level filter row.
 *
 * Falls back to rendering in place when the slot is not mounted (a tab rendered
 * outside the Analytics page, or the first paint before the ref attaches), so a
 * control is never silently dropped.
 */
export const TabControls = ({ children }: { children: ReactNode }) => {
  const slot = useContext(TabControlsSlotContext);
  if (!slot) return <>{children}</>;
  return createPortal(children, slot);
};
