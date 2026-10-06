import { FC, ReactElement } from "react";

import { Info } from "lucide-react";

import { Tooltip } from "@ally-ui-mono/ui-shared";

type Align = "top" | "bottom" | "left" | "right";

/** An ⓘ that explains a non-obvious control, per the app's tooltip convention. */
export const HelpTip: FC<{ label: string; ariaLabel: string; align?: Align }> = ({
  label,
  ariaLabel,
  align = "bottom",
}) => (
  <Tooltip label={label} align={align}>
    <button
      type="button"
      aria-label={ariaLabel}
      className="inline-flex h-6 w-6 items-center justify-center rounded-full text-typography-700 hover:text-typography-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
    >
      <Info aria-hidden="true" className="h-4 w-4" />
    </button>
  </Tooltip>
);

/**
 * Explains a control (e.g. why it's disabled) without renaming it: Carbon's
 * `label` would make the tooltip text the button's accessible name, so this
 * uses `description`, which becomes its aria-describedby instead.
 */
export const WithTooltip: FC<{ label: string | null; children: ReactElement; align?: Align }> = ({
  label,
  children,
  align = "top",
}) =>
  label ? (
    <Tooltip description={label} align={align}>
      {children}
    </Tooltip>
  ) : (
    <>{children}</>
  );
