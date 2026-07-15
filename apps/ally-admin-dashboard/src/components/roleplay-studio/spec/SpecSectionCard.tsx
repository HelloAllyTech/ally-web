import React from "react";

import { Accordion, AccordionItem } from "@ally-ui-mono/ui-shared";

import { SpecPatchFlash } from "./SpecPatchFlash";

interface SpecSectionCardProps {
  title: string;
  /** Top-level spec keys that trigger this card's patch flash. */
  sections: string[];
  headerActions?: React.ReactNode;
  defaultExpanded?: boolean;
  children: React.ReactNode;
}

/**
 * Stacked spec section: a Carbon Accordion item wrapped in the patch-flash
 * halo. The whole studio is on Carbon, so the collapsible chrome comes from
 * Carbon's Accordion rather than a bespoke bordered card.
 */
export const SpecSectionCard: React.FC<SpecSectionCardProps> = ({
  title,
  sections,
  headerActions,
  defaultExpanded = true,
  children,
}) => (
  <SpecPatchFlash sections={sections}>
    <Accordion>
      <AccordionItem
        open={defaultExpanded}
        title={
          headerActions ? (
            <span className="flex w-full items-center justify-between gap-2 pr-2">
              <span>{title}</span>
              {headerActions}
            </span>
          ) : (
            title
          )
        }
      >
        <div className="pt-1">{children}</div>
      </AccordionItem>
    </Accordion>
  </SpecPatchFlash>
);
