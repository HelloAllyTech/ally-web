import { FC, ReactNode, useState } from "react";

import { Play } from "@carbon/icons-react";

/**
 * Minimal expandable section with a header-actions slot.
 *
 * The shared helpline `Accordion` (@components) is a MUI wrapper that only
 * exposes title/children, so it can't host the per-section toggle the summary
 * sections UI needs. This local, dependency-light version mirrors the admin
 * screen's accordion behaviour without a cross-app import.
 */
interface OrgSettingsAccordionProps {
  title: string;
  headerActions?: ReactNode;
  defaultExpanded?: boolean;
  children: ReactNode;
}

export const OrgSettingsAccordion: FC<OrgSettingsAccordionProps> = ({
  title,
  headerActions,
  defaultExpanded = false,
  children,
}) => {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <div className="border border-border-light rounded">
      <div className="flex flex-row justify-between items-center p-4">
        <button
          type="button"
          onClick={() => setExpanded(prev => !prev)}
          className="flex items-center gap-2 text-left"
          aria-expanded={expanded}
        >
          <Play
            className={`text-typography-900 transition-transform ${expanded ? "rotate-90" : ""}`}
            aria-label="expand icon"
          />
          <span className="text-base font-medium text-typography-900">{title}</span>
        </button>
        {headerActions && (
          <div className="flex flex-row gap-[18px] items-center">{headerActions}</div>
        )}
      </div>
      {expanded && <div className="border-t border-border-light">{children}</div>}
    </div>
  );
};

export default OrgSettingsAccordion;
